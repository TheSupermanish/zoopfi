'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser, useTransactions } from '@/app/lib/hooks';
import AppShell from '../components/shell/AppShell';
import { PageShell, Card, StatTile } from '../components/ui/primitives';
import { getTransactions } from '../lib/api';
import { ArrowUpRight, ArrowDownLeft, Search, Check, Copy, Receipt } from 'lucide-react';

interface Transaction {
  _id: string;
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  amount: number;
  txHash: string;
  status: string;
  type: string;
  timestamp: string;
  note?: string;
}

type FilterType = 'all' | 'sent' | 'received';

export default function HistoryPage() {
  const router = useRouter();
  const { ready, address: walletAddress, authenticated, isConnected, getExplorerUrl } = useWallet();

  const LIMIT = 20;

  const { data: userData } = useUser();
  const isLoading = userData === undefined;

  // First page comes from the shared cache (instant + live-polled).
  const { data: firstPage = [] } = useTransactions(LIMIT) as { data: Transaction[] };

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [serverTotal, setServerTotal] = useState(0);
  // Additional pages appended via "Load More" (offset-based).
  const [extraPages, setExtraPages] = useState<Transaction[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const transactions = useMemo(
    () => [...firstPage, ...extraPages],
    [firstPage, extraPages]
  );

  // Prefer the server total once a paged fetch reports it; otherwise fall back
  // to the count currently loaded from the cached first page.
  const total = serverTotal || transactions.length;

  // Keep total / hasMore in sync with the cached first page.
  useEffect(() => {
    setHasMore(firstPage.length === LIMIT);
  }, [firstPage.length]);

  // Fetch additional pages on demand.
  useEffect(() => {
    if (!walletAddress || page === 0) return;

    const fetchData = async () => {
      setIsLoadingMore(true);
      try {
        const result = await getTransactions(walletAddress, LIMIT, page * LIMIT);
        setExtraPages(prev => [...prev, ...result.transactions]);
        setServerTotal(result.total);
        setHasMore(result.transactions.length === LIMIT);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };

    fetchData();
  }, [walletAddress, page]);

  // Redirect if not registered
  useEffect(() => {
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlySent = 0;
    let monthlyReceived = 0;
    
    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      if (txDate >= monthStart) {
        if (tx.senderAddress === walletAddress) {
          monthlySent += tx.amount;
        } else {
          monthlyReceived += tx.amount;
        }
      }
    });

    return { monthlySent, monthlyReceived };
  }, [transactions, walletAddress]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (filter === 'sent' && tx.senderAddress !== walletAddress) return false;
    if (filter === 'received' && tx.receiverAddress !== walletAddress) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUsername = 
        tx.senderUsername?.toLowerCase().includes(query) ||
        tx.receiverUsername?.toLowerCase().includes(query);
      const matchesHash = tx.txHash?.toLowerCase().includes(query);
      const matchesNote = tx.note?.toLowerCase().includes(query);
      
      if (!matchesUsername && !matchesHash && !matchesNote) return false;
    }
    
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const txDate = new Date(tx.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel: string;
    
    if (txDate.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (txDate.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = txDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // Get emoji for transaction
  const getTxEmoji = (tx: Transaction) => {
    const isSent = tx.senderAddress === walletAddress;
    if (tx.note?.toLowerCase().includes('pizza') || tx.note?.toLowerCase().includes('food')) return '🍕';
    if (tx.note?.toLowerCase().includes('uber') || tx.note?.toLowerCase().includes('ride')) return '🚕';
    if (tx.note?.toLowerCase().includes('coffee')) return '☕';
    if (tx.note?.toLowerCase().includes('rent') || tx.note?.toLowerCase().includes('house')) return '🏠';
    if (tx.note?.toLowerCase().includes('shopping')) return '🛒';
    return isSent ? '📤' : '📥';
  };

  return (
    <AppShell>
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/12 blur-[150px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[26rem] w-[26rem] rounded-full bg-emerald-500/8 blur-[140px]" />
      </div>
      <PageShell variant="wide">
        <div className="flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span className="absolute inset-0 rounded-2xl bg-[#7f13ec]/30 blur-xl animate-pulse-glow" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/40">
                  <Receipt className="h-6 w-6 text-white" />
                </span>
              </span>
              <div>
                <h1 className="bg-gradient-to-r from-white to-[#c89bff] bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                  Activity
                </h1>
                <p className="mt-0.5 text-sm text-purple-200/60">Every payment, settled and verifiable on Stellar.</p>
              </div>
            </div>
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-purple-200/80 transition-colors hover:bg-white/[0.08] hover:text-white">
              <ArrowDownLeft className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Stats Overview */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatTile label="Total Transactions" value={total} icon={Receipt} accent="purple" />
            <StatTile label="Monthly Sent" value={`${stats.monthlySent.toFixed(4)} USDC`} icon={ArrowUpRight} accent="rose" />
            <StatTile label="Monthly Received" value={`${stats.monthlyReceived.toFixed(4)} USDC`} icon={ArrowDownLeft} accent="emerald" />
          </section>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Search */}
            <div className="w-full md:w-96">
              <label className="flex h-12 w-full items-center rounded-xl border border-white/10 bg-black/30 px-4 transition-colors focus-within:border-[#9b3bff]/60">
                <Search className="h-5 w-5 text-purple-200/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ml-2 w-full border-none bg-transparent text-white placeholder-purple-200/50 focus:outline-none focus:ring-0"
                  placeholder="Search by username, hash, or note..."
                />
              </label>
            </div>

            {/* Filter Chips */}
            <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
              {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/30'
                      : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {f === 'all' ? <Copy className="h-4 w-4" /> : f === 'sent' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {isLoading && page === 0 ? (
            <div className="flex justify-center py-12">
              <div className="spinner" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card className="text-center">
              <span className="mb-4 block text-5xl">📭</span>
              <p className="text-lg font-bold text-white">No transactions found</p>
              <p className="mt-1 text-sm text-purple-200/60">
                {searchQuery
                  ? 'Try a different search term'
                  : filter === 'all'
                  ? 'Your transaction history will appear here'
                  : filter === 'sent'
                  ? "You haven't sent any payments yet"
                  : "You haven't received any payments yet"}
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date} className="flex flex-col gap-3">
                  {/* Date Header */}
                  <h3 className="pl-1 text-sm font-semibold uppercase tracking-wider text-purple-200/60">
                    {date}
                  </h3>

                  {/* Transaction Items */}
                  <Card className="p-2 sm:p-2">
                    <div className="flex flex-col">
                      {txs.map((tx) => {
                        const isSent = tx.senderAddress === walletAddress;
                        const emoji = getTxEmoji(tx);

                        return (
                          <a
                            key={tx._id}
                            href={getExplorerUrl(tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5"
                          >
                            <div className="flex items-center gap-4">
                              {/* Icon */}
                              <div className="relative flex-shrink-0">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                                  isSent ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                                }`}>
                                  {emoji}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-[#0a0512] p-1 text-white ${
                                  isSent ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}>
                                  {isSent ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex flex-col">
                                <h4 className="text-base font-semibold text-white transition-colors group-hover:text-[#c89bff]">
                                  {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                                </h4>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isSent
                                      ? 'bg-rose-500/10 text-rose-300'
                                      : 'bg-emerald-500/10 text-emerald-300'
                                  }`}>
                                    {isSent ? 'Sent' : 'Received'}
                                  </span>
                                  {tx.note && (
                                    <p className="max-w-[200px] truncate text-sm text-purple-200/60">
                                      "{tx.note}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-6 text-right md:gap-12">
                              {/* Time & Status - Hidden on mobile */}
                              <div className="hidden sm:block">
                                <p className="text-sm font-medium text-white">
                                  {new Date(tx.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <div className={`flex items-center justify-end gap-1 text-xs ${
                                  tx.status === 'confirmed'
                                    ? 'text-emerald-300'
                                    : tx.status === 'pending'
                                    ? 'text-amber-300'
                                    : 'text-rose-300'
                                }`}>
                                  <span className="inline-flex items-center">{tx.status === 'confirmed' ? <Check className="h-3.5 w-3.5" /> : tx.status === 'pending' ? '⏳' : '✕'}</span>
                                  <span className="capitalize">{tx.status}</span>
                                </div>
                              </div>

                              {/* Amount */}
                              <div className="flex flex-col items-end">
                                <p className={`text-lg font-bold tabular-nums ${
                                  isSent ? 'text-rose-300' : 'text-emerald-300'
                                }`}>
                                  {isSent ? '-' : '+'}{tx.amount.toFixed(4)}
                                </p>
                                <div className="flex items-center gap-1">
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#9b3bff] to-[#6a10c7]">
                                    <span className="text-[8px] font-bold text-white">M</span>
                                  </div>
                                  <p className="font-mono text-xs text-purple-200/60">USDC</p>
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="spinner-sm" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <span>Load previous activity</span>
                        <span>📜</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </PageShell>
    </AppShell>
  );
}
