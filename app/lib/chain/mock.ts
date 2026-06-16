/**
 * Mock chain adapter: canned balances, fake tx hashes, instant success,
 * and a fully simulated shielded pool (MockProver). Lets the entire UX
 * (public payments + private payments) be demoed without funding, trustlines,
 * deployed contracts, or real cryptography.
 *
 * State persists in localStorage keyed by the user's address so a demo feels
 * real across reloads.
 */
import type { AssetCode } from './config';
import { getExplorerUrl } from './config';
import type { ChainOps, PrivacyOps, PrivacyOpResult, PrivateNote, TxResult, WalletContext } from './types';

const LS = {
  publicBal: (addr: string, asset: string) => `zoopfi.mock.bal.${addr}.${asset}`,
  privEnabled: (addr: string) => `zoopfi.mock.priv.enabled.${addr}`,
  notes: (addr: string) => `zoopfi.mock.notes.${addr}`,
};

const read = (k: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(k, v); } catch { /* ignore */ }
};

const fakeHash = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0').repeat(8).slice(0, 64);
};

const num = (s: string | null, fallback: number) => {
  const n = Number(s);
  return s != null && !Number.isNaN(n) ? n : fallback;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockChainOps(ctx: WalletContext): ChainOps {
  const addr = ctx.address;

  // Seed a starting public balance the first time we see this address.
  const ensureSeed = (asset: AssetCode) => {
    const k = LS.publicBal(addr, asset);
    if (read(k) == null) write(k, asset === 'USDC' ? '250.00' : '1000.0000000');
  };

  const getNotes = (): PrivateNote[] => {
    try { return JSON.parse(read(LS.notes(addr)) || '[]'); } catch { return []; }
  };
  const setNotes = (notes: PrivateNote[]) => write(LS.notes(addr), JSON.stringify(notes));

  const adjustPublic = (asset: AssetCode, delta: number) => {
    ensureSeed(asset);
    const k = LS.publicBal(addr, asset);
    const next = Math.max(0, num(read(k), 0) + delta);
    write(k, asset === 'USDC' ? next.toFixed(2) : next.toFixed(7));
  };

  const privacy: PrivacyOps = {
    async isEnabled() {
      return read(LS.privEnabled(addr)) === '1';
    },
    async enable() {
      await delay(400);
      write(LS.privEnabled(addr), '1');
    },
    async getPrivateBalance(asset: AssetCode = 'USDC') {
      const total = getNotes()
        .filter((n) => !n.spent && n.asset === asset)
        .reduce((s, n) => s + Number(n.amount), 0);
      return asset === 'USDC' ? total.toFixed(2) : total.toFixed(7);
    },
    async shield(amount: string, asset: AssetCode = 'USDC'): Promise<PrivacyOpResult> {
      const t0 = 1200; await delay(t0);
      adjustPublic(asset, -Number(amount));
      const notes = getNotes();
      notes.push({ id: fakeHash(`shield${amount}${notes.length}`), amount, asset, createdAt: Date.now(), spent: false, direction: 'shield' });
      setNotes(notes);
      const hash = fakeHash(`shieldtx${amount}${notes.length}`);
      return { kind: 'shield', success: true, hash, explorerUrl: getExplorerUrl(hash), provingMs: t0 };
    },
    async transfer(to: string, amount: string, asset: AssetCode = 'USDC', note?: string): Promise<PrivacyOpResult> {
      const t0 = 1600; await delay(t0);
      const notes = getNotes();
      // spend from unspent notes (simulate), create an outgoing record
      let remaining = Number(amount);
      for (const n of notes) {
        if (n.spent || n.asset !== asset || remaining <= 0) continue;
        n.spent = true; remaining -= Number(n.amount);
      }
      // change note if overpaid
      if (remaining < 0) {
        notes.push({ id: fakeHash(`change${amount}${notes.length}`), amount: (-remaining).toFixed(asset === 'USDC' ? 2 : 7), asset, createdAt: Date.now(), spent: false, direction: 'in', note: 'change' });
      }
      notes.push({ id: fakeHash(`xfer${to}${amount}${notes.length}`), amount, asset, createdAt: Date.now(), spent: true, direction: 'out', counterparty: to, note });
      setNotes(notes);
      const hash = fakeHash(`xfertx${to}${amount}${notes.length}`);
      return { kind: 'transfer', success: true, hash, explorerUrl: getExplorerUrl(hash), provingMs: t0 };
    },
    async unshield(amount: string, _toAddress?: string, asset: AssetCode = 'USDC'): Promise<PrivacyOpResult> {
      const t0 = 1400; await delay(t0);
      const notes = getNotes();
      let remaining = Number(amount);
      for (const n of notes) {
        if (n.spent || n.asset !== asset || remaining <= 0) continue;
        n.spent = true; remaining -= Number(n.amount);
      }
      if (remaining < 0) {
        notes.push({ id: fakeHash(`uchange${amount}${notes.length}`), amount: (-remaining).toFixed(asset === 'USDC' ? 2 : 7), asset, createdAt: Date.now(), spent: false, direction: 'in', note: 'change' });
      }
      setNotes(notes);
      adjustPublic(asset, Number(amount));
      const hash = fakeHash(`unshieldtx${amount}${notes.length}`);
      return { kind: 'unshield', success: true, hash, explorerUrl: getExplorerUrl(hash), provingMs: t0 };
    },
    async listNotes() {
      return getNotes().sort((a, b) => b.createdAt - a.createdAt);
    },
  };

  return {
    async getBalance(_address: string, asset: AssetCode = 'USDC') {
      ensureSeed(asset);
      return read(LS.publicBal(addr, asset)) || '0';
    },
    async sendPayment(to: string, amount: string, asset: AssetCode = 'USDC'): Promise<TxResult> {
      await delay(900);
      adjustPublic(asset, -Number(amount));
      const hash = fakeHash(`pay${to}${amount}${Date.now()}`);
      return { success: true, hash, explorerUrl: getExplorerUrl(hash) };
    },
    async hasTrustline() { return true; },
    async addTrustline(): Promise<TxResult> {
      await delay(500);
      const hash = fakeHash(`trust${addr}`);
      return { success: true, hash, explorerUrl: getExplorerUrl(hash) };
    },
    async invokeContract(_id: string, method: string): Promise<TxResult> {
      await delay(700);
      const hash = fakeHash(`invoke${method}${Date.now()}`);
      return { success: true, hash, explorerUrl: getExplorerUrl(hash) };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async viewContract(_id: string, _method: string) {
      return 0;
    },
    getExplorerUrl,
    privacy,
  };
}
