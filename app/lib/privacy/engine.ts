'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Loader for the Zoopfi privacy engine (forked from NethermindEth/stellar-private-payments).
 *
 * The engine is a Rust/WASM client compiled with trunk and served as static
 * assets from /public/js. It does all the heavy lifting: Poseidon2 commitments,
 * note management (OPFS-backed SQLite), Merkle proofs, and Groth16 proving in a
 * web worker. We load it at runtime (it is NOT bundled by Next) and drive it
 * from React, providing our own wallet for signing.
 *
 * The deployed contract addresses (our testnet Pool + verifier + ASP) are baked
 * into web_bg.wasm at build time from deployments/testnet/deployments.json, so
 * the engine already points at our stack.
 */
import { NETWORK } from '../chain/config';

// Hide the dynamic import of a public (non-bundled) asset from the bundler so
// Turbopack/webpack don't try to resolve '/js/web.js' at build time.
const nativeImport = (url: string): Promise<any> =>
  (new Function('u', 'return import(u)') as (u: string) => Promise<any>)(url);

export interface PrivacyEngine {
  /** The WebClient handle exposing deposit/transfer/withdraw + key/note APIs. */
  webClient: any;
  rpcUrl: string;
  networkPassphrase: string;
}

let enginePromise: Promise<PrivacyEngine> | null = null;

/** Load + initialize the WASM engine once (idempotent, browser-only). */
export function loadPrivacyEngine(): Promise<PrivacyEngine> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('privacy engine is browser-only'));
  }
  if (enginePromise) return enginePromise;

  enginePromise = (async () => {
    const mod = await nativeImport('/js/web.js');
    // wasm-bindgen default export = init; loads web_bg.wasm next to web.js.
    await mod.default({ module_or_path: '/js/web_bg.wasm' });
    // Route RPC through our same-origin proxy (/api/rpc). It forwards everything
    // to the real Soroban RPC but clamps getEvents.startLedger to the RPC's
    // retention window, so the engine's boot sync can't get stuck asking for
    // pool history older than the RPC keeps (which otherwise hangs "Booting…").
    const rpcUrl = `${window.location.origin}/api/rpc`;
    const handle = await mod.mainThread(new mod.Config(rpcUrl));
    const engine = {
      webClient: handle.webClient,
      rpcUrl,
      networkPassphrase: NETWORK.networkPassphrase,
    };
    // Dev-only: expose the loaded engine for debugging private-pool calls from the console.
    if (process.env.NODE_ENV !== 'production') {
      (window as any).__eng = engine;
    }
    return engine;
  })();

  return enginePromise;
}
