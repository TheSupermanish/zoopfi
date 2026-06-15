'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` is used deliberately for Privy interop (linkedAccounts / extended-chains
// signRawHash signatures are loosely typed upstream).

/**
 * The single wallet hook every page/component uses. It encapsulates Privy
 * (Stellar embedded wallet, Tier 2) and exposes a chain-agnostic surface, so
 * no component reaches into Privy/SDK internals or hardcodes a chainType.
 *
 * Auth = Privy social login. On login we auto-provision a Stellar (G...)
 * embedded wallet. Chain ops (balance/send/contract/privacy) are dispatched to
 * the active adapter (mock | stellar) selected by NEXT_PUBLIC_CHAIN_ADAPTER.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { CHAIN_ADAPTER, NETWORK, getExplorerUrl } from './config';
import type { ChainOps, SignRawHashFn, WalletContext as WC } from './types';
import { createMockChainOps } from './mock';
// NOTE: the real Stellar adapter (./stellar) is loaded lazily only when
// CHAIN_ADAPTER === 'stellar', so mock mode never bundles @stellar/stellar-sdk.

export interface WalletState {
  ready: boolean;
  authenticated: boolean;
  /** G... Stellar address, or '' if none yet. */
  address: string;
  publicKey: string;
  /** authenticated and a Stellar embedded wallet exists. */
  isConnected: boolean;
  hasWallet: boolean;
  creatingWallet: boolean;
  adapterMode: typeof CHAIN_ADAPTER;
  ops: ChainOps;
  createStellarWallet: () => Promise<void>;
  /** testnet setup: friendbot-fund XLM + add USDC trustline (no-op in mock). */
  setupAccount: () => Promise<void>;
  logout: () => Promise<void>;
  getExplorerUrl: (h: string) => string;
}

export const WalletStateContext = createContext<WalletState | null>(null);

function findStellarAccount(user: any): { address: string; publicKey: string } | null {
  const acc = user?.linkedAccounts?.find(
    (a: any) => a.type === 'wallet' && a.chainType === 'stellar',
  );
  if (!acc?.address) return null;
  // On Stellar the G-address is the StrKey-encoded public key.
  return { address: acc.address, publicKey: acc.publicKey || acc.address };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout: privyLogout } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const [creatingWallet, setCreatingWallet] = useState(false);
  const creatingRef = useRef(false);

  const stellar = findStellarAccount(user);
  const address = stellar?.address || '';
  const publicKey = stellar?.publicKey || '';

  const signFn: SignRawHashFn | null = useMemo(() => {
    if (!signRawHash) return null;
    return async ({ address: a, hash }) => {
      const res = await signRawHash({ address: a, chainType: 'stellar', hash } as any);
      return { signature: (res as any).signature };
    };
  }, [signRawHash]);

  const [ops, setOps] = useState<ChainOps>(() =>
    createMockChainOps({ address: '', publicKey: '', signRawHash: null }),
  );

  useEffect(() => {
    const ctx: WC = { address, publicKey, signRawHash: signFn };
    if (CHAIN_ADAPTER === 'stellar') {
      let cancelled = false;
      (async () => {
        // Ensure Buffer exists before the SDK loads (stellar-base assumes it).
        const { Buffer } = await import('buffer');
        if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
          (globalThis as any).Buffer = Buffer;
        }
        const m = await import('./stellar');
        if (!cancelled) setOps(m.createStellarChainOps(ctx));
      })();
      return () => { cancelled = true; };
    }
    setOps(createMockChainOps(ctx));
  }, [address, publicKey, signFn]);

  const createStellarWallet = async () => {
    if (creatingRef.current || address) return;
    creatingRef.current = true;
    setCreatingWallet(true);
    try {
      await createWallet({ chainType: 'stellar' });
    } catch (e) {
      console.error('[wallet] createStellarWallet', e);
    } finally {
      setCreatingWallet(false);
      creatingRef.current = false;
    }
  };

  // Auto-provision a Stellar wallet once the user is authenticated.
  useEffect(() => {
    if (ready && authenticated && user && !address && !creatingRef.current) {
      void createStellarWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user, address]);

  const setupAccount = async () => {
    if (CHAIN_ADAPTER !== 'stellar' || !address) return;
    // Friendbot funds the account with XLM (creates it on testnet).
    if (NETWORK.friendbotUrl) {
      try { await fetch(`${NETWORK.friendbotUrl}?addr=${encodeURIComponent(address)}`); }
      catch (e) { console.warn('[wallet] friendbot', e); }
    }
    // Establish the USDC trustline so the account can receive USDC.
    try {
      const has = await ops.hasTrustline(address, 'USDC');
      if (!has) await ops.addTrustline('USDC');
    } catch (e) { console.warn('[wallet] trustline setup', e); }
  };

  const value: WalletState = {
    ready,
    authenticated,
    address,
    publicKey,
    isConnected: !!(authenticated && address),
    hasWallet: !!address,
    creatingWallet,
    adapterMode: CHAIN_ADAPTER,
    ops,
    createStellarWallet,
    setupAccount,
    logout: async () => { await privyLogout(); },
    getExplorerUrl,
  };

  return <WalletStateContext.Provider value={value}>{children}</WalletStateContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletStateContext);
  if (!ctx) throw new Error('useWallet must be used within <WalletProvider>');
  return ctx;
}
