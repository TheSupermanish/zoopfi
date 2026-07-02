'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React hook driving the Zoopfi shielded pool end to end:
 * connect wallet -> derive note keys -> shield (deposit) / send privately
 * (transfer) / unshield (withdraw), plus live private notes + pool activity.
 *
 * Proving + tx prep happen in the WASM engine; signing/submitting goes through
 * the StellarWalletsKit shim. All amounts are handled in stroops (7 decimals).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPrivacyEngine, type PrivacyEngine } from './engine';
import { connectWallet, getConnectedAddress, signWalletMessage, registerEmbeddedSigner, PrivacyWalletError } from './wallet';
import { createEmbeddedSigner } from './embedded-signer';
import { submitPreparedSorobanTx, type SubmitStatus } from './submit';
import { useWallet, NETWORK } from '../chain';
import {
  registerKeys, getRegistered, normUser, syntheticAddress, syntheticSig, type PubKeys,
} from './directory';
import { publishPoolKeys, resolvePoolKeys } from '../api';

/** Read the signed-in user's profile (username/displayName) from the local app DB. */
function readMyProfile(): { username?: string; display?: string } {
  try {
    const db = JSON.parse(localStorage.getItem('zoopfi.demo.db.v2') || '{}');
    return { username: db?.user?.username, display: db?.user?.displayName };
  } catch {
    return {};
  }
}

const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;

// The deployed pool is constructed with maximum_deposit_amount = 1_000_000_000
// stroops (100 XLM). A deposit above this reverts on-chain with the opaque
// Error(Contract, #6) WrongExtAmount, so we cap + message it client-side instead
// of burning a ~8s Groth16 proof just to fail at simulation.
export const MAX_DEPOSIT_XLM = 100;
const MAX_DEPOSIT_STROOPS = BigInt(MAX_DEPOSIT_XLM) * BigInt(UNIT);

export const xlmToStroops = (xlm: string | number): bigint =>
  BigInt(Math.round(Number(xlm) * UNIT));
export const stroopsToXlm = (stroops: bigint | string | number): string =>
  (Number(stroops) / UNIT).toFixed(DECIMALS).replace(/\.?0+$/, '');

export interface PrivateNote {
  id: string;
  amount: string; // stroops as string
  spent: boolean;
  [k: string]: any;
}
export interface PoolActivity {
  kind?: string;
  txHash?: string;
  ledger?: number;       // Stellar ledger the shielded tx landed in
  commitments?: number;  // new note commitments added to the merkle tree
  nullifiers?: number;   // notes spent (marked used) by this tx
  [k: string]: any;
}

export type PrivacyPhase = 'idle' | 'proving' | 'signing' | 'submitting' | 'confirming';

export interface PrivacyState {
  ready: boolean;          // engine loaded
  address: string;         // connected wallet
  keysReady: boolean;      // note keys derived
  busy: boolean;
  phase: PrivacyPhase;
  statusText: string;
  error: { message: string; code?: string } | null;
  privateBalance: string;  // stroops as string
  notes: PrivateNote[];
  activity: PoolActivity[];
}

const phaseFor = (s: SubmitStatus): PrivacyPhase =>
  s.stage === 'sign_auth' || s.stage === 'sign_tx'
    ? 'signing'
    : s.stage === 'submit'
      ? 'submitting'
      : 'confirming';

