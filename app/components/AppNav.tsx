'use client';
/**
 * Jupiter-style top nav: logo + product tabs + Connect (right). App-first —
 * shown on the landing so users are in the product immediately, not a marketing page.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Wallet } from 'lucide-react';
import { useWallet } from '@/app/lib/chain';
import { WalletSelectionModal } from './wallet-selection-modal';

const TABS = [
  { href: '/', label: 'Pay' },
  { href: '/swap', label: 'Swap' },
  { href: '/vault', label: 'Earn' },
  { href: '/shielded', label: 'Private' },
];

export default function AppNav() {
  const pathname = usePathname();
  const { isConnected, address } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0613]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <span className="bg-gradient-to-r from-white to-[#c89bff] bg-clip-text text-lg font-bold text-transparent">
              Zoopfi
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-purple-200/60 hover:text-white'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {isConnected ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-[#9b3bff]/50"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs">{address.slice(0, 4)}…{address.slice(-4)}</span>
          </Link>
        ) : (
          <WalletSelectionModal>
            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">
              <Wallet className="h-4 w-4" /> Connect
            </button>
          </WalletSelectionModal>
        )}
      </div>
      {/* mobile tabs */}
      <nav className="flex items-center justify-around border-t border-white/5 px-2 py-1.5 sm:hidden">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${pathname === t.href ? 'text-white' : 'text-purple-200/60'}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
