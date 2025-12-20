'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import NotificationBell from '../components/NotificationBell';
import { fetchBalance, formatBalance, formatUSD } from '../lib/balance';
import { getUserByAddress, getTransactions, getStreakInfo } from '../lib/api';

interface UserData {
  username: string;
  walletAddress: string;
  streak: number;
  transferCount: number;
}

interface Transaction {
  _id: string;
  senderUsername: string;
  receiverUsername: string;
  amount: number;
  timestamp: string;
  txHash: string;
  senderAddress: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, authenticated, logout: privyLogout } = usePrivy();
  const { account, connected, disconnect } = useWallet();
  
  const [walletAddress, setWalletAddress] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch all data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user data
        const userResult = await getUserByAddress(walletAddress);
        if (!userResult) {
          router.replace('/onboarding');
          return;
        }
        setUserData(userResult);

        // Fetch balance, transactions, streak in parallel
        const [bal, txResult, streak] = await Promise.all([
          fetchBalance(walletAddress),
          getTransactions(walletAddress, 5, 0),
          getStreakInfo(walletAddress),
        ]);
        
        setBalance(bal);
        setRecentTransactions(txResult.transactions || []);
        setStreakInfo(streak);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected (only once on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500); // Small delay to let auth state settle
    return () => clearTimeout(timer);
  }, []);

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
      <header className="p-4 pt-safe flex justify-between items-center">
        <div className="animate-fade-in">
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h1 className="text-xl font-bold text-white">@{userData?.username}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell walletAddress={walletAddress} />
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-xl glass touch-target transition-colors hover:bg-white/10"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-4 mb-6">
        <div 
          className="rounded-2xl p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.3)'
          }}
        >
          <p className="text-emerald-100 text-sm mb-1">Total Balance</p>
          <h2 className="text-4xl font-black text-white mb-1">
            {formatBalance(balance)} <span className="text-2xl font-normal opacity-80">MOVE</span>
          </h2>
          <p className="text-emerald-100 text-sm">{formatUSD(balance)}</p>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-6">
            <Link 
              href="/send"
              className="flex-1 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-center transition-all active:scale-95 touch-target"
            >
              📤 Send
            </Link>
            <Link 
              href="/receive"
              className="flex-1 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-center transition-all active:scale-95 touch-target"
            >
              📥 Receive
            </Link>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      {streakInfo && streakInfo.streak > 0 && (
        <div className="px-4 mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Link 
            href="/rewards"
            className="block rounded-xl p-4 card-hover"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-white font-bold">{streakInfo.streak} Day Streak!</p>
                  <p className="text-purple-200 text-sm">
                    {streakInfo.nextMilestone 
                      ? `${streakInfo.nextMilestone.count - streakInfo.transferCount} transfers to ${streakInfo.nextMilestone.name}`
                      : 'Max level reached!'}
                  </p>
                </div>
              </div>
              <span className="text-2xl">{streakInfo.currentMilestone?.emoji || '🌱'}</span>
            </div>
          </Link>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="px-4 mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <div className="grid grid-cols-4 gap-3">
          <Link 
            href="/contacts"
            className="flex flex-col items-center p-4 rounded-xl card-solid card-hover touch-target"
          >
            <span className="text-2xl mb-1">👥</span>
            <span className="text-xs text-gray-400">Contacts</span>
          </Link>
          <Link 
            href="/receive"
            className="flex flex-col items-center p-4 rounded-xl card-solid card-hover touch-target"
          >
            <span className="text-2xl mb-1">📲</span>
            <span className="text-xs text-gray-400">QR Code</span>
          </Link>
          <Link 
            href="/receive?tab=request"
            className="flex flex-col items-center p-4 rounded-xl card-solid card-hover touch-target"
          >
            <span className="text-2xl mb-1">📋</span>
            <span className="text-xs text-gray-400">Request</span>
          </Link>
          <Link 
            href="/rewards"
            className="flex flex-col items-center p-4 rounded-xl card-solid card-hover touch-target"
          >
            <span className="text-2xl mb-1">🏆</span>
            <span className="text-xs text-gray-400">Rewards</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <Link href="/history" className="text-emerald-400 text-sm font-medium">
            See all →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-title">No transactions yet</p>
            <p className="empty-state-description">Send your first payment to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx, index) => {
              const isSent = tx.senderAddress === walletAddress;
              return (
                <div 
                  key={tx._id}
                  className="flex items-center justify-between p-4 rounded-xl card-solid card-hover animate-fade-in-up"
                  style={{ animationDelay: `${250 + index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: isSent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}
                    >
                      <span>{isSent ? '📤' : '📥'}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${isSent ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isSent ? '-' : '+'}{tx.amount} MOVE
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
