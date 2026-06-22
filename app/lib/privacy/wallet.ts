'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Wallet shim for the privacy engine, backed by StellarWalletsKit.
 *
 * The Nethermind engine signs/submits through a small set of wallet functions
 * (originally Freighter-only). We reimplement that surface with StellarWalletsKit
 * so Zoopfi users can connect Freighter / xBull / Albedo / Lobstr. The shapes
 * mirror the engine's expectations exactly:
 *   - signTransaction(xdr)      -> { signedTxXdr }
 *   - signAuthEntry(preimage)   -> { signedAuthEntry }
 *   - signMessage(message)      -> { signedMessage }   (note-key derivation)
 *
 * Errors are normalized so the UI can distinguish wallet-not-found,
 * user-rejected, and other wallet failures (the 3 required error types).
 */
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { CURRENT_NETWORK } from '../chain/config';

export type WalletErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'WALLET_ERROR';

export class PrivacyWalletError extends Error {
  code: WalletErrorCode;
  constructor(message: string, code: WalletErrorCode) {
    super(message);
    this.code = code;
    this.name = 'PrivacyWalletError';
  }
}

/** Map an arbitrary wallet error into one of our 3 known codes. */
export function normalizeWalletError(e: unknown, fallback = 'Wallet error'): PrivacyWalletError {
  const msg = (e as any)?.message || String(e) || fallback;
  const lower = msg.toLowerCase();
  if (/not (installed|detected|found|available)|no wallet|missing/.test(lower)) {
    return new PrivacyWalletError(msg, 'WALLET_NOT_FOUND');
  }
  if (/reject|declin|denied|cancel|user (closed|did not)/.test(lower)) {
    return new PrivacyWalletError('You declined the request in your wallet.', 'USER_REJECTED');
  }
  if (/insufficient|underfunded|not enough|op_underfunded|tx_insufficient|#2\b|insufficientshares/.test(lower)) {
    return new PrivacyWalletError('Insufficient balance for this transaction.', 'INSUFFICIENT_BALANCE');
  }
  // Pool deposit cap: WrongExtAmount (Error #6) fires when a shield exceeds the
  // pool's maximum_deposit_amount. Surface a human message instead of the raw host error.
  if (/wrongextamount|error\(contract,\s*#6\)/.test(lower)) {
    return new PrivacyWalletError('Amount exceeds this pool’s deposit limit (100 XLM). Try a smaller amount.', 'WALLET_ERROR');
  }
  return new PrivacyWalletError(msg, 'WALLET_ERROR');
}

let kit: StellarWalletsKit | null = null;
let connectedAddress = '';

/**
 * Optional embedded signer. When the app is on a Privy social-login (embedded)
 * wallet, the privacy layer signs through it via raw-hash signing instead of
 * opening the StellarWalletsKit picker, so /shielded works without connecting a
 * second wallet. Built in ./embedded-signer and registered from usePrivacyPool;
 * falls back to the kit when null (external wallets).
 */
export interface EmbeddedSigner {
  address: string;
  signMessage(message: string): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  signAuthEntry(preimageXdrBase64: string): Promise<string>;
}
let embedded: EmbeddedSigner | null = null;

export function registerEmbeddedSigner(signer: EmbeddedSigner | null) {
  embedded = signer;
  if (signer) connectedAddress = signer.address;
}

function getKit(): StellarWalletsKit {
  if (kit) return kit;
  kit = new StellarWalletsKit({
    network: CURRENT_NETWORK === 'mainnet' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
    // Match the app's dark/glass design instead of the kit's default light modal.
    modalTheme: {
      bgColor: '#160f22',
      textColor: '#f4ecff',
      solidTextColor: '#ffffff',
      headerButtonColor: '#c89bff',
      dividerColor: 'rgba(255, 255, 255, 0.10)',
      helpBgColor: 'rgba(255, 255, 255, 0.04)',
      notAvailableTextColor: '#ad92c9',
      notAvailableBgColor: 'rgba(255, 255, 255, 0.04)',
      notAvailableBorderColor: 'rgba(255, 255, 255, 0.10)',
    },
  });
  return kit;
}

/** Open the wallet picker and connect; returns the selected G... address. */
export async function connectWallet(): Promise<string> {
  const k = getKit();
  return new Promise<string>((resolve, reject) => {
    k.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          k.setWallet(option.id);
          const { address } = await k.getAddress();
          if (!address) throw new PrivacyWalletError('No address returned from wallet', 'WALLET_ERROR');
          connectedAddress = address;
          resolve(address);
        } catch (e) {
          reject(normalizeWalletError(e, 'Failed to connect wallet'));
        }
      },
      onClosed: () => reject(new PrivacyWalletError('Wallet selection cancelled.', 'USER_REJECTED')),
    });
  });
}

export function getConnectedAddress(): string {
  return connectedAddress;
}

export async function getWalletAddress(): Promise<string> {
  if (connectedAddress) return connectedAddress;
  const { address } = await getKit().getAddress();
  connectedAddress = address;
  return address;
}

export async function signWalletTransaction(
  transactionXdr: string,
  opts: { address?: string; networkPassphrase?: string } = {},
): Promise<{ signedTxXdr: string; signerAddress: string }> {
  try {
    if (embedded) {
      return { signedTxXdr: await embedded.signTransaction(transactionXdr), signerAddress: embedded.address };
    }
    const address = opts.address || (await getWalletAddress());
    const { signedTxXdr, signerAddress } = await getKit().signTransaction(transactionXdr, {
      address,
      networkPassphrase: opts.networkPassphrase,
    });
    return { signedTxXdr, signerAddress: signerAddress || address };
  } catch (e) {
    throw normalizeWalletError(e, 'Transaction signature failed');
  }
}

export async function signWalletAuthEntry(
  entryXdr: string,
  opts: { address?: string; networkPassphrase?: string } = {},
): Promise<{ signedAuthEntry: string; signerAddress: string }> {
  try {
    if (embedded) {
      return { signedAuthEntry: await embedded.signAuthEntry(entryXdr), signerAddress: embedded.address };
    }
    const address = opts.address || (await getWalletAddress());
    const res = await getKit().signAuthEntry(entryXdr, {
      address,
      networkPassphrase: opts.networkPassphrase,
    });
    // Kit returns base64 signedAuthEntry (string) across wallets.
    return {
      signedAuthEntry: (res as any).signedAuthEntry,
      signerAddress: (res as any).signerAddress || address,
    };
  } catch (e) {
    throw normalizeWalletError(e, 'Auth entry signature failed');
  }
}

export async function signWalletMessage(
  message: string,
  opts: { address?: string } = {},
): Promise<{ signedMessage: string; signerAddress: string }> {
  try {
    if (embedded) {
      return { signedMessage: await embedded.signMessage(message), signerAddress: embedded.address };
    }
    const address = opts.address || (await getWalletAddress());
    const res = await getKit().signMessage(message, { address });
    const signedMessage = (res as any).signedMessage;
    if (!signedMessage) {
      throw new PrivacyWalletError('No signature returned (request may have been rejected).', 'USER_REJECTED');
    }
    // Normalize to base64 string (the engine does atob() on it).
    const asString =
      typeof signedMessage === 'string'
        ? signedMessage
        : Buffer.from(signedMessage).toString('base64');
    return { signedMessage: asString, signerAddress: (res as any).signerAddress || address };
  } catch (e) {
    throw normalizeWalletError(e, 'Message signature failed');
  }
}
