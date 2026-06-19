export const runtime = 'nodejs';
import { handler, ok } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ username: string }> }) => {
  const { username } = await params;

  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  if (!usernameRegex.test(username.toLowerCase())) {
    return ok({ available: false, error: 'Invalid username format' }, 400);
  }

  const existingUser = await User.findOne({ username: username.toLowerCase() });

  return ok({
    available: !existingUser,
    username: username.toLowerCase(),
  });
});
