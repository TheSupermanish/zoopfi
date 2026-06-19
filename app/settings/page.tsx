'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/app/lib/chain';
import { useUser } from '@/app/lib/hooks';
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';
import { convertToBusiness, BusinessCategory, BusinessInfo } from '../lib/api';
import { toast } from 'sonner';
import {
  Building2,
  User,
  Pencil,
  Copy,
  Rocket,
  Check,
  Settings,
  Share2,
  HelpCircle,
  Twitter,
  MessageCircle,
  BookOpen,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

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
  const queryClient = useQueryClient();
  const { ready, address: walletAddress, authenticated, isConnected, logout } = useWallet();

  const { data: userData } = useUser();
  const isLoading = userData === undefined;
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

  // Initialize the editable display name from the cached user
  useEffect(() => {
    if (userData?.displayName) {
      setDisplayName(userData.displayName);
    } else if (userData?.username) {
      setDisplayName(userData.username);
    }
  }, [userData?.displayName, userData?.username]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) {
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
      await logout();
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
        queryClient.invalidateQueries({ queryKey: ['user'] });
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
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageShell variant="wide">
        <PageHeader
          title={isBusiness ? 'Business Settings' : 'Profile & Settings'}
          subtitle={isBusiness ? 'Manage your business account and preferences.' : 'Manage your account and preferences.'}
          icon={Settings}
          action={
            isBusiness ? (
              <span className="rounded-full border border-[#9b3bff]/20 bg-[#9b3bff]/10 px-3 py-1 text-xs font-bold text-[#c89bff]">
                BUSINESS
              </span>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-4">
          {/* Profile Section */}
          <Card as="section">
            <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-white">
              <span className="text-[#c89bff]">
                {isBusiness ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </span>
              {isBusiness ? 'Business Profile' : 'Profile'}
            </h3>

            {/* Avatar Row */}
            <div className="mb-8 flex items-center gap-6 border-b border-white/10 pb-8">
              <div className="relative">
                {userData?.avatarUrl ? (
                  <img
                    src={userData.avatarUrl}
                    alt={userData.displayName || 'Profile'}
                    className="size-24 rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] text-4xl font-bold text-white">
                    {userData?.displayName?.charAt(0).toUpperCase() || userData?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <button
                  aria-label="Edit Avatar"
                  className="absolute -bottom-2 -right-2 cursor-pointer rounded-full bg-[#9b3bff] p-2 text-white shadow-lg transition-transform hover:scale-110"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-white">
                  {isBusiness ? userData?.displayName : `@${userData?.username || 'username'}`}
                </p>
                {isBusiness && userData?.businessInfo && (
                  <p className="mt-0.5 text-sm text-[#c89bff]">
                    {BUSINESS_CATEGORIES.find(c => c.value === userData.businessInfo?.category)?.icon} {BUSINESS_CATEGORIES.find(c => c.value === userData.businessInfo?.category)?.label}
                  </p>
                )}
                <p className="mt-1 text-sm text-purple-200/60">
                  {isBusiness
                    ? `@${userData?.username} • Owned by ${userData?.businessInfo?.ownerFirstName} ${userData?.businessInfo?.ownerLastName}`
                    : `Member since ${new Date(userData?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                  }
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-xl bg-[#9b3bff] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#8a2af0]">
                    {isBusiness ? 'Upload Logo' : 'Upload Photo'}
                  </button>
                  <button className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5">
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Display Name / Business Name */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white">
                  {isBusiness ? 'Business Name' : 'Display Name'}
                </span>
                <div className="relative">
                  {!isBusiness && <span className="absolute left-4 top-3.5 font-bold text-purple-200/60">@</span>}
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isBusiness ? 'Your Business Name' : 'username'}
                    className={`w-full rounded-xl border border-white/10 bg-black/30 py-3 pr-4 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60 ${
                      isBusiness ? 'pl-4' : 'pl-8'
                    }`}
                  />
                </div>
              </label>

              {/* Email Address */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white">
                  {isBusiness ? 'Business Email' : 'Email Address'}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                />
              </label>
            </div>

            {/* Business-specific fields */}
            {isBusiness && userData?.businessInfo && (
              <div className="mb-6 grid grid-cols-1 gap-6 border-t border-white/10 pt-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-white">Owner First Name</span>
                  <input
                    type="text"
                    value={userData.businessInfo.ownerFirstName}
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-purple-200/60"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-white">Owner Last Name</span>
                  <input
                    type="text"
                    value={userData.businessInfo.ownerLastName}
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-purple-200/60"
                  />
                </label>
                {userData.businessInfo.description && (
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-semibold text-white">Business Description</span>
                    <textarea
                      value={userData.businessInfo.description}
                      readOnly
                      className="min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-purple-200/60"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Connected Wallet */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white">Connected Wallet</span>
              <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-r from-[#9b3bff] to-[#6a10c7]">
                  <span className="text-xs font-bold text-white">M</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={walletAddress}
                  className="flex-1 truncate border-none bg-transparent p-0 font-mono text-sm text-purple-200/60 focus:ring-0"
                />
                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  className="rounded-lg p-1.5 text-[#c89bff] transition-all hover:bg-[#9b3bff]/20 hover:text-white"
                  title="Copy Address"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="ml-1 text-xs text-purple-200/60">
                This wallet is used for all {isBusiness ? 'business ' : ''}transactions on Stellar Network.
              </p>
            </div>
          </Card>

          {/* Convert to Business Section (Personal accounts only) */}
          {!isBusiness && (
            <Card as="section">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                <span className="text-[#c89bff]"><Building2 className="h-5 w-5" /></span>
                Upgrade to Business
              </h3>

              <p className="mb-6 text-sm text-purple-200/60">
                Convert your personal account to a business account to unlock features like invoicing,
                payment analytics, and a professional storefront for your customers.
              </p>

              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-purple-200/60">
                  <span className="text-[#c89bff]"><Check className="h-4 w-4" /></span>
                  <span>Professional profile</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-200/60">
                  <span className="text-[#c89bff]"><Check className="h-4 w-4" /></span>
                  <span>Payment analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-200/60">
                  <span className="text-[#c89bff]"><Check className="h-4 w-4" /></span>
                  <span>Customer management</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-200/60">
                  <span className="text-[#c89bff]"><Check className="h-4 w-4" /></span>
                  <span>Invoice generation</span>
                </div>
              </div>

              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
              >
                <Rocket className="h-5 w-5" />
                Convert to Business Account
              </button>
            </Card>
          )}

          {/* Preferences Section */}
          <Card as="section">
            <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-white">
              <span className="text-[#c89bff]"><Settings className="h-5 w-5" /></span>
              Quick Preferences
            </h3>

            <div className="space-y-6">
              {/* Two-Factor Auth Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">Two-Factor Authentication</span>
                  <span className="text-sm text-purple-200/60">Secure your account with 2FA on login.</span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-7 w-14 rounded-full bg-white/10 after:absolute after:left-[4px] after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#9b3bff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#9b3bff]/20"></div>
                </label>
              </div>

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">Email Notifications</span>
                  <span className="text-sm text-purple-200/60">
                    {isBusiness ? 'Receive updates about payments and customers.' : 'Receive updates about your transactions.'}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-7 w-14 rounded-full bg-white/10 after:absolute after:left-[4px] after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#9b3bff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#9b3bff]/20"></div>
                </label>
              </div>

              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">Push Notifications</span>
                  <span className="text-sm text-purple-200/60">Get instant alerts for payments.</span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-7 w-14 rounded-full bg-white/10 after:absolute after:left-[4px] after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#9b3bff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#9b3bff]/20"></div>
                </label>
              </div>

              {/* Public Profile Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {isBusiness ? 'Public Business' : 'Public Profile'}
                  </span>
                  <span className="text-sm text-purple-200/60">
                    {isBusiness ? 'Allow customers to find your business by handle.' : 'Allow others to find you by your handle.'}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-7 w-14 rounded-full bg-white/10 after:absolute after:left-[4px] after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#9b3bff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#9b3bff]/20"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* Support & Links Section */}
          <Card as="section">
            <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-white">
              <span className="text-[#c89bff]"><Share2 className="h-5 w-5" /></span>
              Links & Support
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-[#9b3bff]/30"
              >
                <HelpCircle className="h-6 w-6 text-purple-200/60" />
                <div className="flex-1">
                  <p className="font-semibold text-white transition-colors group-hover:text-[#c89bff]">Help Center</p>
                  <p className="text-xs text-purple-200/60">Get support and FAQs</p>
                </div>
                <span className="text-purple-200/60">↗</span>
              </a>

              <a
                href="https://twitter.com/StellarOrg"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-[#9b3bff]/30"
              >
                <Twitter className="h-6 w-6 text-purple-200/60" />
                <div className="flex-1">
                  <p className="font-semibold text-white transition-colors group-hover:text-[#c89bff]">Twitter</p>
                  <p className="text-xs text-purple-200/60">Follow for updates</p>
                </div>
                <span className="text-purple-200/60">↗</span>
              </a>

              <a
                href="https://discord.gg/stellardev"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-[#9b3bff]/30"
              >
                <MessageCircle className="h-6 w-6 text-purple-200/60" />
                <div className="flex-1">
                  <p className="font-semibold text-white transition-colors group-hover:text-[#c89bff]">Discord</p>
                  <p className="text-xs text-purple-200/60">Join the community</p>
                </div>
                <span className="text-purple-200/60">↗</span>
              </a>

              <a
                href="https://developers.stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-[#9b3bff]/30"
              >
                <BookOpen className="h-6 w-6 text-purple-200/60" />
                <div className="flex-1">
                  <p className="font-semibold text-white transition-colors group-hover:text-[#c89bff]">Documentation</p>
                  <p className="text-xs text-purple-200/60">Learn about Stellar</p>
                </div>
                <span className="text-purple-200/60">↗</span>
              </a>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card as="section">
            <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-rose-300">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h3>

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-white">Sign Out</p>
                <p className="text-sm text-purple-200/60">
                  You'll need to reconnect your wallet to access Zoopfi again.
                </p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-600"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse justify-end gap-4 sm:flex-row">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-white/10 bg-transparent px-8 py-3 font-bold text-white transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-8 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
            >
              Save Changes
            </button>
          </div>

          {/* Version */}
          <p className="pb-2 text-center text-xs text-purple-200/40">
            Zoopfi v1.0.0 • Built on Stellar Network
          </p>
        </div>
      </PageShell>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface animate-scale-in w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
                <LogOut className="h-7 w-7 text-rose-300" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Sign Out?</h3>
              <p className="text-sm text-purple-200/60">
                You'll need to reconnect your wallet to access Zoopfi again.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-bold text-white transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white transition-colors hover:bg-rose-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Business Modal */}
      {showConvertModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface animate-scale-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9b3bff]/15 text-[#c89bff]">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Convert to Business</h3>
                <p className="text-sm text-purple-200/60">Set up your business profile</p>
              </div>
            </div>

            <div className="mb-6 space-y-4">
              {/* Business Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Starbucks"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                />
              </div>

              {/* Owner Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Owner First Name *
                  </label>
                  <input
                    type="text"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Owner Last Name *
                  </label>
                  <input
                    type="text"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                  />
                </div>
              </div>

              {/* Business Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Business Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setBusinessCategory(cat.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        businessCategory === cat.value
                          ? 'border-[#9b3bff] bg-[#9b3bff]/10'
                          : 'border-white/10 bg-black/30 hover:border-[#9b3bff]/50'
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

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Description <span className="font-normal text-purple-200/40">(optional)</span>
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Tell customers what you do..."
                  className="min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={isConverting}
                className="flex-1 rounded-xl border border-white/10 py-3 font-bold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToBusiness}
                disabled={!isConversionValid() || isConverting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:cursor-not-allowed disabled:opacity-50"
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
    </AppShell>
  );
}
