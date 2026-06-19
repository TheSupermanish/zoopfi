'use client';
/**
 * Payroll — batch payouts for a business. Add your team (by @username or G…
 * address) with an amount each, then run the whole batch in one click. Payments
 * settle sequentially on Stellar (safer for account sequence numbers) and each
 * row reports its own status + explorer link. The roster persists locally.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Play,
  Loader2,
  Check,
  AlertCircle,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import AppShell from '../../components/shell/AppShell';
import { PageShell, PageHeader, Card } from '@/app/components/ui/primitives';
import { useWallet, getExplorerUrl, formatBalance } from '@/app/lib/chain';
import { getUserByUsername } from '@/app/lib/api';
import type { AssetCode } from '@/app/lib/chain/types';

interface Payee {
  id: string;
  handle: string;
  amount: string;
}
type RowState = { status: 'idle' | 'sending' | 'paid' | 'error'; hash?: string; error?: string };

const STORAGE_KEY = 'zoopfi.payroll.roster';
const isAddress = (s: string) => /^[GC][A-Z2-7]{55}$/.test(s);
const uid = () => Math.random().toString(36).slice(2, 10);

export default function PayrollPage() {
  const { ops, isConnected } = useWallet();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [handle, setHandle] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<AssetCode>('USDC');
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  // Load / persist the roster locally.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPayees(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payees));
    } catch {
      /* ignore */
    }
  }, [payees]);

  const total = useMemo(
    () => payees.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payees],
  );

  const add = () => {
    const h = handle.trim();
    if (!h || !amount || Number(amount) <= 0) return;
    setPayees((prev) => [...prev, { id: uid(), handle: h, amount }]);
    setHandle('');
    setAmount('');
  };

  const remove = (id: string) => {
    setPayees((prev) => prev.filter((p) => p.id !== id));
    setRows((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const run = async () => {
    if (!isConnected || running || payees.length === 0) return;
    setRunning(true);
    for (const p of payees) {
      if (rows[p.id]?.status === 'paid') continue; // never re-pay an already-paid recipient
      setRows((r) => ({ ...r, [p.id]: { status: 'sending' } }));
      try {
        let to = p.handle.replace(/^@/, '');
        if (!isAddress(to)) {
          const user = await getUserByUsername(to);
          if (!user?.walletAddress) throw new Error(`Couldn't find @${to}`);
          to = user.walletAddress;
        }
        const res = await ops.sendPayment(to, p.amount, asset);
        if (!res.success) throw new Error(res.error || 'Payment failed');
        setRows((r) => ({ ...r, [p.id]: { status: 'paid', hash: res.hash } }));
      } catch (e) {
        setRows((r) => ({ ...r, [p.id]: { status: 'error', error: (e as Error)?.message } }));
      }
    }
    setRunning(false);
  };

  const paidCount = Object.values(rows).filter((r) => r.status === 'paid').length;

  return (
    <AppShell>
      <PageShell variant="wide">
        <PageHeader
          title="Payroll"
          subtitle="Pay your whole team in one batch."
          icon={Users}
          accent="purple"
        />

        {/* Summary */}
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-purple-200/55">Total payout</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">
              {formatBalance(total)} <span className="text-base font-medium text-purple-200/55">{asset}</span>
            </p>
            <p className="mt-0.5 text-xs text-purple-200/55">
              {payees.length} {payees.length === 1 ? 'recipient' : 'recipients'}
              {paidCount > 0 && ` · ${paidCount} paid`}
            </p>
          </div>
          <button
            onClick={run}
            disabled={!isConnected || running || payees.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-5 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            ) : !isConnected ? (
              <><Wallet className="h-4 w-4" /> Connect to run</>
            ) : (
              <><Play className="h-4 w-4" /> Run payroll</>
            )}
          </button>
        </Card>

        {/* Add recipient */}
        <Card className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="@username or G… address"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="0.00"
                className="w-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
              />
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value as AssetCode)}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#9b3bff]/60"
              >
                <option value="USDC" className="bg-[#160f22]">USDC</option>
                <option value="XLM" className="bg-[#160f22]">XLM</option>
              </select>
              <button
                onClick={add}
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-white transition-colors hover:bg-white/10"
                aria-label="Add recipient"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Roster */}
        <div className="mt-4 space-y-2">
          {payees.length === 0 ? (
            <Card className="flex flex-col items-center py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#9b3bff]/10 text-[#b07bff]">
                <Users className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-white">No one on payroll yet</p>
              <p className="mt-1 max-w-xs text-sm text-purple-200/60">
                Add your team above by @username or wallet address, then run the batch.
              </p>
            </Card>
          ) : (
            payees.map((p) => {
              const row = rows[p.id] ?? { status: 'idle' as const };
              return (
                <Card
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-4 sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] font-bold text-white">
                      {p.handle.replace(/^@/, '')[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {isAddress(p.handle.replace(/^@/, ''))
                          ? `${p.handle.slice(0, 6)}…${p.handle.slice(-4)}`
                          : `@${p.handle.replace(/^@/, '')}`}
                      </p>
                      <RowStatus row={row} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums text-white">
                      {formatBalance(Number(p.amount) || 0)} <span className="text-xs text-purple-200/55">{asset}</span>
                    </span>
                    {!running && (
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded-lg p-2 text-purple-200/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </PageShell>
    </AppShell>
  );
}

function RowStatus({ row }: { row: RowState }) {
  if (row.status === 'sending')
    return (
      <p className="flex items-center gap-1 text-xs text-purple-200/60">
        <Loader2 className="h-3 w-3 animate-spin" /> Sending…
      </p>
    );
  if (row.status === 'paid')
    return (
      <a
        href={row.hash ? getExplorerUrl(row.hash) : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
      >
        <Check className="h-3 w-3" /> Paid <ArrowUpRight className="h-3 w-3" />
      </a>
    );
  if (row.status === 'error')
    return (
      <p className="flex items-center gap-1 text-xs text-red-300">
        <AlertCircle className="h-3 w-3" /> {row.error || 'Failed'}
      </p>
    );
  return <p className="text-xs text-purple-200/55">Ready</p>;
}
