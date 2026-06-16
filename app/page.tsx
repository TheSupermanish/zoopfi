'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from './lib/chain';
import LoginPage from './components/LoginPage';
import { getUserByAddress } from './lib/api';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, address } = useWallet();
  const [showLogin, setShowLogin] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Wait for Privy to be ready.
    if (!ready) return;
    if (redirectedRef.current) return;

    // Not logged in -> show the login screen.
    if (!authenticated) {
      setShowLogin(true);
      return;
    }

    // Authenticated but the Stellar embedded wallet is still provisioning.
    // The effect re-runs once `address` is set.
    if (!address) return;

    const checkAuth = async () => {
      try {
        const userData = await getUserByAddress(address);
        redirectedRef.current = true;
        router.replace(userData ? '/dashboard' : '/onboarding');
      } catch (error) {
        console.error('Error checking user:', error);
        redirectedRef.current = true;
        router.replace('/onboarding');
      }
    };

    const timer = setTimeout(checkAuth, 200);
    return () => clearTimeout(timer);
  }, [ready, authenticated, address, router]);

  // Show loading while checking auth / provisioning the wallet.
  if (!showLogin && !redirectedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading Zoopfi...</p>
        </div>
      </div>
    );
  }

  return <LoginPage />;
}