export function usePrivacyPool() {
  const main = useWallet();
  const engineRef = useRef<PrivacyEngine | null>(null);
  const [state, setState] = useState<PrivacyState>({
    ready: false, address: '', keysReady: false, busy: false, phase: 'idle',
    statusText: '', error: null, privateBalance: '0', notes: [], activity: [],
  });

  const patch = useCallback((p: Partial<PrivacyState>) => setState((s) => ({ ...s, ...p })), []);

  const fail = useCallback((e: unknown) => {
    const code = e instanceof PrivacyWalletError ? e.code : undefined;
    const message = (e as any)?.message || 'Something went wrong';
    patch({ busy: false, phase: 'idle', statusText: '', error: { message, code } });
  }, [patch]);

  // Load the WASM engine once on mount.
  useEffect(() => {
    let cancelled = false;
    loadPrivacyEngine()
      .then((eng) => { if (!cancelled) { engineRef.current = eng; patch({ ready: true }); } })
      .catch((e) => !cancelled && fail(e));
    return () => { cancelled = true; };
  }, [patch, fail]);

  // On a Privy embedded (social-login) wallet, sign the privacy flow with it via
  // raw-hash signing, so /shielded needs no separate StellarWalletsKit connect.
  // External-wallet users fall back to the kit (signer stays null).
  useEffect(() => {
    if (main.walletSource === 'privy' && main.address && main.signRawHash) {
      registerEmbeddedSigner(
        createEmbeddedSigner({
          address: main.address,
          networkPassphrase: NETWORK.networkPassphrase,
          rawSign: main.signRawHash,
        }),
      );
    } else {
      registerEmbeddedSigner(null);
    }
  }, [main.walletSource, main.address, main.signRawHash]);

  const refresh = useCallback(async () => {
    const eng = engineRef.current;
    const address = getConnectedAddress();
    if (!eng || !address) return;
    try {
      const [notes, activity] = await Promise.all([
        eng.webClient.getUserNotes(address, 100),
        eng.webClient.getRecentPoolActivity(50),
      ]);
      const noteList: PrivateNote[] = Array.isArray(notes) ? notes : [];
      const balance = noteList
        .filter((n) => !n.spent)
        .reduce((acc, n) => acc + BigInt(n.amount ?? 0), BigInt(0));
      patch({
        notes: noteList,
        activity: Array.isArray(activity) ? activity : [],
        privateBalance: balance.toString(),
      });
    } catch (e) {
      console.warn('[privacy] refresh failed', e);
    }
  }, [patch]);

  /** Connect a wallet (Freighter/xBull/…) and derive note keys. */
  const connect = useCallback(async () => {
    const eng = engineRef.current;
    if (!eng) return;
    patch({ busy: true, error: null, statusText: 'Connecting wallet…' });
    try {
      // Reuse an already-connected wallet (the main app shares this same kit for
      // external wallets) so the user isn't asked to connect a second time.
      const address = getConnectedAddress() || (await connectWallet());
      patch({ address, statusText: 'Deriving private keys…' });

      // Derive (or load) note + encryption keys from one wallet signature.
      const existing = await eng.webClient.getUserKeys(address).catch(() => null);
      if (!existing) {
        const msg = eng.webClient.keyDerivationMessage();
        const { signedMessage } = await signWalletMessage(msg, { address });
        const sigBytes = Uint8Array.from(atob(signedMessage), (c) => c.charCodeAt(0));
        await eng.webClient.deriveAndSaveUserKeys(address, sigBytes);
      }
      // Publish my public keys to the directory so others can pay me by @handle.
      // Local cache for this device + the shared server directory so a sender on
      // ANY device can resolve my real keys (the cross-device path that makes
      // pay-by-username actually deliverable).
      try {
        const { username, display } = readMyProfile();
        const mine = await eng.webClient.getUserKeys(address).catch(() => null);
        const notePub = mine?.noteKeypair?.public;
        const encPub = mine?.encryptionKeypair?.public;
        if (username && notePub && encPub) {
          registerKeys(username, { notePub, encPub }, display);
          void publishPoolKeys(address, notePub, encPub);
        }
      } catch { /* directory is best-effort */ }
      patch({ keysReady: true, busy: false, statusText: '' });
      void refresh();
    } catch (e) {
      fail(e);
    }
  }, [patch, fail, refresh]);

  // If a wallet is already connected app-wide (external wallet, shared with the
  // main app via the same kit), connect the private layer automatically — no
  // redundant "Connect wallet" step.
  useEffect(() => {
    if (state.ready && !state.address && getConnectedAddress()) void connect();
  }, [state.ready, state.address, connect]);

  const poolId = useCallback(async (): Promise<string> => {
    const cfg: any = await engineRef.current!.webClient.contractConfig();
    const pools = Array.isArray(cfg?.pools) ? cfg.pools : [];
    const sel = pools.find((p: any) => p?.enabled) || pools[0];
    if (!sel?.poolContractId) throw new Error('No pool configured');
    return sel.poolContractId;
  }, []);

  const submitFn = useCallback(
    () => (proved: any) => {
      const eng = engineRef.current!;
      return submitPreparedSorobanTx(
        proved.sorobanTx,
        { address: getConnectedAddress(), rpcUrl: eng.rpcUrl, networkPassphrase: eng.networkPassphrase },
        (s) => patch({ phase: phaseFor(s), statusText: s.message }),
      );
    },
    [patch],
  );

  const onStatus = useCallback(
    () => (p: any) => p?.message && patch({ statusText: p.message }),
    [patch],
  );

  const run = useCallback(
    async (label: string, fn: (pid: string, addr: string) => Promise<any>) => {
      const eng = engineRef.current;
      const address = getConnectedAddress();
      if (!eng || !address) return;
      patch({ busy: true, error: null, phase: 'proving', statusText: `${label}: proving…` });
      try {
        const pid = await poolId();
        const hashes = await fn(pid, address);
        patch({ busy: false, phase: 'idle', statusText: '' });
        await refresh();
        const arr = Array.isArray(hashes) ? hashes : [hashes];
        return arr[arr.length - 1] as string | undefined;
      } catch (e) {
        fail(e);
      }
    },
    [patch, fail, refresh, poolId],
  );

  /** Shield: move public XLM into your private balance. */
  const shield = useCallback(
    (xlm: string) => {
      const amount = xlmToStroops(xlm);
      if (amount > MAX_DEPOSIT_STROOPS) {
        fail(
          new PrivacyWalletError(
            `This pool accepts up to ${MAX_DEPOSIT_XLM} XLM per shield. Try a smaller amount.`,
            'WALLET_ERROR',
          ),
        );
        return Promise.resolve(undefined);
      }
      return run('Shield', (pid, addr) =>
        engineRef.current!.webClient.executeDeposit(pid, addr, amount, [amount, BigInt(0)], submitFn(), onStatus()),
      );
    },
    [run, fail, submitFn, onStatus],
  );

  /** Send privately: transfer to a recipient's note + encryption public keys. */
  const sendPrivate = useCallback(
    (xlm: string, recipientNoteKeyHex: string, recipientEncKeyHex: string) => {
      const amount = xlmToStroops(xlm);
      return run('Private send', (pid, addr) =>
        engineRef.current!.webClient.executeTransfer(
          pid, addr, amount, recipientNoteKeyHex, recipientEncKeyHex, submitFn(), onStatus(),
        ),
      );
    },
    [run, submitFn, onStatus],
  );

  /** Unshield: withdraw from your private balance to a public G… address. */
  const unshield = useCallback(
    (xlm: string, recipient?: string) => {
      const amount = xlmToStroops(xlm);
      return run('Unshield', (pid, addr) =>
        engineRef.current!.webClient.executeWithdraw(pid, addr, recipient || addr, amount, submitFn(), onStatus()),
      );
    },
    [run, submitFn, onStatus],
  );

  /** My note + encryption public keys, so others can send to me. */
  const myKeys = useCallback(async () => {
    const address = getConnectedAddress();
    if (!engineRef.current || !address) return null;
    return engineRef.current.webClient.getUserKeys(address).catch(() => null);
  }, []);

  /**
   * Resolve a @username to its pool public keys.
   *   1. Local cache (this device — instant, covers users seen here).
   *   2. Shared server directory — the real cross-device path: if @u is a Zoopfi
   *      user who has unlocked private payments, we get their real, claimable keys.
   *   3. If @u IS a Zoopfi user but hasn't enabled private payments, refuse — a
   *      transfer would go to keys they can't spend. Tell the sender to nudge them.
   *   4. Otherwise (unknown handle) derive a deterministic demo keypair so
   *      testnet demo recipients like @alice still work without a second device.
   */
  const resolveRecipient = useCallback(async (username: string): Promise<PubKeys> => {
    const u = normUser(username);
    if (!u) throw new PrivacyWalletError('Enter a recipient username.', 'WALLET_ERROR');

    const reg = getRegistered(u);
    if (reg) return { notePub: reg.notePub, encPub: reg.encPub };

    const { keys: remote, userExists } = await resolvePoolKeys(u);
    if (remote?.notePubKey && remote?.encryptionPubKey) {
      const keys: PubKeys = { notePub: remote.notePubKey, encPub: remote.encryptionPubKey };
      registerKeys(u, keys, remote.displayName);
      return keys;
    }
    if (userExists) {
      throw new PrivacyWalletError(
        `@${u} hasn't enabled private payments yet. Ask them to open the Private tab once, then try again.`,
        'WALLET_ERROR',
      );
    }

    // Deterministic demo fallback (testnet only): recoverable only by re-deriving
    // from the username, so this is not for real custody.
    const eng = engineRef.current!;
    const addr = syntheticAddress(u);
    let k = await eng.webClient.getUserKeys(addr).catch(() => null);
    if (!k) {
      await eng.webClient.deriveAndSaveUserKeys(addr, syntheticSig(u));
      k = await eng.webClient.getUserKeys(addr);
    }
    const keys: PubKeys = { notePub: k.noteKeypair.public, encPub: k.encryptionKeypair.public };
    registerKeys(u, keys);
    return keys;
  }, []);

  /** Send privately to a @username — resolves keys under the hood, no hex required. */
  const sendPrivateToUsername = useCallback(
    (username: string, xlm: string) => {
      const amount = xlmToStroops(xlm);
      return run('Private send', async (pid, addr) => {
        const keys = await resolveRecipient(username);
        return engineRef.current!.webClient.executeTransfer(
          pid, addr, amount, keys.notePub, keys.encPub, submitFn(), onStatus(),
        );
      });
    },
    [run, resolveRecipient, submitFn, onStatus],
  );

  return { state, connect, shield, sendPrivate, sendPrivateToUsername, resolveRecipient, unshield, refresh, myKeys };
}
