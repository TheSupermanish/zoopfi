'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import DashboardLayout from '../components/DashboardLayout';
import { getTransactions, getUserByAddress } from '../lib/api';
import { getExplorerUrl } from '../lib/aptos';

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
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const LIMIT = 20;

  // Get wallet address and username
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
        setWalletAddress(address);
        const userData = await getUserByAddress(address);
        if (userData) {
          setUsername(userData.username);
        }
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Fetch transactions
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getTransactions(walletAddress, LIMIT, page * LIMIT);
        setTransactions(prev => page === 0 ? result.transactions : [...prev, ...result.transactions]);
        setTotal(result.total);
        setHasMore(result.transactions.length === LIMIT);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress, page]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
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
    <DashboardLayout username={username} walletAddress={walletAddress}>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
        {/* Background Gradient */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#7f13ec]/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8 pb-10 relative">
          {/* Page Heading */}
          <header className="flex flex-wrap justify-between items-end gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-slate-900 dark:text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                Transaction History
              </h2>
              <p className="text-slate-500 dark:text-[#ad92c9] text-lg font-normal">
                View and manage your crypto activity on Movement Network.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-[#362348] rounded-xl text-slate-600 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-[#362348]/80 transition-colors">
                <span>📥</span>
                <span className="text-sm font-medium">Export CSV</span>
              </button>
            </div>
          </header>

          {/* Stats Overview */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Transactions */}
            <div className="flex flex-col gap-3 rounded-2xl p-6 bg-white dark:bg-[#362348]/50 backdrop-blur-sm border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-colors shadow-sm dark:shadow-none">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-[#7f13ec]/20 rounded-lg text-[#7f13ec]">
                  <span className="text-2xl">📊</span>
                </div>
                <span className="text-emerald-500 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {total} total
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm font-medium mb-1">Total Transactions</p>
                <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">{total}</p>
              </div>
            </div>

            {/* Monthly Sent */}
            <div className="flex flex-col gap-3 rounded-2xl p-6 bg-white dark:bg-[#362348]/50 backdrop-blur-sm border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-colors shadow-sm dark:shadow-none">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                  <span className="text-2xl">↗</span>
                </div>
                <span className="text-red-400 text-sm font-medium bg-red-500/10 px-2 py-1 rounded-lg">
                  Sent
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm font-medium mb-1">Monthly Sent</p>
                <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">
                  {stats.monthlySent.toFixed(4)} <span className="text-lg text-slate-400 dark:text-[#ad92c9]">MOVE</span>
                </p>
              </div>
            </div>

            {/* Monthly Received */}
            <div className="flex flex-col gap-3 rounded-2xl p-6 bg-white dark:bg-[#362348]/50 backdrop-blur-sm border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-colors shadow-sm dark:shadow-none">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <span className="text-2xl">↙</span>
                </div>
                <span className="text-emerald-500 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                  Received
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm font-medium mb-1">Monthly Received</p>
                <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">
                  {stats.monthlyReceived.toFixed(4)} <span className="text-lg text-slate-400 dark:text-[#ad92c9]">MOVE</span>
                </p>
              </div>
            </div>
          </section>

          {/* Filters & Search Toolbar */}
          <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#191022]/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 dark:border-white/5">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              {/* Search */}
              <div className="w-full md:w-96">
                <label className="flex w-full items-center rounded-2xl bg-white dark:bg-[#362348] h-12 px-4 border border-slate-200 dark:border-transparent focus-within:border-[#7f13ec]/50 transition-colors shadow-sm dark:shadow-none">
                  <span className="text-slate-400 dark:text-[#ad92c9]">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#ad92c9] focus:ring-0 ml-2 focus:outline-none"
                    placeholder="Search by username, hash, or note..."
                  />
                </label>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                      filter === f
                        ? 'bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/20'
                        : 'bg-white dark:bg-[#362348] text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-[#362348]/80 border border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <span>
                      {f === 'all' ? '📋' : f === 'sent' ? '↗' : '↙'}
                    </span>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {isLoading && page === 0 ? (
            <div className="flex justify-center py-12">
              <div className="spinner" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#362348]/50 rounded-2xl p-8 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <span className="text-5xl mb-4 block">📭</span>
              <p className="text-slate-900 dark:text-white font-bold text-lg">No transactions found</p>
              <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1">
                {searchQuery 
                  ? 'Try a different search term'
                  : filter === 'all'
                  ? 'Your transaction history will appear here'
                  : filter === 'sent'
                  ? "You haven't sent any payments yet"
                  : "You haven't received any payments yet"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date} className="flex flex-col gap-3">
                  {/* Date Header */}
                  <h3 className="text-slate-500 dark:text-[#ad92c9] text-sm font-semibold uppercase tracking-wider pl-2">
                    {date}
                  </h3>

                  {/* Transaction Items */}
                  {txs.map((tx) => {
                    const isSent = tx.senderAddress === walletAddress;
                    const emoji = getTxEmoji(tx);

                    return (
                      <a
                        key={tx._id}
                        href={getExplorerUrl(tx.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-4 bg-white dark:bg-[#362348] hover:bg-slate-50 dark:hover:bg-[#432c5a] rounded-2xl transition-all duration-300 cursor-pointer border border-slate-200 dark:border-transparent hover:border-[#7f13ec]/30 shadow-sm dark:shadow-none hover:shadow-md hover:shadow-[#7f13ec]/5"
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="relative flex-shrink-0">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
                              isSent 
                                ? 'bg-red-500/10 dark:bg-[#5C4B6B]' 
                                : 'bg-emerald-500/10 dark:bg-[#2a3a2a]'
                            }`}>
                              {emoji}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-white dark:border-[#362348] flex items-center justify-center ${
                              isSent 
                                ? 'bg-slate-500 dark:bg-[#ad92c9] text-white' 
                                : 'bg-emerald-500 text-white'
                            }`}>
                              <span className="text-[10px] font-bold">{isSent ? '↗' : '↙'}</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex flex-col">
                            <h4 className="text-slate-900 dark:text-white font-bold text-lg group-hover:text-[#7f13ec] dark:group-hover:text-[#9d4bf2] transition-colors">
                              {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                isSent 
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              }`}>
                                {isSent ? 'Sent' : 'Received'}
                              </span>
                              {tx.note && (
                                <p className="text-slate-500 dark:text-[#ad92c9] text-sm truncate max-w-[200px]">
                                  "{tx.note}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-6 md:gap-12 text-right">
                          {/* Time & Status - Hidden on mobile */}
                          <div className="hidden sm:block">
                            <p className="text-slate-700 dark:text-white text-sm font-medium">
                              {new Date(tx.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <div className={`flex items-center justify-end gap-1 text-xs ${
                              tx.status === 'confirmed' 
                                ? 'text-emerald-500' 
                                : tx.status === 'pending' 
                                ? 'text-amber-500' 
                                : 'text-red-500'
                            }`}>
                              <span>{tx.status === 'confirmed' ? '✓' : tx.status === 'pending' ? '⏳' : '✕'}</span>
                              <span className="capitalize">{tx.status}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex flex-col items-end">
                            <p className={`font-bold text-xl group-hover:scale-105 transition-transform ${
                              isSent ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {isSent ? '-' : '+'}{tx.amount.toFixed(4)}
                            </p>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center">
                                <span className="text-white text-[8px] font-bold">M</span>
                              </div>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-mono">MOVE</p>
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isLoading}
                    className="px-6 py-3 bg-transparent border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
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
      </div>
    </DashboardLayout>
  );
}
