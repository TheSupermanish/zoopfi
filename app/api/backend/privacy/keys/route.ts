export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

/**
 * Shielded-pool key directory.
 *
 * A private transfer needs the recipient's note + encryption PUBLIC keys. We
 * store them on the recipient's User record (server-side, shared across every
 * device) so a sender on another machine can resolve @username -> real keys.
 * Without this the directory is browser-local and cross-device sends silently
 * fall back to keys the recipient doesn't control.
 */

/** Publish the signed-in user's pool public keys so others can pay them by @username. */
export const POST = handler(async (req: Request) => {
  const { walletAddress, notePubKey, encryptionPubKey } = await body<{
    walletAddress?: string; notePubKey?: string; encryptionPubKey?: string;
  }>(req);
  if (!walletAddress || !notePubKey || !encryptionPubKey) {
    return bad('walletAddress, notePubKey and encryptionPubKey are required');
  }
  const user = await User.findOne({ walletAddress });
  if (!user) return bad('User not found', 404);
  user.notePubKey = notePubKey;
  user.encryptionPubKey = encryptionPubKey;
  await user.save();
  return ok({ ok: true });
});

/** Resolve a @username to its pool public keys for a private transfer. */
export const GET = handler(async (req: Request) => {
  const username = q(req, 'username');
  if (!username) return bad('username query param is required');
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) return bad('User not found', 404);
  // The user exists but hasn't derived/published their pool keys yet — distinct
  // from "no such user" so the client can tell the sender to ask them to unlock
  // private payments once, instead of sending to unclaimable keys.
  if (!user.notePubKey || !user.encryptionPubKey) {
    return bad('User has not enabled private payments yet', 409);
  }
  return ok({
    username: user.username,
    displayName: user.displayName,
    notePubKey: user.notePubKey,
    encryptionPubKey: user.encryptionPubKey,
  });
});
