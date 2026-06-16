/**
 * Real Stellar testnet adapter using @stellar/stellar-sdk.
 *
 * Auth/keys come from the Privy Stellar embedded wallet (Tier 2): Privy holds
 * the Ed25519 key and raw-signs the 32-byte tx hash; this module builds the
 * transaction, attaches the signature, and submits it (Horizon for classic
 * payments, Soroban RPC for contract calls).
 *
 * Privacy (shielded pool) is not deployed on testnet in this phase, so the
 * privacy ops delegate to the mock implementation. Phase 3 swaps in the real
 * WASM prover + deployed Pool contract.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` is used deliberately here for @stellar/stellar-sdk interop (ScVal,
// simulation responses, Horizon error shapes) where precise types add noise.
import {
  Horizon,
  rpc as StellarRpc,
  TransactionBuilder,
  Operation,
  Asset,
  Address,
  Memo,
  BASE_FEE,
  Contract,
  nativeToScVal,
  scValToNative,
  type Transaction,
} from '@stellar/stellar-sdk';
import { NETWORK, USDC, CURRENT_NETWORK, getExplorerUrl } from './config';
import type { AssetCode, ChainOps, TxResult, WalletContext } from './types';
import { createMockChainOps } from './mock';

const horizon = new Horizon.Server(NETWORK.horizonUrl);
const rpc = new StellarRpc.Server(NETWORK.rpcUrl, { allowHttp: NETWORK.rpcUrl.startsWith('http://') });
const PASSPHRASE = NETWORK.networkPassphrase;

const assetFor = (code: AssetCode): Asset =>
  code === 'XLM' ? Asset.native() : new Asset(USDC.code, USDC.issuer);

const fail = (error: string): TxResult => ({ success: false, hash: '', explorerUrl: '', error });

/** Sign a built transaction with the Privy raw-hash signer and attach the sig. */
async function privySign(tx: Transaction, ctx: WalletContext): Promise<void> {
  if (!ctx.signRawHash) throw new Error('No signer available');
  const hashHex = `0x${tx.hash().toString('hex')}` as `0x${string}`;
  const { signature } = await ctx.signRawHash({ address: ctx.address, chainType: 'stellar', hash: hashHex });
  const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const sigB64 = Buffer.from(sigHex, 'hex').toString('base64');
  // addSignature verifies the signature against the public key and attaches it.
  tx.addSignature(ctx.address, sigB64);
}

/**
 * Sign a built tx and return a submittable Transaction. External wallets
 * (StellarWalletsKit) sign the full XDR and return a signed envelope; Privy
 * embedded wallets raw-hash sign in place.
 */
async function signTx(tx: Transaction, ctx: WalletContext): Promise<Transaction> {
  if (ctx.signXdr) {
    const signedXdr = await ctx.signXdr(tx.toXDR());
    return TransactionBuilder.fromXDR(signedXdr, PASSPHRASE) as Transaction;
  }
  await privySign(tx, ctx);
  return tx;
}

