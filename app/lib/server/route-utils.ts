import { connectDB } from './db';

/** JSON success response. */
export const ok = (data: unknown, status = 200) =>
  Response.json(data as Record<string, unknown>, { status });

/** JSON error response. */
export const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Read the JSON body of a request (empty object on parse failure). */
export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Read a query-string param. */
export const q = (req: Request, key: string): string | null =>
  new URL(req.url).searchParams.get(key);

/**
 * Wrap a route handler: ensure the DB is connected, and turn thrown errors
 * into a 500 (or 503 when the DB isn't configured) instead of crashing.
 */
export function handler<A extends unknown[]>(fn: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A): Promise<Response> => {
    try {
      await connectDB();
    } catch {
      return bad('Database not configured', 503);
    }
    try {
      return await fn(req, ...args);
    } catch (e) {
      console.error('[api]', (e as Error)?.message || e);
      return bad((e as Error)?.message || 'Internal error', 500);
    }
  };
}
