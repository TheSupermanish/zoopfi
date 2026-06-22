'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '../lib/chain';
import { useUser } from '../lib/hooks';
import { checkUsername, registerUser, AccountType, BusinessCategory, BusinessInfo } from '../lib/api';
import { Hand, User, Building2, Check, X, PartyPopper, ShoppingBag, UtensilsCrossed, Wrench, Laptop, Stethoscope, Clapperboard, Package, LucideIcon } from 'lucide-react';

type Step = 'welcome' | 'account-type' | 'profile-info' | 'username' | 'creating' | 'success';

const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; Icon: LucideIcon }[] = [
  { value: 'retail', label: 'Retail', Icon: ShoppingBag },
  { value: 'food', label: 'Food & Beverage', Icon: UtensilsCrossed },
  { value: 'services', label: 'Services', Icon: Wrench },
  { value: 'technology', label: 'Technology', Icon: Laptop },
  { value: 'healthcare', label: 'Healthcare', Icon: Stethoscope },
  { value: 'entertainment', label: 'Entertainment', Icon: Clapperboard },
  { value: 'other', label: 'Other', Icon: Package },
];

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address: walletAddress, authenticated, ready, setupAccount } = useWallet();
  // Same shared profile cache AuthRouter reads — both must agree on "registered?"
  // or they ping-pong. (undefined = loading, null = no profile, object = profile)
  const { data: existingUser, isFetching: userFetching } = useUser();

  const [step, setStep] = useState<Step>('welcome');
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

  // A returning user who already has a profile shouldn't sit on onboarding.
  // Read from the shared cache (not a second fetch) and only act once it has
  // settled — acting on in-flight/stale data is what caused the redirect loop.
  useEffect(() => {
    if (!walletAddress || userFetching) return;
    if (existingUser) router.replace('/dashboard');
  }, [walletAddress, existingUser, userFetching, router]);

  // Redirect if not connected
  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      if (!authenticated) {
        router.push('/');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [ready, authenticated, router]);

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

      // Register first — this is the step that must succeed to enter the app.
      const result = await registerUser({
        walletAddress,
        username,
        accountType,
        displayName: displayName.trim(),
        businessInfo,
      });

      if (result.user) {
        // Seed the shared profile cache immediately so AuthRouter sees the new
        // profile the moment we land on /dashboard — otherwise its stale `null`
        // would bounce the freshly-registered user straight back to onboarding.
        queryClient.setQueryData(['user', walletAddress], result.user);
        // Fund the embedded wallet (friendbot) + add the USDC trustline in the
        // background. Testnet provisioning can be slow, so we never block entry
        // on it — the user lands in the app and it finishes behind the scenes.
        void setupAccount().catch(() => {});
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
            <div className="mb-6 flex justify-center">
              <Hand className="w-16 h-16 mx-auto text-[#7f13ec] dark:text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Welcome to Zoopfi!</h1>
            <p className="text-slate-500 dark:text-gray-400 mb-8">
              Private payments by username, powered by Stellar.
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
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-slate-500 dark:text-gray-400">← Back</span>
            </button>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">How will you use Zoopfi?</h1>
            <p className="text-slate-500 dark:text-gray-400 mb-6">
              Choose the account type that fits you best
            </p>

            <div className="space-y-4 mb-8">
              {/* Personal Account Option */}
              <button
                onClick={() => setAccountType('personal')}
                className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                  accountType === 'personal'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-slate-700 dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal</h3>
                      {accountType === 'personal' && (
                        <Check className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
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
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-slate-700 dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business</h3>
                      {accountType === 'business' && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
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
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-slate-500 dark:text-gray-400">← Back</span>
            </button>

            {accountType === 'personal' ? (
              <>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">What's your name?</h1>
                <p className="text-slate-500 dark:text-gray-400 mb-6">
                  This is how you'll appear to others
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
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
                    <Building2 className="w-6 h-6 text-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Business Details</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Tell us about your business</p>
                  </div>
                </div>

                {/* Business Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
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
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
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
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
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
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
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
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <cat.Icon className="w-5 h-5" />
                          <span className="text-sm font-medium text-slate-700 dark:text-white">{cat.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description (optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
                    Description <span className="text-slate-400 dark:text-gray-500">(optional)</span>
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
              className="mb-6 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-slate-500 dark:text-gray-400">← Back</span>
            </button>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose your username</h1>
            <p className="text-slate-500 dark:text-gray-400 mb-6">
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
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                </div>
              )}
            </div>

            {/* Username feedback */}
            <div className="mb-6">
              {username.length > 0 && username.length < 3 && (
                <p className="text-slate-400 dark:text-gray-500 text-sm">Username must be at least 3 characters</p>
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
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 mb-6">
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-2">Username requirements:</p>
              <ul className="space-y-1 text-sm">
                <li className={`flex items-center gap-2 ${username.length >= 3 ? 'text-emerald-400' : 'text-slate-400 dark:text-gray-500'}`}>
                  <span>{username.length >= 3 ? '✓' : '○'}</span>
                  <span>3-20 characters</span>
                </li>
                <li className={`flex items-center gap-2 ${/^[a-z0-9_]*$/.test(username) && username.length > 0 ? 'text-emerald-400' : 'text-slate-400 dark:text-gray-500'}`}>
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Creating your {accountType === 'business' ? 'business ' : ''}account...
            </h1>
            <p className="text-slate-500 dark:text-gray-400">Please wait while we set things up</p>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 'success' && (
          <div className="card p-8 text-center animate-scale-in">
            <div className="mb-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                accountType === 'business' ? 'bg-purple-500/20' : 'bg-emerald-500/20'
              }`}>
                {accountType === 'business'
                  ? <Building2 className="w-12 h-12 text-purple-400" />
                  : <PartyPopper className="w-12 h-12 text-emerald-400" />}
              </div>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              {accountType === 'business' ? 'Your business is ready!' : "You're all set!"}
            </h1>
            <p className="text-slate-500 dark:text-gray-400 mb-2">
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
              <p className="text-slate-400 dark:text-gray-500 text-sm mb-6">
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
