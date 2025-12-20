'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import LoginPage from './components/LoginPage';
import { getUserByAddress } from './lib/api';

export default function Home() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { account, connected } = useWallet();
  const [showLogin, setShowLogin] = useState(false);
  const checkingRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Wait for Privy to be ready
    if (!ready) return;
    
    // Prevent multiple checks
    if (checkingRef.current || redirectedRef.current) return;

    const checkAuth = async () => {
      checkingRef.current = true;
      
      let walletAddress = '';

      // Get wallet address from either provider
      if (authenticated && user) {
        const moveWallet = user.linkedAccounts?.find(
          (acc: any) => acc.chainType === 'aptos'
        ) as any;
        if (moveWallet?.address) {
          walletAddress = moveWallet.address;
        }
      } else if (connected && account?.address) {
        walletAddress = account.address.toString();
      }

      // No wallet connected - show login
      if (!walletAddress) {
        checkingRef.current = false;
        setShowLogin(true);
        return;
      }

      // Check if user is registered
      try {
        const userData = await getUserByAddress(walletAddress);
        redirectedRef.current = true;
        if (userData) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error checking user:', error);
        redirectedRef.current = true;
        router.replace('/onboarding');
      }
    };

    // Small delay to let wallet state settle
    const timer = setTimeout(checkAuth, 200);
    return () => clearTimeout(timer);
  }, [ready, authenticated, user, connected, account]);

  // Show loading while checking auth
  if (!showLogin && !redirectedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading SuperPay...</p>
        </div>
      </div>
    );
  }

  return <LoginPage />;
}
