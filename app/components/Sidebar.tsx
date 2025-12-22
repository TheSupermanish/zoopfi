'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  username?: string;
  walletAddress?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/transact', label: 'Transact', icon: '💸' },
  { href: '/groups', label: 'Groups', icon: '🧾' },
  { href: '/history', label: 'History', icon: '📜' },
  { href: '/contacts', label: 'Friends', icon: '👥' },
  { href: '/rewards', label: 'Rewards', icon: '🏆' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ username, walletAddress }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: privyLogout, authenticated } = usePrivy();
  const { disconnect, connected } = useWallet();

  const handleLogout = async () => {
    try {
      if (authenticated) {
        await privyLogout();
      }
      if (connected) {
        await disconnect();
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

  return (
    <aside className="hidden lg:flex flex-col w-72 h-full border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#191022] p-6 justify-between">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[#7f13ec] flex items-center justify-center text-white text-xl">
            💸
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900 dark:text-white">SuperPay</h1>
            <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-medium">Movement Network</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#7f13ec] text-white shadow-lg'
                    : 'text-slate-600 dark:text-[#ad92c9] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                style={{
                  boxShadow: isActive ? '0 10px 40px -10px rgba(127, 19, 236, 0.5)' : 'none'
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-slate-100 dark:bg-[#251a30]">
          <span className="text-sm font-medium text-slate-600 dark:text-[#ad92c9]">Theme</span>
          <ThemeToggle showLabel />
        </div>

        {/* User Info Card */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#251a30] border border-slate-200 dark:border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center text-white font-bold">
            {username ? username[0].toUpperCase() : '?'}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">@{username || 'user'}</p>
            <p className="text-xs text-slate-500 dark:text-[#ad92c9] truncate font-mono">
              {walletAddress ? truncateAddress(walletAddress) : 'Not connected'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl h-12 px-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm font-bold"
        >
          <span>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

