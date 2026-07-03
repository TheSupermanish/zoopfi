export const runtime = 'nodejs';
import { NETWORK } from '@/app/lib/chain/config';

/**
 * Soroban RPC proxy that unblocks the ZK engine's boot sync.
 *
 * The engine replays the pool's event history via `getEvents` starting from the
 * pool's deployment ledger. The public Soroban RPC only retains a rolling window
 * (~7 days), so once the pool is older than that, `getEvents` is rejected with
 * "startLedger must be within the ledger range …" and the engine hangs forever
 * on "Booting the ZK engine…".
 *
 * This proxy forwards every JSON-RPC call unchanged EXCEPT it clamps a
 * `getEvents.startLedger` that falls before the RPC's oldest retained ledger up
 * to that oldest ledger. The engine then syncs from the retained window forward
 * and boots. History before the window is lost (old notes won't be rediscovered),
 * but new shields/transfers land inside the window and are found normally.
 */

const TARGET = NETWORK.rpcUrl;

// How far back the engine's event replay is allowed to start. Clamping to a
// recent window (not just the RPC's oldest retained ledger) keeps boot fast:
// the engine only pages through ~1 day of pool events instead of the full ~7-day
// retention window. Any shield/transfer done recently is still inside this
// window, so it's discovered normally. ~17280 ledgers ≈ 1 day at 5s/ledger.
const RECENT_WINDOW_LEDGERS = 17_280;

// Cache the ledger range briefly so we don't getHealth on every call.
let cachedFloor = 0;
let cachedAt = 0;
async function minStartLedger(): Promise<number> {
  const now = Date.now();
  if (cachedFloor && now - cachedAt < 60_000) return cachedFloor;
  try {
    const r = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'health', method: 'getHealth' }),
    });
    const j = await r.json();
    const oldest = Number(j?.result?.oldestLedger) || 0;
    const latest = Number(j?.result?.latestLedger) || 0;
    if (oldest > 0 && latest > 0) {
      cachedFloor = Math.max(oldest, latest - RECENT_WINDOW_LEDGERS);
      cachedAt = now;
    }
  } catch { /* fall through — no clamp if health is unavailable */ }
  return cachedFloor;
}

export async function POST(req: Request): Promise<Response> {
  let body: any = null;
  try { body = await req.json(); } catch { /* forward as-is */ }

  if (
    body && body.method === 'getEvents' &&
    body.params && typeof body.params.startLedger === 'number'
  ) {
    const floor = await minStartLedger();
    if (floor && body.params.startLedger < floor) {
      body.params.startLedger = floor;
    }
  }

  const upstream = await fetch(TARGET, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
