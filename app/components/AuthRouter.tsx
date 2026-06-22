'use client';
/**
 * Global post-auth gate. The moment a user is authenticated AND their Stellar
 * wallet is provisioned, if they have no Zoopfi profile yet (`userData === null`)
 * we send them straight to onboarding — from whatever page they logged in on.
 *
 * Without this, onboarding only fired from a few guarded pages (/dashboard,
 * /history, …) after the user happened to navigate there, so it showed up "late"
 * after login/signup. This makes it immediate and consistent everywhere.
 */
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '../lib/chain';
import { useUser } from '../lib/hooks';

export function AuthRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, address } = useWallet();
  const { data: userData, isFetching } = useUser();

  useEffect(() => {
    // Wait until auth + wallet provisioning have settled. While `address` is
    // empty the profile query is disabled, so `userData` is `undefined` (not
    // null) and we hold — no premature redirect, no flicker.
    if (!authenticated || !address) return;
    // Never decide on in-flight data. `address` arrives in stages (localStorage
    // then the provisioned embedded wallet), so the query re-keys and refetches;
    // acting on a transient/stale `null` here is what caused the onboarding⇄
    // dashboard redirect loop. Only redirect once the profile query has settled.
    if (isFetching) return;
    if (userData === null && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [authenticated, address, userData, isFetching, pathname, router]);

  return null;
}
