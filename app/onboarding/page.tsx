'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { checkUsername, registerUser, getUserByAddress } from '../lib/api';

type Step = 'welcome' | 'username' | 'creating' | 'success';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { account, connected } = useWallet();

  const [step, setStep] = useState<Step>('welcome');
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  // Get wallet address
  useEffect(() => {
    if (authenticated && user) {
      const moveWallet = user.linkedAccounts?.find(
        (acc: any) => acc.chainType === 'aptos'
      ) as any;
      if (moveWallet?.address) {
        setWalletAddress(moveWallet.address);
      }
    } else if (connected && account?.address) {
      setWalletAddress(account.address.toString());
    }
  }, [authenticated, user, connected, account]);

  // Check if user already registered
  useEffect(() => {
    if (!walletAddress) return;

    const checkUser = async () => {
      try {
        const userData = await getUserByAddress(walletAddress);
        if (userData) {
          router.push('/dashboard');
        }
      } catch (error) {
        // User not found, continue with onboarding
      }
    };

    checkUser();
  }, [walletAddress, router]);

  // Redirect if not connected
  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.push('/');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [ready, authenticated, connected, router]);

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const result = await checkUsername(username);
        setIsAvailable(result.available);
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Handle username change
  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setError('');
  };

  // Create account
  const handleCreate = async () => {
    if (!username || username.length < 3 || !isAvailable) return;

    setStep('creating');
    try {
      const result = await registerUser(walletAddress, username);
      if (result.user) {
        setStep('success');
      } else {
        setError(result.error || 'Failed to create account');
        setStep('username');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setStep('username');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-accent)' }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-purple)' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="card p-8 text-center animate-fade-in-up">
            <div className="mb-6">
              <span className="text-6xl">👋</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Welcome to SuperPay!</h1>
            <p className="text-gray-400 mb-8">
              Let's set up your account. You'll choose a unique username that others can use to send you payments.
            </p>
            <button
              onClick={() => setStep('username')}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Username */}
        {step === 'username' && (
          <div className="card p-8 animate-fade-in-up">
            <button
              onClick={() => setStep('welcome')}
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-gray-400">← Back</span>
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">Choose your username</h1>
            <p className="text-gray-400 mb-6">
              This is how others will find and pay you
            </p>

            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-lg font-bold z-10">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="yourname"
                className="input text-lg"
                style={{ paddingLeft: '2.5rem' }}
                maxLength={20}
                autoFocus
              />
              {isChecking && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="spinner spinner-sm" />
                </div>
              )}
              {!isChecking && username.length >= 3 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isAvailable ? (
                    <span className="text-emerald-400 text-xl">✓</span>
                  ) : (
                    <span className="text-red-400 text-xl">✗</span>
                  )}
                </div>
              )}
            </div>

            {/* Username feedback */}
            <div className="mb-6">
              {username.length > 0 && username.length < 3 && (
                <p className="text-gray-500 text-sm">Username must be at least 3 characters</p>
              )}
              {username.length >= 3 && !isChecking && isAvailable === false && (
                <p className="text-red-400 text-sm">This username is already taken</p>
              )}
              {username.length >= 3 && !isChecking && isAvailable === true && (
                <p className="text-emerald-400 text-sm">Username is available!</p>
              )}
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Requirements */}
            <div className="p-4 rounded-xl bg-white/5 mb-6">
              <p className="text-gray-400 text-sm font-medium mb-2">Username requirements:</p>
              <ul className="space-y-1 text-sm">
                <li className={`flex items-center gap-2 ${username.length >= 3 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <span>{username.length >= 3 ? '✓' : '○'}</span>
                  <span>3-20 characters</span>
                </li>
                <li className={`flex items-center gap-2 ${/^[a-z0-9_]*$/.test(username) && username.length > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <span>{/^[a-z0-9_]*$/.test(username) && username.length > 0 ? '✓' : '○'}</span>
                  <span>Lowercase letters, numbers, underscores only</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleCreate}
              disabled={!username || username.length < 3 || !isAvailable}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Step 3: Creating */}
        {step === 'creating' && (
          <div className="card p-8 text-center animate-fade-in">
            <div className="spinner mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Creating your account...</h1>
            <p className="text-gray-400">Please wait while we set things up</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="card p-8 text-center animate-scale-in">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-5xl">🎉</span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">You're all set!</h1>
            <p className="text-gray-400 mb-2">
              Your username is
            </p>
            <p className="text-2xl font-bold text-emerald-400 mb-8">
              @{username}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
