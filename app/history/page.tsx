'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Navbar from '../components/Navbar';
import { getTransactions } from '../lib/api';
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const LIMIT = 20;

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

  // Redirect if not connected (only check once after initial load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return tx.senderAddress === walletAddress;
    if (filter === 'received') return tx.receiverAddress === walletAddress;
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = new Date(tx.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="p-4 pt-safe">
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-gray-400 text-sm">{total} total transactions</p>
      </header>

      {/* Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 rounded-xl glass">
          {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all touch-target ${
                filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4">
        {isLoading && page === 0 ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-title">No transactions yet</p>
            <p className="empty-state-description">
              {filter === 'all'
                ? 'Your transaction history will appear here'
                : filter === 'sent'
                ? "You haven't sent any payments yet"
                : "You haven't received any payments yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, txs]) => (
              <div key={date} className="animate-fade-in-up">
                <h3 className="text-sm text-gray-500 mb-3 sticky top-0 bg-[#0a0a0f] py-2 z-10">
                  {date}
                </h3>
                <div className="space-y-3">
                  {txs.map((tx) => {
                    const isSent = tx.senderAddress === walletAddress;
                    return (
                      <a
                        key={tx._id}
                        href={getExplorerUrl(tx.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block card-solid p-4 card-hover"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{
                                backgroundColor: isSent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              }}
                            >
                              {isSent ? '📤' : '📥'}
                            </div>
                            <div>
                              <p className="text-white font-semibold">
                                {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {new Date(tx.timestamp).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {tx.note && (
                                <p className="text-gray-400 text-xs mt-1 truncate max-w-[200px]">
                                  "{tx.note}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${isSent ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isSent ? '-' : '+'}{tx.amount}
                            </p>
                            <p className="text-gray-500 text-xs">MOVE</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className={`badge ${
                            tx.status === 'confirmed'
                              ? 'badge-success'
                              : tx.status === 'pending'
                              ? 'badge-warning'
                              : 'badge-error'
                          }`}>
                            {tx.status}
                          </span>
                          <span className="text-gray-500 text-xs font-mono">
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-8)}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
                className="w-full btn btn-secondary py-3"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
