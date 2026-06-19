/**
 * Single source of truth for app navigation. Both the desktop top navbar and
 * the mobile bottom bar render from these definitions, so Personal and Business
 * modes stay consistent across every surface. Keep this in sync with the routes
 * under app/.
 */
import {
  Home,
  ArrowDownUp,
  TrendingUp,
  Shield,
  History,
  Users,
  FileText,
  Briefcase,
  Send,
  CreditCard,
  Trophy,
  Settings,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import type { AccountType } from './api';

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Extra path prefixes that should also mark this item active. */
  match?: string[];
  /** Render in the mobile bottom bar (max 4 alongside the center action). */
  mobile?: boolean;
}

export interface PrimaryAction {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: string[];
}

/* ----------------------------- Personal ----------------------------- */
const personalPrimary: NavItem[] = [
  { href: '/dashboard', label: 'Home', Icon: Home, mobile: true },
  { href: '/swap', label: 'Swap', Icon: ArrowDownUp, mobile: true },
  { href: '/vault', label: 'Earn', Icon: TrendingUp },
  { href: '/shielded', label: 'Private', Icon: Shield, match: ['/private'], mobile: true },
  { href: '/history', label: 'Activity', Icon: History, mobile: true },
];

const personalOverflow: NavItem[] = [
  { href: '/vault', label: 'Earn', Icon: TrendingUp },
  { href: '/groups', label: 'Groups', Icon: Receipt },
  { href: '/contacts', label: 'Friends', Icon: Users },
  { href: '/rewards', label: 'Rewards', Icon: Trophy },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

const personalAction: PrimaryAction = {
  href: '/',
  label: 'Pay',
  Icon: Send,
  match: ['/', '/transact', '/send', '/receive'],
};

/* ----------------------------- Business ----------------------------- */
const businessPrimary: NavItem[] = [
  { href: '/dashboard', label: 'Home', Icon: Home, mobile: true },
  { href: '/business/payroll', label: 'Payroll', Icon: Users, mobile: true },
  { href: '/invoices', label: 'Invoices', Icon: FileText },
  { href: '/contacts', label: 'Customers', Icon: Briefcase, mobile: true },
  { href: '/history', label: 'Activity', Icon: History, mobile: true },
];

const businessOverflow: NavItem[] = [
  { href: '/invoices', label: 'Invoices', Icon: FileText },
  { href: '/vault', label: 'Earn', Icon: TrendingUp },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

const businessAction: PrimaryAction = {
  href: '/transact?mode=receive',
  label: 'Accept',
  Icon: CreditCard,
  match: ['/transact', '/receive'],
};

export interface NavConfig {
  primary: NavItem[];
  overflow: NavItem[];
  action: PrimaryAction;
}

export function getNav(accountType: AccountType): NavConfig {
  return accountType === 'business'
    ? { primary: businessPrimary, overflow: businessOverflow, action: businessAction }
    : { primary: personalPrimary, overflow: personalOverflow, action: personalAction };
}

/** Whether a nav item is active for the current pathname. */
export function isItemActive(pathname: string, href: string, match?: string[]): boolean {
  const base = href.split('?')[0];
  if (pathname === base) return true;
  if (base !== '/' && pathname.startsWith(base + '/')) return true;
  return (match ?? []).some((m) => pathname === m || (m !== '/' && pathname.startsWith(m + '/')));
}
