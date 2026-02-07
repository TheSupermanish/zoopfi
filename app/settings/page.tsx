'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import DashboardLayout from '../components/DashboardLayout';
import { ThemeTogglePill } from '../components/ThemeToggle';
import { getUserByAddress, convertToBusiness, UserData, BusinessCategory, BusinessInfo } from '../lib/api';
import { toast } from 'sonner';

const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; icon: string }[] = [
  { value: 'retail', label: 'Retail', icon: '🛍️' },
  { value: 'food', label: 'Food & Beverage', icon: '🍕' },
  { value: 'services', label: 'Services', icon: '🔧' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, authenticated, logout: privyLogout } = usePrivy();
  const { account, connected, disconnect } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Preferences state
  const [twoFactor, setTwoFactor] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Business conversion state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>('retail');
  const [businessDescription, setBusinessDescription] = useState('');

  const isBusiness = userData?.accountType === 'business';

  // Get wallet address
  useEffect(() => {
    if (authenticated && user) {
      const moveWallet = user.linkedAccounts?.find(
        (acc: any) => acc.chainType === 'aptos'
      ) as any;
      if (moveWallet?.address) {
        setWalletAddress(moveWallet.address);
      }
      // Get email from Privy user
      const emailAccount = user.linkedAccounts?.find(
        (acc: any) => acc.type === 'email'
      ) as any;
      if (emailAccount?.address) {
        setEmail(emailAccount.address);
      }
    } else if (connected && account?.address) {
      setWalletAddress(account.address.toString());
    }
  }, [authenticated, user, connected, account]);

  // Fetch user data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getUserByAddress(walletAddress);
        setUserData(result);
        if (result?.displayName) {
          setDisplayName(result.displayName);
        } else if (result?.username) {
          setDisplayName(result.username);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      if (authenticated) {
        await privyLogout();
      }
      if (connected) {
        await disconnect();
      }
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Handle save
  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  // Validate business conversion form
  const isConversionValid = () => {
    return businessName.trim() && ownerFirstName.trim() && ownerLastName.trim();
  };

  // Handle business conversion
  const handleConvertToBusiness = async () => {
    if (!isConversionValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsConverting(true);
    try {
      const businessInfo: BusinessInfo = {
        ownerFirstName: ownerFirstName.trim(),
        ownerLastName: ownerLastName.trim(),
        category: businessCategory,
        description: businessDescription.trim() || undefined,
      };

      const result = await convertToBusiness(walletAddress, businessInfo, businessName.trim());

      if (result.user) {
        setUserData(result.user);
        toast.success('Successfully converted to business account!');
        setShowConvertModal(false);
        // Reset form
        setBusinessName('');
        setOwnerFirstName('');
        setOwnerLastName('');
        setBusinessCategory('retail');
        setBusinessDescription('');
      } else {
        toast.error(result.error || 'Failed to convert account');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert account');
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <DashboardLayout 
      username={userData?.username} 
      walletAddress={walletAddress}
      accountType={userData?.accountType}
      displayName={userData?.displayName}
      avatarUrl={userData?.avatarUrl}
    >
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 p-4 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {isBusiness ? 'Business Settings' : 'Profile & Settings'}
            </h1>
              {isBusiness && (
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold">
                  BUSINESS
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-[#ad92c9] text-lg">
              {isBusiness ? 'Manage your business account and preferences.' : 'Manage your account and preferences.'}
            </p>
          </div>

          {/* Profile Section */}
          <section className={`rounded-3xl p-6 md:p-8 shadow-sm border ${
            isBusiness 
              ? 'bg-purple-50 dark:bg-purple-500/5 border-purple-200 dark:border-purple-500/20' 
              : 'bg-white dark:bg-[#261933] border-slate-100 dark:border-[#4d3267]'
          }`}>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className={isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'}>
                {isBusiness ? '🏢' : '👤'}
              </span>
              {isBusiness ? 'Business Profile' : 'Profile'}
            </h3>

            {/* Avatar Row */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-200 dark:border-[#4d3267]">
              <div className="relative">
                {userData?.avatarUrl ? (
                  <img 
                    src={userData.avatarUrl} 
                    alt={userData.displayName || 'Profile'} 
                    className="size-24 rounded-2xl border-4 border-slate-100 dark:border-[#191022] shadow-lg object-cover"
                  />
                ) : (
                <div 
                  className="size-24 rounded-2xl border-4 border-slate-100 dark:border-[#191022] shadow-lg flex items-center justify-center text-4xl font-bold text-white"
                    style={{ background: isBusiness 
                      ? 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)' 
                      : 'linear-gradient(135deg, #7f13ec 0%, #a855f7 100%)' 
                    }}
                >
                    {userData?.displayName?.charAt(0).toUpperCase() || userData?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                )}
                <button 
                  aria-label="Edit Avatar"
                  className={`absolute -bottom-2 -right-2 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer ${
                    isBusiness ? 'bg-purple-600' : 'bg-[#7f13ec]'
                  }`}
                >
                  <span className="text-sm">✏️</span>
                </button>
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {isBusiness ? userData?.displayName : `@${userData?.username || 'username'}`}
                </p>
                {isBusiness && userData?.businessInfo && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-0.5">
                    {BUSINESS_CATEGORIES.find(c => c.value === userData.businessInfo?.category)?.icon} {BUSINESS_CATEGORIES.find(c => c.value === userData.businessInfo?.category)?.label}
                  </p>
                )}
                <p className="text-sm text-slate-500 dark:text-[#ad92c9] mt-1">
                  {isBusiness 
                    ? `@${userData?.username} • Owned by ${userData?.businessInfo?.ownerFirstName} ${userData?.businessInfo?.ownerLastName}`
                    : `Member since ${new Date(userData?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                  }
                </p>
                <div className="flex gap-2 mt-3">
                  <button className={`px-4 py-2 text-white font-bold rounded-xl text-sm transition-colors ${
                    isBusiness ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#7f13ec] hover:bg-[#5e0eb0]'
                  }`}>
                    {isBusiness ? 'Upload Logo' : 'Upload Photo'}
                  </button>
                  <button className="px-4 py-2 bg-transparent border border-slate-300 dark:border-[#4d3267] text-slate-700 dark:text-white font-medium rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Display Name / Business Name */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isBusiness ? 'Business Name' : 'Display Name'}
                </span>
                <div className="relative">
                  {!isBusiness && <span className="absolute left-4 top-3.5 text-[#ad92c9] font-bold">@</span>}
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isBusiness ? 'Your Business Name' : 'username'}
                    className={`w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] pr-4 py-3 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400 ${
                      isBusiness ? 'pl-4' : 'pl-8'
                    }`}
                  />
                </div>
              </label>

              {/* Email Address */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isBusiness ? 'Business Email' : 'Email Address'}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400"
                />
              </label>
            </div>

            {/* Business-specific fields */}
            {isBusiness && userData?.businessInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-6 border-t border-purple-200 dark:border-purple-500/20">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Owner First Name</span>
                  <input
                    type="text"
                    value={userData.businessInfo.ownerFirstName}
                    readOnly
                    className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-100 dark:bg-[#1a1122]/50 px-4 py-3 text-slate-600 dark:text-slate-400"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Owner Last Name</span>
                  <input
                    type="text"
                    value={userData.businessInfo.ownerLastName}
                    readOnly
                    className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-100 dark:bg-[#1a1122]/50 px-4 py-3 text-slate-600 dark:text-slate-400"
                  />
                </label>
                {userData.businessInfo.description && (
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Business Description</span>
                    <textarea
                      value={userData.businessInfo.description}
                      readOnly
                      className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-100 dark:bg-[#1a1122]/50 px-4 py-3 text-slate-600 dark:text-slate-400 min-h-[80px] resize-none"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Connected Wallet */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Connected Wallet</span>
              <div className="flex items-center gap-2 w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3">
                <div className={`size-6 rounded-full flex items-center justify-center ${
                  isBusiness 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-400' 
                    : 'bg-gradient-to-r from-[#7f13ec] to-[#a855f7]'
                }`}>
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={walletAddress}
                  className="flex-1 bg-transparent border-none p-0 text-slate-600 dark:text-[#ad92c9] focus:ring-0 font-mono text-sm truncate"
                />
                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  className={`hover:text-white p-1.5 rounded-lg transition-all ${
                    isBusiness ? 'text-purple-600 hover:bg-purple-600' : 'text-[#7f13ec] hover:bg-[#7f13ec]'
                  }`}
                  title="Copy Address"
                >
                  <span className="text-lg">📋</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#ad92c9] ml-1">
                This wallet is used for all {isBusiness ? 'business ' : ''}transactions on Movement Network.
              </p>
            </div>
          </section>

          {/* Convert to Business Section (Personal accounts only) */}
          {!isBusiness && (
            <section className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/5 dark:to-violet-500/5 rounded-3xl p-6 md:p-8 border border-purple-200 dark:border-purple-500/20">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="text-purple-600">🏢</span>
                Upgrade to Business
              </h3>
              
              <p className="text-slate-600 dark:text-[#ad92c9] mb-6">
                Convert your personal account to a business account to unlock features like invoicing, 
                payment analytics, and a professional storefront for your customers.
              </p>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#ad92c9]">
                  <span className="text-purple-500">✓</span>
                  <span>Professional profile</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#ad92c9]">
                  <span className="text-purple-500">✓</span>
                  <span>Payment analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#ad92c9]">
                  <span className="text-purple-500">✓</span>
                  <span>Customer management</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#ad92c9]">
                  <span className="text-purple-500">✓</span>
                  <span>Invoice generation</span>
                </div>
              </div>

              <button
                onClick={() => setShowConvertModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <span>🚀</span>
                Convert to Business Account
              </button>
            </section>
          )}

          {/* Appearance Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className={isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'}>🎨</span>
              Appearance
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 dark:text-white">Theme</span>
                <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Choose your preferred appearance.</span>
              </div>
              <ThemeTogglePill />
            </div>
          </section>

          {/* Preferences Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className={isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'}>⚙️</span>
              Quick Preferences
            </h3>
            
            <div className="space-y-6">
              {/* Two-Factor Auth Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Two-Factor Authentication</span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Secure your account with 2FA on login.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                    isBusiness 
                      ? 'peer-focus:ring-purple-600/20 peer-checked:bg-purple-600' 
                      : 'peer-focus:ring-[#7f13ec]/20 peer-checked:bg-[#7f13ec]'
                  }`}></div>
                </label>
              </div>

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Email Notifications</span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">
                    {isBusiness ? 'Receive updates about payments and customers.' : 'Receive updates about your transactions.'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                    isBusiness 
                      ? 'peer-focus:ring-purple-600/20 peer-checked:bg-purple-600' 
                      : 'peer-focus:ring-[#7f13ec]/20 peer-checked:bg-[#7f13ec]'
                  }`}></div>
                </label>
              </div>

              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Push Notifications</span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Get instant alerts for payments.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                    isBusiness 
                      ? 'peer-focus:ring-purple-600/20 peer-checked:bg-purple-600' 
                      : 'peer-focus:ring-[#7f13ec]/20 peer-checked:bg-[#7f13ec]'
                  }`}></div>
                </label>
              </div>

              {/* Public Profile Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {isBusiness ? 'Public Business' : 'Public Profile'}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">
                    {isBusiness ? 'Allow customers to find your business by handle.' : 'Allow others to find you by your handle.'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                    isBusiness 
                      ? 'peer-focus:ring-purple-600/20 peer-checked:bg-purple-600' 
                      : 'peer-focus:ring-[#7f13ec]/20 peer-checked:bg-[#7f13ec]'
                  }`}></div>
                </label>
              </div>
            </div>
          </section>

          {/* Support & Links Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className={isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'}>🔗</span>
              Links & Support
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://movement.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/30 transition-colors group"
              >
                <span className="text-2xl">❓</span>
                <div className="flex-1">
                  <p className={`font-bold text-slate-900 dark:text-white transition-colors ${
                    isBusiness ? 'group-hover:text-purple-600' : 'group-hover:text-[#7f13ec]'
                  }`}>Help Center</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Get support and FAQs</p>
                </div>
                <span className="text-slate-400 dark:text-[#ad92c9]">↗</span>
              </a>

              <a
                href="https://twitter.com/movementlabsxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/30 transition-colors group"
              >
                <span className="text-2xl">🐦</span>
                <div className="flex-1">
                  <p className={`font-bold text-slate-900 dark:text-white transition-colors ${
                    isBusiness ? 'group-hover:text-purple-600' : 'group-hover:text-[#7f13ec]'
                  }`}>Twitter</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Follow for updates</p>
                </div>
                <span className="text-slate-400 dark:text-[#ad92c9]">↗</span>
              </a>

              <a
                href="https://discord.gg/movement"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/30 transition-colors group"
              >
                <span className="text-2xl">💬</span>
                <div className="flex-1">
                  <p className={`font-bold text-slate-900 dark:text-white transition-colors ${
                    isBusiness ? 'group-hover:text-purple-600' : 'group-hover:text-[#7f13ec]'
                  }`}>Discord</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Join the community</p>
                </div>
                <span className="text-slate-400 dark:text-[#ad92c9]">↗</span>
              </a>

              <a
                href="https://docs.movementlabs.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/30 transition-colors group"
              >
                <span className="text-2xl">📚</span>
                <div className="flex-1">
                  <p className={`font-bold text-slate-900 dark:text-white transition-colors ${
                    isBusiness ? 'group-hover:text-purple-600' : 'group-hover:text-[#7f13ec]'
                  }`}>Documentation</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Learn about Movement</p>
                </div>
                <span className="text-slate-400 dark:text-[#ad92c9]">↗</span>
              </a>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-50 dark:bg-red-500/5 rounded-3xl p-6 md:p-8 border border-red-200 dark:border-red-500/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-600 dark:text-red-400">
              <span>⚠️</span>
              Danger Zone
            </h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Sign Out</p>
                <p className="text-sm text-slate-500 dark:text-[#ad92c9]">
                  You'll need to reconnect your wallet to access SuperPay again.
                </p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                <span>🚪</span>
                Sign Out
              </button>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-12">
            <button
              onClick={() => router.back()}
              className="px-8 py-3 bg-transparent border border-slate-300 dark:border-[#4d3267] text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-8 py-3 text-white font-bold rounded-xl shadow-xl transition-all hover:scale-[1.02] ${
                isBusiness 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30' 
                  : 'bg-[#7f13ec] hover:bg-[#5e0eb0] shadow-[#7f13ec]/30'
              }`}
            >
              Save Changes
            </button>
          </div>

          {/* Version */}
          <p className="text-center text-slate-400 dark:text-[#ad92c9]/40 text-xs pb-8">
            SuperPay v1.0.0 • Built on Movement Network
          </p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#261933] rounded-3xl p-6 max-w-sm w-full animate-scale-in border border-slate-200 dark:border-[#4d3267] shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-3xl">🚪</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign Out?</h3>
              <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                You'll need to reconnect your wallet to access SuperPay again.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-[#4d3267] text-slate-700 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Business Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#261933] rounded-3xl p-6 max-w-lg w-full animate-scale-in border border-purple-200 dark:border-purple-500/20 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Convert to Business</h3>
                <p className="text-sm text-slate-500 dark:text-[#ad92c9]">Set up your business profile</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Starbucks"
                  className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Owner Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Owner First Name *
                  </label>
                  <input
                    type="text"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Owner Last Name *
                  </label>
                  <input
                    type="text"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Business Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
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
                          : 'border-slate-200 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{cat.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Tell customers what you do..."
                  className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={isConverting}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-[#4d3267] text-slate-700 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToBusiness}
                disabled={!isConversionValid() || isConverting}
                className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <div className="spinner spinner-sm" />
                    Converting...
                  </>
                ) : (
                  'Convert to Business'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
