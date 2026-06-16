'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeftRight,
  Shield,
  Users,
  History,
  CreditCard,
  FileText,
  Settings,
  Wallet,
  Building2,
} from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { AccountType } from '../lib/api';
import { useWallet } from '../lib/chain';
import { useUser } from '../lib/hooks';

interface DashboardLayoutProps {
  children: React.ReactNode;
  username?: string;
  walletAddress?: string;
  accountType?: AccountType;
  displayName?: string;
  avatarUrl?: string;
}

const personalMobileNavItems = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/transact', label: 'Transact', Icon: ArrowLeftRight },
  { href: '/private', label: 'Private', Icon: Shield },
  { href: '/groups', label: 'Groups', Icon: Users },
  { href: '/history', label: 'History', Icon: History },
];

const businessMobileNavItems = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/transact', label: 'Payments', Icon: CreditCard },
  { href: '/invoices', label: 'Invoices', Icon: FileText },
  { href: '/history', label: 'History', Icon: History },
  { href: '/contacts', label: 'Customers', Icon: Users },
];

export default function DashboardLayout({
  children,
  username: usernameProp,
  walletAddress: walletAddressProp,
  accountType: accountTypeProp,
  displayName: displayNameProp,
  avatarUrl: avatarUrlProp,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { address } = useWallet();
  // Cached app-wide (TanStack Query) so the shell resolves business vs personal
  // instantly on navigation instead of refetching + flickering on each page.
  const { data: resolved } = useUser();

  const accountType: AccountType = accountTypeProp ?? resolved?.accountType ?? 'personal';
  const username = usernameProp ?? resolved?.username;
  const displayName = displayNameProp ?? resolved?.displayName;
  const avatarUrl = avatarUrlProp ?? resolved?.avatarUrl;
  const walletAddress = walletAddressProp ?? address ?? undefined;

  const isBusiness = accountType === 'business';
  const mobileNavItems = isBusiness ? businessMobileNavItems : personalMobileNavItems;

  // Get display character for avatar
  const getAvatarChar = () => {
    if (displayName) return displayName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    return '?';
  };

  return (
    <div className="flex h-dvh w-full bg-slate-50 dark:bg-[#191022]">
      {/* Desktop Sidebar */}
      <Sidebar 
        username={username} 
        walletAddress={walletAddress} 
        accountType={accountType}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-[#191022] sticky top-0 z-20 border-b border-slate-200 dark:border-white/5 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                isBusiness ? 'bg-purple-600' : 'bg-[#7f13ec]'
              }`}>
                {isBusiness ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                  {isBusiness ? (displayName || 'Business') : 'Zoopfi'}
                </span>
                {isBusiness && (
                  <span className="text-[10px] font-bold text-purple-400">BUSINESS</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {walletAddress && <NotificationBell walletAddress={walletAddress} />}
              {/* Profile Avatar */}
              <Link 
                href="/settings"
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 hover:border-white/40 transition-all overflow-hidden ${
                  isBusiness 
                    ? 'bg-gradient-to-br from-purple-600 to-purple-400' 
                    : 'bg-gradient-to-br from-[#7f13ec] to-[#a855f7]'
                }`}
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName || username || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getAvatarChar()
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 pb-20 lg:pb-0">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#251a30] border-t border-slate-200 dark:border-white/5 pb-safe">
          <div className="flex justify-around items-center py-2">
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href;
              const activeColor = isBusiness ? 'text-purple-600' : 'text-[#7f13ec]';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                    isActive ? activeColor : 'text-slate-400 dark:text-[#ad92c9]'
                  }`}
                >
                  <span className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                    <item.Icon className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
