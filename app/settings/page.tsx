'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Navbar from '../components/Navbar';
import { getUserByAddress } from '../lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user, authenticated, logout: privyLogout } = usePrivy();
  const { account, connected, disconnect } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Fetch user data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getUserByAddress(walletAddress);
        setUserData(result);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected (only check once after initial load)
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="p-4 pt-safe flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl glass touch-target hover:bg-white/10 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </header>

      <div className="px-4 space-y-6">
        {/* Profile Card */}
        <div className="card p-6 text-center animate-fade-in-up">
          <div 
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-4"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            {userData?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <h2 className="text-2xl font-bold text-white">@{userData?.username}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Member since {new Date(userData?.createdAt || Date.now()).toLocaleDateString()}
          </p>
        </div>

        {/* Wallet Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm text-gray-400 mb-3 px-1">WALLET</h3>
          <div className="card-solid overflow-hidden">
            <button
              onClick={() => copyToClipboard(walletAddress)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📱</span>
                <div className="text-left">
                  <p className="text-white font-medium">Wallet Address</p>
                  <p className="text-gray-500 text-xs font-mono">
                    {walletAddress.slice(0, 12)}...{walletAddress.slice(-10)}
                  </p>
                </div>
              </div>
              <span className="text-gray-400">{copied ? '✅' : '📋'}</span>
            </button>
            <div className="h-px bg-white/5" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔗</span>
                <div className="text-left">
                  <p className="text-white font-medium">Network</p>
                  <p className="text-gray-500 text-sm">Movement Mainnet</p>
                </div>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-sm text-gray-400 mb-3 px-1">PREFERENCES</h3>
          <div className="card-solid overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div className="text-left">
                  <p className="text-white font-medium">Notifications</p>
                  <p className="text-gray-500 text-sm">Push notifications for payments</p>
                </div>
              </div>
              <div className="w-12 h-7 rounded-full bg-emerald-500 flex items-center p-1">
                <div className="w-5 h-5 rounded-full bg-white ml-auto" />
              </div>
            </button>
            <div className="h-px bg-white/5" />
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target">
              <div className="flex items-center gap-3">
                <span className="text-xl">🌙</span>
                <div className="text-left">
                  <p className="text-white font-medium">Dark Mode</p>
                  <p className="text-gray-500 text-sm">Always on</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm text-gray-400 mb-3 px-1">SECURITY</h3>
          <div className="card-solid overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔐</span>
                <div className="text-left">
                  <p className="text-white font-medium">Face ID / Touch ID</p>
                  <p className="text-gray-500 text-sm">Require for transactions</p>
                </div>
              </div>
              <div className="w-12 h-7 rounded-full bg-white/10 flex items-center p-1">
                <div className="w-5 h-5 rounded-full bg-gray-400" />
              </div>
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <h3 className="text-sm text-gray-400 mb-3 px-1">SUPPORT</h3>
          <div className="card-solid overflow-hidden">
            <a
              href="https://movement.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">❓</span>
                <p className="text-white font-medium">Help Center</p>
              </div>
              <span className="text-gray-400">↗</span>
            </a>
            <div className="h-px bg-white/5" />
            <a
              href="https://twitter.com/movementlabsxyz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors touch-target"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🐦</span>
                <p className="text-white font-medium">Twitter</p>
              </div>
              <span className="text-gray-400">↗</span>
            </a>
          </div>
        </div>

        {/* Logout */}
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors touch-target"
          >
            Sign Out
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-gray-600 text-xs py-4">
          SuperPay v1.0.0 • Built on Movement
        </p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="card p-6 max-w-sm w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-2">Sign Out?</h3>
            <p className="text-gray-400 text-sm mb-6">
              You'll need to reconnect your wallet to access SuperPay again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
