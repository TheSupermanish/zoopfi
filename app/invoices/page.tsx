'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import Link from 'next/link';
import { FileText, Plus, Receipt, CalendarDays, BadgeCheck, ArrowUpRight } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { getInvoices } from '../lib/api';
import { useUser } from '@/app/lib/hooks';

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
  const { ready, address: walletAddress, authenticated, isConnected } = useWallet();

  const { data: userData } = useUser();
  const accountType = userData?.accountType ?? 'personal';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('all');

  // Set default view mode based on account type
  useEffect(() => {
    if (userData?.accountType === 'personal') {
      setViewMode('customer');
    }
  }, [userData?.accountType]);

  // Fetch invoices
  useEffect(() => {
    if (!walletAddress) return;

    const fetchInvoices = async () => {
      try {
        const result = await getInvoices(walletAddress, viewMode, statusFilter);
        setInvoices(result.invoices || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };

    fetchInvoices();
  }, [walletAddress, viewMode, statusFilter]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [authenticated, isConnected, router]);

  return (
    <AppShell>
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/40">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-amber-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Invoices
          </h1>
          <p className="mt-3 max-w-md text-balance text-sm text-purple-200/70 sm:text-base">
            {viewMode === 'business' ? 'Create, send, and track your business invoices.' : 'View and pay invoices sent to you.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {[[BadgeCheck, 'On-chain settlement'], [Receipt, 'Crypto billing'], [CalendarDays, 'Due-date tracking']].map(([Icon, label], i) => {
              const I = Icon as typeof Receipt;
              return (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-purple-100/80">
                  <I className="h-3.5 w-3.5 text-amber-300/80" /> {label as string}
                </span>
              );
            })}
          </div>
          {accountType === 'business' && viewMode === 'business' && (
            <Link
              href="/invoices/create"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
            >
              <Plus className="h-4 w-4" /> Create Invoice
            </Link>
          )}
        </div>

        {/* Controls */}
        <div className="mt-9 space-y-3">
          {/* View Mode Toggle (Business accounts only) */}
          {accountType === 'business' && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
              <button
                onClick={() => setViewMode('business')}
                className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                  viewMode === 'business'
                    ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/25'
                    : 'text-purple-200/55 hover:text-purple-100'
                }`}
              >
                Sent by Me
              </button>
              <button
                onClick={() => setViewMode('customer')}
                className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                  viewMode === 'customer'
                    ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/25'
                    : 'text-purple-200/55 hover:text-purple-100'
                }`}
              >
                Sent to Me
              </button>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'draft', 'sent', 'paid', 'overdue'] as InvoiceStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === status
                    ? 'bg-[#9b3bff]/15 text-[#c89bff] border border-[#9b3bff]/40'
                    : 'border border-white/10 bg-white/[0.04] text-purple-200/70 hover:bg-white/[0.08]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-12 text-center shadow-2xl shadow-black/40 animate-fade-in">
            <div className="relative mx-auto mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/25 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/40">
                <FileText className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-white mb-2">No invoices yet</h2>
            <p className="text-sm text-purple-200/60 mb-6">
              {viewMode === 'business'
                ? 'Create your first invoice to get started'
                : 'No invoices have been sent to you yet'}
            </p>
            {accountType === 'business' && viewMode === 'business' && (
              <Link
                href="/invoices/create"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
              >
                <Plus className="h-4 w-4" /> Create Invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice._id}
                href={`/invoices/${invoice._id}`}
                className="group block rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 shadow-2xl shadow-black/40 transition hover:border-white/20 hover:from-white/[0.1] lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
                      <Receipt className="h-5 w-5 text-white" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-base font-semibold text-white">{invoice.invoiceNumber}</h3>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                      <p className="text-sm text-purple-200/70">
                        {viewMode === 'business'
                          ? `To: ${invoice.customerDisplayName}`
                          : `From: ${invoice.businessDisplayName}`}
                      </p>
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-purple-200/55">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Issued {new Date(invoice.issueDate).toLocaleDateString()}</span>
                        <span className="text-purple-200/30">•</span>
                        <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-white">{invoice.total.toFixed(4)}</p>
                    <p className="text-sm text-purple-200/55">{invoice.currency}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#b07bff] opacity-0 transition group-hover:opacity-100">
                      View <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
