'use client';
/**
 * Bridge the Privy embedded (social-login) Stellar wallet into the privacy
 * engine's signing surface, so /shielded works without connecting a second
 * StellarWalletsKit wallet.
 *
 * The embedded wallet signs a raw 32-byte hash (Privy `signRawHash`). We reuse
 * that for all three things the engine needs:
 *   - key derivation: sign sha256(message)               -> deterministic note keys
 *   - tx envelope:    sign tx.hash() and addSignature     -> valid Stellar sig
 *   - Soroban auth:   sign sha256(authPreimage.toXDR())   -> valid auth sig
 * The hash/sig handling mirrors the main Stellar adapter's `privySign`.
 */
import { Transaction, hash } from '@stellar/stellar-sdk';
import type { SignRawHashFn } from '../chain/types';
import type { EmbeddedSigner } from './wallet';

export function createEmbeddedSigner(opts: {
  address: string;
  networkPassphrase: string;
  rawSign: SignRawHashFn;
}): EmbeddedSigner {
  const { address, networkPassphrase, rawSign } = opts;

  // Sign a 32-byte hash, return the ed25519 signature as base64.
  const signHashB64 = async (h: Buffer): Promise<string> => {
    const { signature } = await rawSign({
      address,
      chainType: 'stellar',
      hash: `0x${h.toString('hex')}`,
    });
    const hex = signature.startsWith('0x') ? signature.slice(2) : signature;
    return Buffer.from(hex, 'hex').toString('base64');
  };

  return {
    address,
    // Key derivation: any deterministic signature works; sha256(message) is stable.
    signMessage: (message) => signHashB64(hash(Buffer.from(message, 'utf8'))),
    // authorizeEntry expects the signature over sha256(preimage.toXDR()).
    signAuthEntry: (preimageXdrBase64) => signHashB64(hash(Buffer.from(preimageXdrBase64, 'base64'))),
    async signTransaction(xdrStr) {
      const tx = new Transaction(xdrStr, networkPassphrase);
      tx.addSignature(address, await signHashB64(tx.hash()));
      return tx.toXDR();
    },
  };
}
