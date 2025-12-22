'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import DashboardLayout from '../components/DashboardLayout';
import { ThemeTogglePill } from '../components/ThemeToggle';
import { getUserByAddress } from '../lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { user, authenticated, logout: privyLogout } = usePrivy();
  const { account, connected, disconnect } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [userData, setUserData] = useState<any>(null);
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
        if (result?.username) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <DashboardLayout username={userData?.username} walletAddress={walletAddress}>
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 p-4 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Profile Settings
            </h1>
            <p className="text-slate-500 dark:text-[#ad92c9] text-lg">
              Manage your personal information and account details.
            </p>
          </div>

          {/* Avatar Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267] flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <div 
                className="size-32 rounded-full border-4 border-slate-100 dark:border-[#191022] shadow-xl flex items-center justify-center text-5xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7f13ec 0%, #a855f7 100%)' }}
              >
                {userData?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <button 
                aria-label="Edit Avatar"
                className="absolute bottom-1 right-1 bg-[#7f13ec] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
              >
                <span className="text-sm">✏️</span>
              </button>
            </div>
            <div className="flex flex-col items-center md:items-start flex-1 gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Avatar</h3>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1">
                  This will be displayed on your profile and visible to other users.
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-[#7f13ec] hover:bg-[#5e0eb0] text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-[#7f13ec]/20">
                  Upload New
                </button>
                <button className="px-5 py-2.5 bg-transparent border border-slate-300 dark:border-[#4d3267] text-slate-700 dark:text-white font-medium rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </section>

          {/* Personal Information Form */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="text-[#7f13ec]">👤</span>
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Display Name */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Display Name</span>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-[#ad92c9] font-bold">@</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] pl-8 pr-4 py-3 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </label>

              {/* Email Address */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400"
                />
              </label>
            </div>

            {/* Connected Wallet */}
            <div className="flex flex-col gap-2 mb-6">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Connected Wallet</span>
              <div className="flex items-center gap-2 w-full rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 py-3">
                <div className="bg-gradient-to-r from-[#7f13ec] to-[#a855f7] size-6 rounded-full flex items-center justify-center">
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
                  className="text-[#7f13ec] hover:text-white hover:bg-[#7f13ec] p-1.5 rounded-lg transition-all"
                  title="Copy Address"
                >
                  <span className="text-lg">📋</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#ad92c9] ml-1">
                This wallet is used for all incoming transactions on Movement Network.
              </p>
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-100 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267]">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Member Since</p>
                <p className="text-xs text-slate-500 dark:text-[#ad92c9]">
                  {new Date(userData?.createdAt || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="text-[#7f13ec]">🎨</span>
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

          {/* Quick Preferences */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="text-[#7f13ec]">⚙️</span>
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
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7f13ec]/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#7f13ec]"></div>
                </label>
              </div>

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Email Notifications</span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Receive updates about your transactions.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7f13ec]/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#7f13ec]"></div>
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
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7f13ec]/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#7f13ec]"></div>
                </label>
              </div>

              {/* Public Profile Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Public Profile</span>
                  <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Allow others to find you by your handle.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7f13ec]/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#7f13ec]"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Support & Links Section */}
          <section className="bg-white dark:bg-[#261933] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-[#4d3267]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="text-[#7f13ec]">🔗</span>
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
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#7f13ec] transition-colors">Help Center</p>
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
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#7f13ec] transition-colors">Twitter</p>
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
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#7f13ec] transition-colors">Discord</p>
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
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#7f13ec] transition-colors">Documentation</p>
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
              className="px-8 py-3 bg-[#7f13ec] hover:bg-[#5e0eb0] text-white font-bold rounded-xl shadow-xl shadow-[#7f13ec]/30 transition-all hover:scale-[1.02]"
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
    </DashboardLayout>
  );
}
