'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet, getAddressExplorerUrl } from '@/app/lib/chain';
import { useUser } from '@/app/lib/hooks';
import Link from 'next/link';
import { getUserByUsername, getTransactions } from '../../lib/api';
import { toast } from 'sonner';
import { Ghost, Pencil, ArrowUpRight, ArrowDownLeft, Copy, Calendar, Clock, ArrowLeftRight, ArrowUp, ArrowDown, Flame, Wallet, ExternalLink, Zap, HandCoins, Share2, History, BadgeCheck, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';

interface UserProfile {
  _id?: string;
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
  const { address: walletAddress } = useWallet();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    transactionCount: 0,
  });

  // Signed-in user (cached app-wide); only used to detect own profile.
  const { data: currentUser } = useUser();

  const username = params.username as string;
  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase();

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
      <div className="relative flex min-h-screen items-center justify-center bg-[#0a0510]">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-8%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        </div>
        <div className="spinner" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0510] p-4">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-8%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
          <div className="absolute right-[-10%] bottom-[5%] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[140px]" />
        </div>
        <div className="animate-fade-in max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <Ghost className="h-12 w-12 text-[#ad92c9]" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">User not found</h1>
          <p className="mb-6 text-sm text-purple-200/70">
            The user @{username} doesn&apos;t exist or hasn&apos;t registered yet.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0510] text-white">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        <div className="absolute right-[-10%] bottom-[5%] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[140px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-purple-100 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-purple-100/80">Pay profile</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Profile Content */}
      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Hero card */}
        <div className="animate-rise-in overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl shadow-black/40">
          {/* Cover gradient */}
          <div className="relative h-32 overflow-hidden bg-gradient-to-r from-[#9b3bff] via-[#7f13ec] to-[#6a10c7] sm:h-36">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
            <div className="absolute right-6 top-4 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute bottom-2 left-10 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl" />
          </div>

          <div className="px-6 pb-7 sm:px-8 sm:pb-8">
            {/* Avatar + name */}
            <div className="-mt-12 flex flex-col items-center text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-[#7f13ec]/40 blur-2xl animate-pulse-glow" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] text-4xl font-bold text-white shadow-2xl shadow-[#7f13ec]/40 ring-4 ring-[#0a0510]">
                  {getInitials(profile.username)}
                </div>
              </div>
              <h2 className="mt-4 flex items-center gap-2 bg-gradient-to-r from-white via-purple-100 to-[#c89bff] bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                @{profile.username}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Zoopfi user
              </span>

              {/* Trust pills */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {[
                  [ShieldCheck, 'Private payments'],
                  [BadgeCheck, 'On Stellar'],
                  [Calendar, `Joined ${formatDate(profile.createdAt)}`],
                  [Clock, `Member for ${getMemberDuration(profile.createdAt)}`],
                ].map(([Icon, label], i) => {
                  const I = Icon as typeof BadgeCheck;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-purple-100/80">
                      <I className="h-3.5 w-3.5 text-[#c89bff]" /> {label as string}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Primary CTA */}
            <div className="mt-7">
              {isOwnProfile ? (
                <Link
                  href="/settings"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Link>
              ) : (
                <Link
                  href={`/send?to=${profile.username}`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-4 text-base font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
                >
                  <ArrowUpRight className="h-5 w-5" />
                  Pay @{profile.username}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-2 flex items-center gap-2 text-purple-200/55">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="text-xs">Transactions</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">{stats.transactionCount}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-2 flex items-center gap-2 text-purple-200/55">
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs">Total sent</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">{stats.totalSent.toFixed(2)}</p>
            <p className="text-xs text-purple-200/40">USDC</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-2 flex items-center gap-2 text-purple-200/55">
              <ArrowDown className="h-4 w-4" />
              <span className="text-xs">Total received</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">{stats.totalReceived.toFixed(2)}</p>
            <p className="text-xs text-purple-200/40">USDC</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-2 flex items-center gap-2 text-purple-200/55">
              <Flame className="h-4 w-4" />
              <span className="text-xs">Activity</span>
            </div>
            <p className="text-2xl font-bold text-emerald-300">Active</p>
            <p className="text-xs text-purple-200/40">Recently</p>
          </div>
        </div>

        {/* Wallet Info Card */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet className="h-5 w-5 text-[#b07bff]" />
            Wallet information
          </h3>

          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-purple-200/45">Stellar network</p>
                <p className="font-mono text-sm text-white">
                  {profile.walletAddress.slice(0, 12)}...{profile.walletAddress.slice(-10)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(profile.walletAddress)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <a
                href={getAddressExplorerUrl(profile.walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-[#7f13ec]/15 px-4 py-2 text-sm font-medium text-[#c89bff] transition hover:bg-[#7f13ec]/25"
              >
                <ExternalLink className="h-4 w-4" />
                Explorer
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!isOwnProfile && walletAddress && (
          <div className="mt-6 rounded-3xl border border-[#7f13ec]/20 bg-[#7f13ec]/[0.07] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Zap className="h-5 w-5 text-[#b07bff]" />
              Quick actions
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Link
                href={`/send?to=${profile.username}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#7f13ec]/50 hover:bg-white/[0.06]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7f13ec]/15 transition-transform group-hover:scale-110">
                  <ArrowUpRight className="h-7 w-7 text-[#c89bff]" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">Send money</p>
                  <p className="text-xs text-purple-200/55">Transfer USDC instantly</p>
                </div>
              </Link>

              <Link
                href={`/send?to=${profile.username}&request=true`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#7f13ec]/50 hover:bg-white/[0.06]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 transition-transform group-hover:scale-110">
                  <HandCoins className="h-7 w-7 text-emerald-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">Request money</p>
                  <p className="text-xs text-purple-200/55">Ask for a payment</p>
                </div>
              </Link>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/profile/${profile.username}`;
                  copyToClipboard(url);
                }}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#7f13ec]/50 hover:bg-white/[0.06]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 transition-transform group-hover:scale-110">
                  <Share2 className="h-7 w-7 text-blue-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">Share profile</p>
                  <p className="text-xs text-purple-200/55">Copy profile link</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {transactions.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <History className="h-5 w-5 text-[#b07bff]" />
                Recent activity
              </h3>
              {isOwnProfile && (
                <Link
                  href="/history"
                  className="text-sm font-semibold text-[#c89bff] transition hover:text-white"
                >
                  View all →
                </Link>
              )}
            </div>

            <div className="space-y-2.5">
              {transactions.slice(0, 5).map((tx) => {
                const isSent = tx.senderAddress === profile.walletAddress;
                return (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isSent ? 'bg-rose-500/15' : 'bg-emerald-500/15'
                      }`}>
                        {isSent
                          ? <ArrowUpRight className="h-5 w-5 text-rose-300" />
                          : <ArrowDownLeft className="h-5 w-5 text-emerald-300" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                        </p>
                        <p className="text-xs text-purple-200/45">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold tabular-nums ${isSent ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {isSent ? '-' : '+'}{tx.amount.toFixed(4)} USDC
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-1 text-center text-xs text-purple-200/40">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Zoopfi · Private payments on Stellar
          </p>
        </div>
      </main>
    </div>
  );
}

