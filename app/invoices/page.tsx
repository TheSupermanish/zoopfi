'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { getUserByAddress, getInvoices } from '../lib/api';

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type ViewMode = 'business' | 'customer';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  businessDisplayName: string;
  customerDisplayName: string;
  total: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Wallet setup
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
          setDisplayName(userData.displayName);
          setAvatarUrl(userData.avatarUrl || '');
          setAccountType(userData.accountType);

          // Set default view mode based on account type
          if (userData.accountType === 'personal') {
            setViewMode('customer');
          }
        }
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Fetch invoices
  useEffect(() => {
    if (!walletAddress) return;

    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const result = await getInvoices(walletAddress, viewMode, statusFilter);
        setInvoices(result.invoices || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [walletAddress, viewMode, statusFilter]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [authenticated, connected, router]);

  return (
    <DashboardLayout
      username={username}
      walletAddress={walletAddress}
      accountType={accountType}
      displayName={displayName}
      avatarUrl={avatarUrl}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white">
              Invoices
            </h1>
            <p className="text-slate-500 dark:text-[#ad92c9] mt-2">
              {viewMode === 'business' ? 'Manage your business invoices' : 'View invoices sent to you'}
            </p>
          </div>

          {accountType === 'business' && viewMode === 'business' && (
            <Link
              href="/invoices/create"
              className="btn-primary h-12 px-6 flex items-center gap-2 justify-center"
            >
              <span>+</span>
              Create Invoice
            </Link>
          )}
        </div>

        {/* View Mode Toggle (Business accounts only) */}
        {accountType === 'business' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('business')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'business'
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-slate-100 dark:bg-[#251a30] text-slate-700 dark:text-[#ad92c9]'
              }`}
            >
              Sent by Me
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'customer'
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-slate-100 dark:bg-[#251a30] text-slate-700 dark:text-[#ad92c9]'
              }`}
            >
              Sent to Me
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as InvoiceStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-white dark:bg-[#251a30] text-slate-700 dark:text-[#ad92c9] border border-slate-200 dark:border-[#362348]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white dark:bg-[#251a30] rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center mb-4">
              <span className="text-4xl">📄</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              No invoices yet
            </h2>
            <p className="text-slate-500 dark:text-[#ad92c9] mb-6">
              {viewMode === 'business'
                ? 'Create your first invoice to get started'
                : 'No invoices have been sent to you yet'}
            </p>
            {accountType === 'business' && viewMode === 'business' && (
              <Link
                href="/invoices/create"
                className="btn-primary inline-flex items-center gap-2 px-6 h-12"
              >
                <span>+</span>
                Create Invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <Link
                key={invoice._id}
                href={`/invoices/${invoice._id}`}
                className="bg-white dark:bg-[#251a30] rounded-2xl p-6 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </h3>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <p className="text-slate-600 dark:text-[#ad92c9]">
                      {viewMode === 'business'
                        ? `To: ${invoice.customerDisplayName}`
                        : `From: ${invoice.businessDisplayName}`}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-[#ad92c9]">
                      <span>Issued: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {invoice.total.toFixed(4)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-[#ad92c9]">
                      {invoice.currency}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
