'use client';
/**
 * AppShell — the single unified chrome for the whole app. Replaces the old
 * split between AppNav (home) and DashboardLayout/Sidebar (inner pages):
 *
 *   • Desktop: a sticky top navbar (logo · primary tabs with a sliding active
 *     pill · live balance · Pay/Accept action · account menu).
 *   • Mobile: a sticky top header + a bottom tab bar with a center action FAB.
 *
 * Every page sits on one deep canvas with shared ambient glows, so navigating
 * Pay → Swap → Activity → Earn feels like one product. Personal vs Business is
 * driven by the real account type (useUser) via the shared nav config.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Wallet,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { useWallet, formatBalance } from '@/app/lib/chain';
import { useUser, useBalance } from '@/app/lib/hooks';
import { getNav, isItemActive, type NavItem, type PrimaryAction } from '@/app/lib/nav';
import type { AccountType } from '@/app/lib/api';
import { WalletSelectionModal } from '../wallet-selection-modal';
import NotificationBell from '../NotificationBell';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, isConnected } = useWallet();
  const { data: user } = useUser();
  const accountType: AccountType = user?.accountType ?? 'personal';
  const isBusiness = accountType === 'business';
  const { primary, overflow, action } = getNav(accountType);

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0a0512] text-white">
      <AmbientGlow business={isBusiness} />

      {/* Desktop top navbar */}
      <header className="surface-rail sticky top-0 z-50 hidden border-b border-white/10 md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-7">
            <Brand isBusiness={isBusiness} />
            <NavTabs items={primary} pathname={pathname} isBusiness={isBusiness} />
          </div>
          <div className="flex items-center gap-2.5">
            {isConnected && <BalanceChip />}
            {isConnected && <ActionButton action={action} pathname={pathname} isBusiness={isBusiness} />}
            {isConnected ? (
              <AccountMenu
                accountType={accountType}
                overflow={overflow}
                username={user?.username}
                displayName={user?.displayName}
                avatarUrl={user?.avatarUrl}
                address={address}
              />
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </header>

      {/* Mobile top header */}
      <header className="surface-rail sticky top-0 z-40 flex items-center justify-between border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <Brand isBusiness={isBusiness} />
        <div className="flex items-center gap-1.5">
          {address && <NotificationBell walletAddress={address} />}
          {isConnected ? (
            <AccountMenu
              accountType={accountType}
              overflow={overflow}
              username={user?.username}
              displayName={user?.displayName}
              avatarUrl={user?.avatarUrl}
              address={address}
              compact
            />
          ) : (
            <ConnectButton compact />
          )}
        </div>
      </header>

      {/* Page content — re-keyed on route so it animates in on every navigation */}
      <main
        key={pathname}
        className="animate-page-enter relative z-10 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10"
      >
        {children}
      </main>

      {/* Mobile bottom bar */}
      <BottomNav items={primary} action={action} pathname={pathname} isBusiness={isBusiness} />
    </div>
  );
}

/* ----------------------------- Ambient glow ----------------------------- */
function AmbientGlow({ business }: { business: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className={`animate-float-slow absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[150px] ${
          business ? 'bg-[#6a10c7]/20' : 'bg-[#7f13ec]/20'
        }`}
      />
      <div className="animate-float absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-[130px]" />
      <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-indigo-700/10 blur-[140px]" />
    </div>
  );
}

/* ----------------------------- Brand ----------------------------- */
function Brand({ isBusiness }: { isBusiness: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/30">
        {isBusiness ? (
          <Building2 className="h-5 w-5 text-white" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-white" />
        )}
      </span>
      <span className="text-gradient-brand text-lg font-bold tracking-tight">Zoopfi</span>
      {isBusiness && (
        <span className="ml-0.5 rounded-md bg-[#9b3bff]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#c89bff]">
          BUSINESS
        </span>
      )}
    </Link>
  );
}

