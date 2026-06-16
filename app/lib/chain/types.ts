/**
 * Chain-abstraction types. Every page talks to the chain through these,
 * never through Privy/Stellar SDK internals directly.
 */
import type { AssetCode } from './config';

export type { AssetCode };

/** Privy raw-hash signing function (extended-chains), used by the Stellar adapter. */
export type SignRawHashFn = (params: {
  address: string;
  chainType: 'stellar';
  hash: `0x${string}`;
}) => Promise<{ signature: string }>;

export interface TxResult {
  hash: string;
  success: boolean;
  explorerUrl: string;
  error?: string;
}

/** Context the active chain adapter is built from (provided by useWallet). */
export interface WalletContext {
  address: string;          // G... account address
  publicKey: string;        // hex/base64 public key (Stellar: same key as address)
  signRawHash: SignRawHashFn | null;
  /**
   * External-wallet signer (StellarWalletsKit: Freighter/xBull/…). When present,
   * the adapter signs the full tx XDR with it instead of Privy raw-hash signing.
   */
  signXdr?: ((xdr: string) => Promise<string>) | null;
}

/** Public on-chain operations. Implemented by StellarChainOps and MockChainOps. */
export interface ChainOps {
  /** Balance of an asset in human units (e.g. "12.50"). */
  getBalance(address: string, asset?: AssetCode): Promise<string>;
  /** Send a classic payment. amount is human units. */
  sendPayment(to: string, amount: string, asset?: AssetCode, memo?: string): Promise<TxResult>;
  /** Whether an account holds a trustline for the asset (USDC needs one). */
  hasTrustline(address: string, asset?: AssetCode): Promise<boolean>;
  /** Establish a trustline (no-op for XLM). */
  addTrustline(asset?: AssetCode): Promise<TxResult>;
  /** Invoke a Soroban contract method (state-changing). */
  invokeContract(contractId: string, method: string, args: unknown[]): Promise<TxResult>;
  /** Read-only Soroban contract call (simulated). */
  viewContract(contractId: string, method: string, args: unknown[]): Promise<unknown>;
  getExplorerUrl(txHash: string): string;
  /** Privacy / shielded-pool operations. */
  privacy: PrivacyOps;
}

// ---------------------------------------------------------------------------
// Privacy (shielded pool) layer
// ---------------------------------------------------------------------------

export interface PrivateNote {
  id: string;
  amount: string;        // human units
  asset: AssetCode;
  createdAt: number;
  spent: boolean;
  /** memo/label only stored locally, never on-chain. */
  note?: string;
  /** counterparty username if known (sender for incoming, recipient for outgoing). */
  counterparty?: string;
  direction: 'in' | 'out' | 'shield';
}

export type PrivacyOpKind = 'shield' | 'transfer' | 'unshield';

export interface PrivacyOpResult extends TxResult {
  kind: PrivacyOpKind;
  /** proving time in ms (for UX), real or simulated. */
  provingMs: number;
}

export interface PrivacyOps {
  /** Whether the user has derived their note keys (enabled private balance). */
  isEnabled(): Promise<boolean>;
  /** Derive note keys from a wallet signature (one-time). */
  enable(): Promise<void>;
  /** Total shielded balance in human units. */
  getPrivateBalance(asset?: AssetCode): Promise<string>;
  /** Public -> private: move funds into the pool. */
  shield(amount: string, asset?: AssetCode): Promise<PrivacyOpResult>;
  /** Private -> private: send to a recipient's note key, resolved by username/address. */
  transfer(to: string, amount: string, asset?: AssetCode, note?: string): Promise<PrivacyOpResult>;
  /** Private -> public: withdraw from the pool to a G... address. */
  unshield(amount: string, toAddress?: string, asset?: AssetCode): Promise<PrivacyOpResult>;
  /** Local list of the user's notes (decrypted on device). */
  listNotes(): Promise<PrivateNote[]>;
}
