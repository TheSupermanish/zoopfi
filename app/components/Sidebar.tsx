'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Shield,
  Receipt,
  History,
  Users,
  Trophy,
  Settings,
  CreditCard,
  FileText,
  Wallet,
  Building2,
  LogOut,
} from 'lucide-react';
import { useWallet } from '@/app/lib/chain';
import ThemeToggle from './ThemeToggle';
import { AccountType } from '../lib/api';

interface SidebarProps {
  username?: string;
  walletAddress?: string;
  accountType?: AccountType;
  displayName?: string;
  avatarUrl?: string;
}

const personalNavItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/transact', label: 'Transact', Icon: ArrowLeftRight },
  { href: '/shielded', label: 'Private', Icon: Shield },
  { href: '/groups', label: 'Groups', Icon: Receipt },
  { href: '/history', label: 'History', Icon: History },
  { href: '/contacts', label: 'Friends', Icon: Users },
  { href: '/rewards', label: 'Rewards', Icon: Trophy },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

const businessNavItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/transact', label: 'Payments', Icon: CreditCard },
  { href: '/invoices', label: 'Invoices', Icon: FileText },
  { href: '/shielded', label: 'Private', Icon: Shield },
  { href: '/history', label: 'History', Icon: History },
  { href: '/contacts', label: 'Customers', Icon: Users },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export default function Sidebar({ 
  username, 
  walletAddress, 
  accountType = 'personal',
  displayName,
  avatarUrl 
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, isConnected, logout } = useWallet();

  const isBusiness = accountType === 'business';
  const navItems = isBusiness ? businessNavItems : personalNavItems;

  const handleLogout = async () => {
    try {
      if (authenticated || isConnected) {
        await logout();
      }
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get display character for avatar
  const getAvatarChar = () => {
    if (displayName) return displayName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    return '?';
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-full border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#191022] p-6 justify-between">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xl ${
            isBusiness ? 'bg-purple-600' : 'bg-[#7f13ec]'
          }`}>
            {isBusiness ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              Zoopfi
            </h1>
            <div className="flex items-center gap-1.5">
              {isBusiness && (
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  BUSINESS
                </span>
              )}
            <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-medium">Stellar Network</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const activeColor = isBusiness ? 'bg-purple-600' : 'bg-[#7f13ec]';
            const shadowColor = isBusiness 
              ? '0 10px 40px -10px rgba(147, 51, 234, 0.5)' 
              : '0 10px 40px -10px rgba(127, 19, 236, 0.5)';
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? `${activeColor} text-white shadow-lg`
                    : 'text-slate-600 dark:text-[#ad92c9] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                style={{
                  boxShadow: isActive ? shadowColor : 'none'
                }}
              >
                <item.Icon className="w-5 h-5" />
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-8 flex flex-col gap-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-slate-100 dark:bg-[#251a30]">
          <span className="text-sm font-medium text-slate-600 dark:text-[#ad92c9]">Theme</span>
          <ThemeToggle showLabel />
        </div>

        {/* User/Business Info Card */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isBusiness 
            ? 'bg-purple-500/5 border-purple-500/20' 
            : 'bg-slate-100 dark:bg-[#251a30] border-slate-200 dark:border-white/5'
        }`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName || username || 'User'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              isBusiness 
                ? 'bg-gradient-to-br from-purple-600 to-purple-400' 
                : 'bg-gradient-to-br from-[#7f13ec] to-[#a855f7]'
            }`}>
              {getAvatarChar()}
          </div>
          )}
          <div className="flex flex-col overflow-hidden flex-1">
            {isBusiness ? (
              <>
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {displayName || 'Business'}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#ad92c9] truncate">
                  @{username || 'user'}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {displayName ? displayName : `@${username || 'user'}`}
                </p>
            <p className="text-xs text-slate-500 dark:text-[#ad92c9] truncate font-mono">
              {walletAddress ? truncateAddress(walletAddress) : 'Not connected'}
            </p>
              </>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl h-12 px-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm font-bold"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
