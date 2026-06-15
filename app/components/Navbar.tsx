'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/send', label: 'Send', icon: '📤' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/receive', label: 'Receive', icon: '📥' },
  { href: '/history', label: 'History', icon: '📜' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 glass-strong"
      style={{
        paddingBottom: 'var(--safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all touch-target ${
                  isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                }}
              >
                <span className={`text-2xl mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span 
                  className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-gray-400'}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
