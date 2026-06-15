'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Link from 'next/link';
import { getUserByUsername, getUserByAddress, getTransactions } from '../../lib/api';
import { toast } from 'sonner';

interface UserProfile {
  _id: string;
  username: string;
  walletAddress: string;
  createdAt: string;
}

interface Transaction {
  _id: string;
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  amount: number;
  txHash: string;
  status: string;
  timestamp: string;
  note?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [myWalletAddress, setMyWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    transactionCount: 0,
  });

  const username = params.username as string;
  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  // Get current user's wallet
  useEffect(() => {
    const setup = async () => {
      let address = '';
      
      if (authenticated && user) {
        const moveWallet = user.linkedAccounts?.find(
          (acc: any) => acc.chainType === 'aptos'
        ) as any;
        if (moveWallet?.address) {
          address = moveWallet.address;
        }
      } else if (connected && account?.address) {
        address = account.address.toString();
      }

      if (address) {
        setMyWalletAddress(address);
        const userData = await getUserByAddress(address);
        if (userData) {
          setCurrentUser(userData);
        }
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Fetch profile data
  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profileData = await getUserByUsername(username);
        if (profileData) {
          setProfile(profileData);
          
          // Fetch transactions for stats
          const txResult = await getTransactions(profileData.walletAddress, 100, 0);
          if (txResult?.transactions) {
            setTransactions(txResult.transactions);
            
            // Calculate stats
            let sent = 0;
            let received = 0;
            txResult.transactions.forEach((tx: Transaction) => {
              if (tx.senderAddress === profileData.walletAddress) {
                sent += tx.amount;
              } else {
                received += tx.amount;
              }
            });
            
            setStats({
              totalSent: sent,
              totalReceived: received,
              transactionCount: txResult.total || txResult.transactions.length,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get member duration
  const getMemberDuration = (date: string) => {
    const created = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#191022] p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-200 dark:bg-[#362348] flex items-center justify-center">
            <span className="text-5xl">👻</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">User Not Found</h1>
          <p className="text-slate-500 dark:text-[#ad92c9] mb-6">
            The user @{username} doesn't exist or hasn't registered yet.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7f13ec] text-white font-bold rounded-xl hover:bg-[#5e0eb0] transition-colors"
          >
            <span>←</span>
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#191022]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#1a1122]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#362348]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <h1 className="font-bold text-slate-900 dark:text-white">Profile</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-8">
          {/* Cover Gradient */}
          <div 
            className="h-48 rounded-3xl overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #7f13ec 0%, #a855f7 50%, #6366f1 100%)',
            }}
          >
            {/* Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
            {/* Decorative Elements */}
            <div className="absolute top-6 right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-6 left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-16 left-8">
            <div 
              className="w-32 h-32 rounded-3xl border-4 border-white dark:border-[#191022] shadow-2xl flex items-center justify-center text-5xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7f13ec 0%, #a855f7 100%)' }}
            >
              {getInitials(profile.username)}
            </div>
          </div>

          {/* Actions */}
          <div className="absolute -bottom-6 right-4 flex gap-2">
            {isOwnProfile ? (
              <Link
                href="/settings"
                className="px-5 py-2.5 bg-white dark:bg-[#261933] text-slate-900 dark:text-white font-bold rounded-xl text-sm shadow-lg hover:scale-105 transition-all border border-slate-200 dark:border-[#4d3267] flex items-center gap-2"
              >
                <span>✏️</span>
                Edit Profile
              </Link>
            ) : (
              <>
                <Link
                  href={`/send?to=${profile.username}`}
                  className="px-5 py-2.5 bg-[#7f13ec] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#7f13ec]/30 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span>💸</span>
                  Send Money
                </Link>
                <button
                  onClick={() => copyToClipboard(profile.walletAddress)}
                  className="px-5 py-2.5 bg-white dark:bg-[#261933] text-slate-900 dark:text-white font-bold rounded-xl text-sm shadow-lg hover:scale-105 transition-all border border-slate-200 dark:border-[#4d3267] flex items-center gap-2"
                >
                  <span>📋</span>
                  Copy Address
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-20 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              @{profile.username}
            </h2>
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold">
              ✓ Verified
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-[#ad92c9]">
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              Joined {formatDate(profile.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <span>⏱️</span>
              Member for {getMemberDuration(profile.createdAt)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#261933] rounded-2xl p-5 border border-slate-200 dark:border-[#4d3267] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📊</span>
              <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Transactions</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.transactionCount}</p>
          </div>
          
          <div className="bg-white dark:bg-[#261933] rounded-2xl p-5 border border-slate-200 dark:border-[#4d3267] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📤</span>
              <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Total Sent</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalSent.toFixed(2)}</p>
            <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">MOVE</p>
          </div>
          
          <div className="bg-white dark:bg-[#261933] rounded-2xl p-5 border border-slate-200 dark:border-[#4d3267] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📥</span>
              <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Total Received</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalReceived.toFixed(2)}</p>
            <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">MOVE</p>
          </div>
          
          <div className="bg-white dark:bg-[#261933] rounded-2xl p-5 border border-slate-200 dark:border-[#4d3267] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <span className="text-sm text-slate-500 dark:text-[#ad92c9]">Activity</span>
            </div>
            <p className="text-2xl font-black text-emerald-500">Active</p>
            <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">Recently</p>
          </div>
        </div>

        {/* Wallet Info Card */}
        <div className="bg-white dark:bg-[#261933] rounded-3xl p-6 border border-slate-200 dark:border-[#4d3267] shadow-sm mb-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-[#7f13ec]">💳</span>
            Wallet Information
          </h3>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#7f13ec]/20">
                <span className="text-white text-xl font-bold">M</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-[#ad92c9]">Movement Network</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white">
                  {profile.walletAddress.slice(0, 12)}...{profile.walletAddress.slice(-10)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(profile.walletAddress)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#362348] text-slate-700 dark:text-white font-medium text-sm hover:bg-slate-300 dark:hover:bg-[#4d3267] transition-colors flex items-center gap-2"
              >
                <span>📋</span>
                Copy
              </button>
              <a
                href={`https://explorer.movementlabs.xyz/account/${profile.walletAddress}?network=mainnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#7f13ec]/10 text-[#7f13ec] font-medium text-sm hover:bg-[#7f13ec]/20 transition-colors flex items-center gap-2"
              >
                <span>🔍</span>
                Explorer
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!isOwnProfile && myWalletAddress && (
          <div className="bg-gradient-to-br from-[#7f13ec]/10 to-[#a855f7]/10 rounded-3xl p-6 border border-[#7f13ec]/20 mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span>⚡</span>
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/send?to=${profile.username}`}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-[#261933] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/50 hover:shadow-lg hover:shadow-[#7f13ec]/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">💸</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 dark:text-white">Send Money</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Transfer MOVE instantly</p>
                </div>
              </Link>

              <Link
                href={`/send?to=${profile.username}&request=true`}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-[#261933] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/50 hover:shadow-lg hover:shadow-[#7f13ec]/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📩</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 dark:text-white">Request Money</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Ask for a payment</p>
                </div>
              </Link>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/profile/${profile.username}`;
                  copyToClipboard(url);
                }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-[#261933] border border-slate-200 dark:border-[#4d3267] hover:border-[#7f13ec]/50 hover:shadow-lg hover:shadow-[#7f13ec]/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🔗</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 dark:text-white">Share Profile</p>
                  <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Copy profile link</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {transactions.length > 0 && (
          <div className="bg-white dark:bg-[#261933] rounded-3xl p-6 border border-slate-200 dark:border-[#4d3267] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-[#7f13ec]">📜</span>
                Recent Activity
              </h3>
              {isOwnProfile && (
                <Link
                  href="/history"
                  className="text-[#7f13ec] text-sm font-bold hover:underline"
                >
                  View All →
                </Link>
              )}
            </div>
            
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => {
                const isSent = tx.senderAddress === profile.walletAddress;
                return (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-red-500/10' : 'bg-emerald-500/10'
                      }`}>
                        <span className="text-xl">{isSent ? '↗' : '↙'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#ad92c9]">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold ${isSent ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isSent ? '-' : '+'}{tx.amount.toFixed(4)} MOVE
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 dark:text-[#ad92c9]/40 text-xs">
            SuperPay • Built on Movement Network
          </p>
        </div>
      </main>
    </div>
  );
}

