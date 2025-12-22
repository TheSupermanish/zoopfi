'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
  username?: string;
  walletAddress?: string;
}

const mobileNavItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/transact', label: 'Transact', icon: '💸' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/contacts', label: 'Friends', icon: '👥' },
  { href: '/history', label: 'History', icon: '📜' },
];

export default function DashboardLayout({ children, username, walletAddress }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#191022]">
      {/* Desktop Sidebar */}
      <Sidebar username={username} walletAddress={walletAddress} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#191022] sticky top-0 z-20 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#7f13ec] flex items-center justify-center text-white">
              💸
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">SuperPay</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {walletAddress && <NotificationBell walletAddress={walletAddress} />}
            {/* Profile Avatar */}
            <Link 
              href="/settings"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 hover:border-white/40 transition-all"
            >
              {username ? username[0].toUpperCase() : '?'}
            </Link>
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
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                    isActive ? 'text-[#7f13ec]' : 'text-slate-400 dark:text-[#ad92c9]'
                  }`}
                >
                  <span className={`text-2xl mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
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
