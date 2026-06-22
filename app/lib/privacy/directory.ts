'use client';
/**
 * Username -> shielded-pool public keys directory.
 *
 * A private transfer needs the recipient's note + encryption PUBLIC keys. Exposing
 * those as hex in the UI is awful, so we resolve a friendly @username to them here:
 *
 *  - Real users publish their derived keys to the registry on unlock (registerKeys).
 *  - Anyone not yet in the registry resolves to a deterministic keypair derived from
 *    the username, so demo recipients (e.g. @alice) "just work" without a second
 *    device. The keys are valid pool keypairs, so the on-chain ZK transfer is real.
 *
 * In a multi-device deployment this registry would live in the backend; for now it
 * is browser-local + deterministic, which is enough to make pay-by-username real.
 */
export interface PubKeys {
  notePub: string;
  encPub: string;
}
type Entry = PubKeys & { display?: string };
type Registry = Record<string, Entry>;

const REG_KEY = 'zoopfi.privacy.directory.v1';

export const normUser = (u: string): string => u.trim().replace(/^@/, '').toLowerCase();

function load(): Registry {
  try {
    return JSON.parse(localStorage.getItem(REG_KEY) || '{}') as Registry;
  } catch {
    return {};
  }
}
function save(r: Registry): void {
  try {
    localStorage.setItem(REG_KEY, JSON.stringify(r));
  } catch {
    /* ignore quota */
  }
}

export function getRegistered(username: string): Entry | null {
  return load()[normUser(username)] || null;
}

export function registerKeys(username: string, keys: PubKeys, display?: string): void {
  const u = normUser(username);
  if (!u) return;
  const r = load();
  r[u] = { ...keys, display };
  save(r);
}

/** Stable, fake-but-well-formed Stellar address used to derive a demo recipient's keys. */
export function syntheticAddress(username: string): string {
  const base = ('DEMO' + normUser(username).toUpperCase()).replace(/[^A-Z2-7]/g, 'X');
  return ('G' + base.padEnd(55, 'X')).slice(0, 56);
}

/** Stable 64-byte "signature" so a username always derives the same keypair. */
export function syntheticSig(username: string): Uint8Array {
  const u = normUser(username) || 'x';
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) out[i] = (u.charCodeAt(i % u.length) + i * 7) & 0xff;
  return out;
}
