'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { getInvoices } from '../lib/api';
import { useUser } from '@/app/lib/hooks';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';

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
      <PageShell variant="wide">
        <PageHeader
          title="Invoices"
          subtitle={viewMode === 'business' ? 'Manage your business invoices' : 'View invoices sent to you'}
          icon={FileText}
          accent="blue"
          action={
            accountType === 'business' && viewMode === 'business' ? (
              <Link href="/invoices/create" className="btn-primary h-12 px-6 flex items-center gap-2 justify-center">
                <span>+</span>
                Create Invoice
              </Link>
            ) : undefined
          }
        />

        {/* View Mode Toggle (Business accounts only) */}
        {accountType === 'business' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('business')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'business'
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-white/[0.04] text-purple-200/70 hover:bg-white/[0.08]'
              }`}
            >
              Sent by Me
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'customer'
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-white/[0.04] text-purple-200/70 hover:bg-white/[0.08]'
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
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-[#7f13ec] text-white'
                  : 'bg-white/[0.04] text-purple-200/70 border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#9b3bff]/10 text-[#b07bff] flex items-center justify-center mb-4">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">No invoices yet</h2>
            <p className="text-sm text-purple-200/60 mb-6">
              {viewMode === 'business'
                ? 'Create your first invoice to get started'
                : 'No invoices have been sent to you yet'}
            </p>
            {accountType === 'business' && viewMode === 'business' && (
              <Link href="/invoices/create" className="btn-primary inline-flex items-center gap-2 px-6 h-12">
                <span>+</span>
                Create Invoice
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice._id} className="lift">
                <Link href={`/invoices/${invoice._id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-white">{invoice.invoiceNumber}</h3>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                      <p className="text-sm text-purple-200/70">
                        {viewMode === 'business'
                          ? `To: ${invoice.customerDisplayName}`
                          : `From: ${invoice.businessDisplayName}`}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-purple-200/55">
                        <span>Issued: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-white">{invoice.total.toFixed(4)}</p>
                      <p className="text-sm text-purple-200/55">{invoice.currency}</p>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </PageShell>
    </AppShell>
  );
}
