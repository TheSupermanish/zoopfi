'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { checkUsername, registerUser, getUserByAddress, AccountType, BusinessCategory, BusinessInfo } from '../lib/api';

type Step = 'welcome' | 'account-type' | 'profile-info' | 'username' | 'creating' | 'success';

const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; icon: string }[] = [
  { value: 'retail', label: 'Retail', icon: '🛍️' },
  { value: 'food', label: 'Food & Beverage', icon: '🍕' },
  { value: 'services', label: 'Services', icon: '🔧' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { account, connected } = useWallet();

  const [step, setStep] = useState<Step>('welcome');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');

  // Account type
  const [accountType, setAccountType] = useState<AccountType>('personal');

  // Profile info
  const [displayName, setDisplayName] = useState('');
  
  // Business info
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>('retail');
  const [businessDescription, setBusinessDescription] = useState('');

  // Username
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

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

  // Validate profile info
  const isProfileInfoValid = () => {
    if (!displayName.trim()) return false;
    if (accountType === 'business') {
      return ownerFirstName.trim() && ownerLastName.trim();
    }
    return true;
  };

  // Create account
  const handleCreate = async () => {
    if (!username || username.length < 3 || !isAvailable) return;

    setStep('creating');
    try {
      const businessInfo: BusinessInfo | undefined = accountType === 'business' ? {
        ownerFirstName: ownerFirstName.trim(),
        ownerLastName: ownerLastName.trim(),
        category: businessCategory,
        description: businessDescription.trim() || undefined,
      } : undefined;

      const result = await registerUser({
        walletAddress,
        username,
        accountType,
        displayName: displayName.trim(),
        businessInfo,
      });

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

  // Go back to previous step
  const goBack = () => {
    switch (step) {
      case 'account-type':
        setStep('welcome');
        break;
      case 'profile-info':
        setStep('account-type');
        break;
      case 'username':
        setStep('profile-info');
        break;
      default:
        break;
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
              The fastest way to send and receive payments on Movement Network.
            </p>
            <button
              onClick={() => setStep('account-type')}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Account Type Selection */}
        {step === 'account-type' && (
          <div className="card p-8 animate-fade-in-up">
            <button
              onClick={goBack}
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-gray-400">← Back</span>
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">How will you use SuperPay?</h1>
            <p className="text-gray-400 mb-6">
              Choose the account type that fits you best
            </p>

            <div className="space-y-4 mb-8">
              {/* Personal Account Option */}
              <button
                onClick={() => setAccountType('personal')}
                className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                  accountType === 'personal'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Personal</h3>
                      {accountType === 'personal' && (
                        <span className="text-emerald-400 text-lg">✓</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Send money to friends, split bills, and manage personal payments
                    </p>
                  </div>
                </div>
              </button>

              {/* Business Account Option */}
              <button
                onClick={() => setAccountType('business')}
                className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                  accountType === 'business'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Business</h3>
                      {accountType === 'business' && (
                        <span className="text-purple-400 text-lg">✓</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Accept payments from customers, generate invoices, and track revenue
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('profile-info')}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Profile Info */}
        {step === 'profile-info' && (
          <div className="card p-8 animate-fade-in-up">
            <button
              onClick={goBack}
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-gray-400">← Back</span>
            </button>

            {accountType === 'personal' ? (
              <>
                <h1 className="text-2xl font-bold text-white mb-2">What's your name?</h1>
                <p className="text-gray-400 mb-6">
                  This is how you'll appear to others
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    className="input text-lg"
                    maxLength={100}
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Business Details</h1>
                    <p className="text-gray-400 text-sm">Tell us about your business</p>
                  </div>
                </div>

                {/* Business Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Starbucks"
                    className="input"
                    maxLength={100}
                    autoFocus
                  />
                </div>

                {/* Owner Name */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Owner First Name *
                    </label>
                    <input
                      type="text"
                      value={ownerFirstName}
                      onChange={(e) => setOwnerFirstName(e.target.value)}
                      placeholder="John"
                      className="input"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Owner Last Name *
                    </label>
                    <input
                      type="text"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                      placeholder="Doe"
                      className="input"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Business Category */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Business Category *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setBusinessCategory(cat.value)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          businessCategory === cat.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span className="text-sm font-medium text-white">{cat.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description (optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Tell customers what you do..."
                    className="input min-h-[80px] resize-none"
                    maxLength={500}
                  />
                </div>
              </>
            )}

            <button
              onClick={() => setStep('username')}
              disabled={!isProfileInfoValid()}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Username */}
        {step === 'username' && (
          <div className="card p-8 animate-fade-in-up">
            <button
              onClick={goBack}
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-gray-400">← Back</span>
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">Choose your username</h1>
            <p className="text-gray-400 mb-6">
              {accountType === 'business' 
                ? 'This is how customers will find and pay your business'
                : 'This is how others will find and pay you'}
            </p>

            <div className="relative mb-6">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold z-10 ${
                accountType === 'business' ? 'text-purple-400' : 'text-emerald-400'
              }`}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder={accountType === 'business' ? 'starbucks' : 'yourname'}
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
              Create {accountType === 'business' ? 'Business ' : ''}Account
            </button>
          </div>
        )}

        {/* Step 5: Creating */}
        {step === 'creating' && (
          <div className="card p-8 text-center animate-fade-in">
            <div className="spinner mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Creating your {accountType === 'business' ? 'business ' : ''}account...
            </h1>
            <p className="text-gray-400">Please wait while we set things up</p>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 'success' && (
          <div className="card p-8 text-center animate-scale-in">
            <div className="mb-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                accountType === 'business' ? 'bg-purple-500/20' : 'bg-emerald-500/20'
              }`}>
                <span className="text-5xl">{accountType === 'business' ? '🏢' : '🎉'}</span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">
              {accountType === 'business' ? 'Your business is ready!' : "You're all set!"}
            </h1>
            <p className="text-gray-400 mb-2">
              {accountType === 'business' 
                ? `Welcome, ${displayName}!`
                : 'Your username is'}
            </p>
            <p className={`text-2xl font-bold mb-8 ${
              accountType === 'business' ? 'text-purple-400' : 'text-emerald-400'
            }`}>
              @{username}
            </p>
            {accountType === 'business' && (
              <p className="text-gray-500 text-sm mb-6">
                Start accepting payments from your customers right away
              </p>
            )}
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