export function createStellarChainOps(ctx: WalletContext): ChainOps {
  // Public payments are real; privacy is mocked until the pool is deployed.
  const mockPrivacy = createMockChainOps(ctx).privacy;

  return {
    async getBalance(address: string, asset: AssetCode = 'USDC') {
      try {
        const account = await horizon.loadAccount(address);
        if (asset === 'XLM') {
          const native = account.balances.find((b) => b.asset_type === 'native');
          return native?.balance ?? '0';
        }
        const line = account.balances.find(
          (b) => 'asset_code' in b && b.asset_code === USDC.code && (b as any).asset_issuer === USDC.issuer,
        );
        return line?.balance ?? '0';
      } catch (e: any) {
        if (e?.response?.status === 404) return '0'; // account not funded yet
        console.error('[stellar] getBalance', e);
        return '0';
      }
    },

    async sendPayment(to: string, amount: string, asset: AssetCode = 'USDC', memo?: string): Promise<TxResult> {
      try {
        const account = await horizon.loadAccount(ctx.address);
        const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
          .addOperation(Operation.payment({ destination: to, asset: assetFor(asset), amount }))
          .setTimeout(180);
        if (memo) builder.addMemo(Memo.text(memo.slice(0, 28))); // Stellar text memo: max 28 bytes
        const tx = builder.build();
        const signed = await signTx(tx, ctx);
        const res = await horizon.submitTransaction(signed);
        return { success: true, hash: res.hash, explorerUrl: getExplorerUrl(res.hash) };
      } catch (e: any) {
        const detail = e?.response?.data?.extras?.result_codes
          ? JSON.stringify(e.response.data.extras.result_codes)
          : e?.message || 'payment failed';
        console.error('[stellar] sendPayment', detail);
        return fail(detail);
      }
    },

    async hasTrustline(address: string, asset: AssetCode = 'USDC') {
      if (asset === 'XLM') return true;
      try {
        const account = await horizon.loadAccount(address);
        return account.balances.some(
          (b) => 'asset_code' in b && b.asset_code === USDC.code && (b as any).asset_issuer === USDC.issuer,
        );
      } catch {
        return false;
      }
    },

    async addTrustline(asset: AssetCode = 'USDC'): Promise<TxResult> {
      if (asset === 'XLM') return { success: true, hash: '', explorerUrl: '' };
      try {
        const account = await horizon.loadAccount(ctx.address);
        const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
          .addOperation(Operation.changeTrust({ asset: assetFor(asset) }))
          .setTimeout(180)
          .build();
        const signed = await signTx(tx, ctx);
        const res = await horizon.submitTransaction(signed);
        return { success: true, hash: res.hash, explorerUrl: getExplorerUrl(res.hash) };
      } catch (e: any) {
        console.error('[stellar] addTrustline', e?.message || e);
        return fail(e?.message || 'trustline failed');
      }
    },

    async invokeContract(contractId: string, method: string, args: unknown[]): Promise<TxResult> {
      try {
        const account = await rpc.getAccount(ctx.address);
        const contract = new Contract(contractId);
        const scArgs = args.map((a) => toScVal(a));
        const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
          .addOperation(contract.call(method, ...scArgs))
          .setTimeout(180)
          .build();
        const prepared = await rpc.prepareTransaction(tx);
        const signed = await signTx(prepared as Transaction, ctx);
        const sent = await rpc.sendTransaction(signed);
        if (sent.status === 'ERROR') return fail(JSON.stringify(sent.errorResult));
        let got = await rpc.getTransaction(sent.hash);
        for (let i = 0; i < 30 && got.status === 'NOT_FOUND'; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          got = await rpc.getTransaction(sent.hash);
        }
        return {
          success: got.status === 'SUCCESS',
          hash: sent.hash,
          explorerUrl: getExplorerUrl(sent.hash),
          error: got.status === 'SUCCESS' ? undefined : got.status,
        };
      } catch (e: any) {
        console.error('[stellar] invokeContract', e?.message || e);
        return fail(e?.message || 'invoke failed');
      }
    },

    async viewContract(contractId: string, method: string, args: unknown[]): Promise<unknown> {
      try {
        const account = await rpc.getAccount(ctx.address);
        const contract = new Contract(contractId);
        const scArgs = args.map((a) => toScVal(a));
        const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
          .addOperation(contract.call(method, ...scArgs))
          .setTimeout(180)
          .build();
        const sim = await rpc.simulateTransaction(tx);
        if (StellarRpc.Api.isSimulationError(sim)) throw new Error(sim.error);
        const retval = (sim as StellarRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
        return retval ? scValToNative(retval) : null;
      } catch (e: any) {
        console.error('[stellar] viewContract', e?.message || e);
        return null;
      }
    },

    getExplorerUrl,
    privacy: mockPrivacy,
  };
}

/** Best-effort JS -> ScVal conversion for simple contract args. */
function toScVal(arg: unknown): any {
  // Stellar account (G...) or contract (C...) address.
  if (typeof arg === 'string' && /^[GC][A-Z2-7]{55}$/.test(arg)) {
    return Address.fromString(arg).toScVal();
  }
  if (typeof arg === 'number') return nativeToScVal(arg, { type: 'u32' });
  if (typeof arg === 'bigint') return nativeToScVal(arg, { type: 'i128' });
  return nativeToScVal(arg);
}

export { CURRENT_NETWORK };
