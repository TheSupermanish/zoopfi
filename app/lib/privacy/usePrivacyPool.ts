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
import { connectWallet, getConnectedAddress, signWalletMessage, PrivacyWalletError } from './wallet';
import { submitPreparedSorobanTx, type SubmitStatus } from './submit';

const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;

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
  kind: string;
  txHash?: string;
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
      const address = await connectWallet();
      patch({ address, statusText: 'Deriving private keys…' });

      // Derive (or load) note + encryption keys from one wallet signature.
      const existing = await eng.webClient.getUserKeys(address).catch(() => null);
      if (!existing) {
        const msg = eng.webClient.keyDerivationMessage();
        const { signedMessage } = await signWalletMessage(msg, { address });
        const sigBytes = Uint8Array.from(atob(signedMessage), (c) => c.charCodeAt(0));
        await eng.webClient.deriveAndSaveUserKeys(address, sigBytes);
      }
      patch({ keysReady: true, busy: false, statusText: '' });
      void refresh();
    } catch (e) {
      fail(e);
    }
  }, [patch, fail, refresh]);

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
      return run('Shield', (pid, addr) =>
        engineRef.current!.webClient.executeDeposit(pid, addr, amount, [amount, BigInt(0)], submitFn(), onStatus()),
      );
    },
    [run, submitFn, onStatus],
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

  return { state, connect, shield, sendPrivate, unshield, refresh, myKeys };
}