/* ----------------------------- Desktop tabs ----------------------------- */
function NavTabs({
  items,
  pathname,
  isBusiness,
}: {
  items: NavItem[];
  pathname: string;
  isBusiness: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const measure = () => {
      const active = items.find((it) => isItemActive(pathname, it.href, it.match));
      const el = active ? linkRefs.current[active.href] : null;
      const cont = containerRef.current;
      if (el && cont) {
        const r = el.getBoundingClientRect();
        const cr = cont.getBoundingClientRect();
        setPill({ left: r.left - cr.left, width: r.width, opacity: 1 });
      } else {
        setPill((p) => ({ ...p, opacity: 0 }));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname, items]);

  return (
    <nav ref={containerRef} className="relative hidden items-center gap-0.5 lg:flex">
      <span
        className="nav-pill pointer-events-none absolute top-1/2 -z-0 h-9 -translate-y-1/2 rounded-xl bg-white/10 ring-1 ring-white/10"
        style={{ left: pill.left, width: pill.width, opacity: pill.opacity }}
      />
      {items.map((it) => {
        const active = isItemActive(pathname, it.href, it.match);
        return (
          <Link
            key={it.href}
            href={it.href}
            ref={(el) => {
              linkRefs.current[it.href] = el;
            }}
            className={`relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
              active ? 'text-white' : 'text-purple-200/55 hover:text-white'
            }`}
          >
            <it.Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ----------------------------- Balance chip ----------------------------- */
function BalanceChip() {
  const { data: balance = 0 } = useBalance('USDC');
  return (
    <Link
      href="/dashboard"
      className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition-colors hover:border-white/20 lg:flex"
    >
      <Wallet className="h-4 w-4 text-[#b07bff]" />
      <span className="font-semibold tabular-nums">{formatBalance(balance)}</span>
      <span className="text-xs text-purple-200/50">USDC</span>
    </Link>
  );
}

/* ----------------------------- Action button ----------------------------- */
function ActionButton({
  action,
  pathname,
  isBusiness,
}: {
  action: PrimaryAction;
  pathname: string;
  isBusiness: boolean;
}) {
  const active = isItemActive(pathname, action.href, action.match);
  return (
    <Link
      href={action.href}
      className={`group relative hidden items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-shadow sm:flex ${
        isBusiness
          ? 'bg-gradient-to-r from-[#a855f7] to-[#7e22ce] shadow-[#9333ea]/30'
          : 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] shadow-[#7f13ec]/30'
      } ${active ? 'ring-2 ring-white/30' : 'hover:shadow-[#7f13ec]/50'}`}
    >
      <action.Icon className="h-4 w-4" />
      {action.label}
      <span className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:animate-[sheen_1s_ease] group-hover:opacity-100" />
    </Link>
  );
}

/* ----------------------------- Connect button ----------------------------- */
function ConnectButton({ compact }: { compact?: boolean }) {
  return (
    <WalletSelectionModal>
      <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">
        <Wallet className="h-4 w-4" />
        {compact ? 'Connect' : 'Connect wallet'}
      </button>
    </WalletSelectionModal>
  );
}

/* ----------------------------- Account menu ----------------------------- */
function AccountMenu({
  accountType,
  overflow,
  username,
  displayName,
  avatarUrl,
  address,
  compact,
}: {
  accountType: AccountType;
  overflow: NavItem[];
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  address: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { logout } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isBusiness = accountType === 'business';

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = (displayName || username || '?')[0]?.toUpperCase();
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-1 pr-1.5 transition-colors hover:border-white/20"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar initial={initial} avatarUrl={avatarUrl} isBusiness={isBusiness} />
        {!compact && (
          <ChevronDown
            className={`h-4 w-4 text-purple-200/60 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#120c1c]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* Identity */}
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <Avatar initial={initial} avatarUrl={avatarUrl} isBusiness={isBusiness} lg />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {displayName || (username ? `@${username}` : 'My account')}
              </p>
              <button
                onClick={copy}
                className="mt-0.5 flex items-center gap-1 font-mono text-xs text-purple-200/60 transition-colors hover:text-white"
              >
                {short}
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Links */}
          <nav className="p-1.5">
            {overflow.map((it) => (
              <Link
                key={it.href + it.label}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-200/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <it.Icon className="h-4 w-4" />
                {it.label}
              </Link>
            ))}
          </nav>

          {/* Mode + logout */}
          <div className="border-t border-white/10 p-1.5">
            <Link
              href={isBusiness ? '/dashboard' : '/business'}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-purple-200/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <span className="flex items-center gap-3">
                <Building2 className="h-4 w-4" />
                {isBusiness ? 'Business workspace' : 'For Business'}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  initial,
  avatarUrl,
  isBusiness,
  lg,
}: {
  initial: string;
  avatarUrl?: string;
  isBusiness: boolean;
  lg?: boolean;
}) {
  const size = lg ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm';
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={`${size} rounded-lg object-cover`} />;
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-lg font-bold text-white ${
        isBusiness
          ? 'bg-gradient-to-br from-[#a855f7] to-[#7e22ce]'
          : 'bg-gradient-to-br from-[#9b3bff] to-[#6a10c7]'
      }`}
    >
      {initial}
    </span>
  );
}

/* ----------------------------- Mobile bottom bar ----------------------------- */
function BottomNav({
  items,
  action,
  pathname,
  isBusiness,
}: {
  items: NavItem[];
  action: PrimaryAction;
  pathname: string;
  isBusiness: boolean;
}) {
  const tabs = items.filter((it) => it.mobile).slice(0, 4);
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  return (
    <nav className="surface-rail fixed inset-x-0 bottom-0 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="relative mx-auto flex max-w-md items-center justify-around px-2">
        {left.map((it) => (
          <BottomTab key={it.href} item={it} pathname={pathname} />
        ))}

        {/* Center action FAB */}
        <Link
          href={action.href}
          aria-label={action.label}
          className={`animate-fab relative -mt-7 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-xl ${
            isBusiness
              ? 'bg-gradient-to-br from-[#a855f7] to-[#7e22ce]'
              : 'bg-gradient-to-br from-[#9b3bff] to-[#6a10c7]'
          }`}
        >
          <action.Icon className="h-6 w-6" />
        </Link>

        {right.map((it) => (
          <BottomTab key={it.href} item={it} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function BottomTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isItemActive(pathname, item.href, item.match);
  return (
    <Link
      href={item.href}
      className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-transform active:scale-90"
    >
      <item.Icon
        className={`h-6 w-6 transition-colors ${active ? 'text-[#b07bff]' : 'text-purple-200/45'}`}
      />
      <span
        className={`text-[10px] font-medium transition-colors ${
          active ? 'text-white' : 'text-purple-200/45'
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}
