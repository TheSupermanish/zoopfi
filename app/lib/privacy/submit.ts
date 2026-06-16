'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Submit a WASM-prepared Soroban transaction (TS port of the engine's stellar.js).
 *
 * The engine prepares { txXdr, authEntries[], latestLedger }. Here we sign each
 * Soroban auth entry that belongs to the user, patch them into the tx, sign the
 * envelope, submit via RPC, and poll to SUCCESS/FAILED. Signing goes through the
 * StellarWalletsKit shim so it works with Freighter/xBull/etc.
 */
import { Address, Transaction, authorizeEntry, rpc, xdr } from '@stellar/stellar-sdk';
import { signWalletAuthEntry, signWalletTransaction, normalizeWalletError } from './wallet';

export type SubmitStage = 'sign_auth' | 'sign_tx' | 'submit' | 'confirm';
export interface SubmitStatus {
  stage: SubmitStage;
  message: string;
  current?: number;
  total?: number;
}

interface Prepared {
  txXdr: string;
  authEntries: string[];
  latestLedger?: number;
}
interface SubmitCtx {
  address: string;
  rpcUrl: string;
  networkPassphrase: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function needsWalletAuthEntry(entry: xdr.SorobanAuthorizationEntry, address: string): boolean {
  const creds = entry.credentials();
  if (creds.switch() !== xdr.SorobanCredentialsType.sorobanCredentialsAddress()) return false;
  const addrAuth = creds.address();
  if (addrAuth.signature().switch().name !== 'scvVoid') return false;
  return Address.fromScAddress(addrAuth.address()).toString() === address;
}

async function signPreparedAuthEntry(
  entryXdr: string,
  ctx: { address: string; networkPassphrase: string; latestLedger: number; server: rpc.Server },
): Promise<string> {
  const entry = xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, 'base64');
  if (!needsWalletAuthEntry(entry, ctx.address)) return entryXdr;

  let validUntil = Number(entry.credentials().address().signatureExpirationLedger());
  if (!validUntil) {
    const seq = ctx.latestLedger > 0 ? ctx.latestLedger : (await ctx.server.getLatestLedger()).sequence;
    validUntil = seq + 100;
  }

  const signed = await authorizeEntry(
    entry,
    async (preimage: any) => {
      const { signedAuthEntry } = await signWalletAuthEntry(preimage.toXDR('base64'), {
        address: ctx.address,
        networkPassphrase: ctx.networkPassphrase,
      });
      if (!signedAuthEntry) throw new Error('Auth entry signature was not returned');
      return Buffer.from(signedAuthEntry, 'base64');
    },
    validUntil,
    ctx.networkPassphrase,
  );
  return signed.toXDR('base64');
}

function patchAuthEntries(txXdr: string, signedAuthEntries: string[]): string {
  const env = xdr.TransactionEnvelope.fromXDR(txXdr, 'base64');
  const v1 = env.v1();
  if (!v1) throw new Error('Unsupported transaction envelope (expected v1)');
  const auth = signedAuthEntries.map((e) => xdr.SorobanAuthorizationEntry.fromXDR(e, 'base64'));
  for (const op of v1.tx().operations()) {
    const invoke = (op.body() as any)?.invokeHostFunctionOp?.();
    if (!invoke) continue;
    invoke.auth(auth);
    return env.toXDR('base64');
  }
  throw new Error('No invokeHostFunction operation found to attach auth entries');
}

/** Sign + submit a prepared Soroban tx; resolves to the tx hash on SUCCESS. */
export async function submitPreparedSorobanTx(
  prepared: Prepared,
  ctx: SubmitCtx,
  onStatus?: (s: SubmitStatus) => void,
): Promise<string> {
  const { txXdr, authEntries, latestLedger = 0 } = prepared || ({} as Prepared);
  const { address, rpcUrl, networkPassphrase } = ctx;
  const emit = (stage: SubmitStage, message: string, current?: number, total?: number) =>
    onStatus?.({ stage, message, current, total });

  if (!txXdr) throw new Error('Invalid prepared txXdr');
  if (!Array.isArray(authEntries)) throw new Error('Invalid prepared authEntries');

  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith('http://') });

  try {
    const walletAuthTotal = authEntries.filter((e) =>
      needsWalletAuthEntry(xdr.SorobanAuthorizationEntry.fromXDR(e, 'base64'), address),
    ).length;

    const signedAuthEntries: string[] = [];
    let step = 0;
    for (const entryXdr of authEntries) {
      if (needsWalletAuthEntry(xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, 'base64'), address)) {
        step++;
        emit('sign_auth', `Approve authorization (${step}/${walletAuthTotal})…`, step, walletAuthTotal);
      }
      signedAuthEntries.push(
        await signPreparedAuthEntry(entryXdr, { address, networkPassphrase, latestLedger, server }),
      );
    }

    const patchedTxXdr = walletAuthTotal > 0 ? patchAuthEntries(txXdr, signedAuthEntries) : txXdr;

    emit('sign_tx', 'Approve transaction…');
    const { signedTxXdr } = await signWalletTransaction(patchedTxXdr, { address, networkPassphrase });
    if (!signedTxXdr) throw new Error('Transaction signature was not returned');

    emit('submit', 'Submitting…');
    const send = await server.sendTransaction(new Transaction(signedTxXdr, networkPassphrase));
    const hash = (send as any)?.hash;
    if (!hash) throw new Error('Transaction submission failed');

    for (let i = 0; i < 30; i++) {
      emit('confirm', 'Confirming…', i + 1, 30);
      await sleep(1000);
      const res = await server.getTransaction(hash);
      if (res?.status === 'SUCCESS') return hash;
      if (res?.status === 'FAILED') throw new Error('Transaction failed on-chain');
    }
    throw new Error(`Confirmation timed out (hash: ${hash})`);
  } catch (e) {
    // Surface wallet-specific codes (rejected/not-found) to the UI.
    throw normalizeWalletError(e, 'Submit failed');
  }
}
