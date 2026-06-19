'use client';
/**
 * Shared layout primitives — the design system every page is built from, so
 * width, padding, headers, cards and action tiles are identical everywhere.
 *
 * Rules of the system:
 *  - ONE content width: `wide` (max-w-5xl) for dashboards/lists, `focused`
 *    (max-w-md, centered) for single-action screens (pay/swap/earn/private).
 *  - ONE card: `.surface` glass (white/4 + hairline border + blur), rounded-2xl.
 *  - ONE radius scale: cards rounded-2xl, controls rounded-xl, pills rounded-full.
 *  - Restrained palette: purple brand + glass; semantic colors only as small
 *    icon accents, never as big gradient blocks.
 */
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Accent = 'purple' | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose';

const ACCENT: Record<Accent, string> = {
  purple: 'bg-[#9b3bff]/15 text-[#c89bff]',
  blue: 'bg-blue-500/15 text-blue-300',
  violet: 'bg-violet-500/15 text-violet-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  rose: 'bg-rose-500/15 text-rose-300',
};

/** Consistent page width + padding. `focused` centers a narrow single-action column. */
export function PageShell({
  children,
  variant = 'wide',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'wide' | 'focused';
  className?: string;
}) {
  const width = variant === 'focused' ? 'max-w-md' : 'max-w-5xl';
  return (
    <div className={`mx-auto w-full ${width} px-4 py-6 sm:px-6 sm:py-8 ${className}`}>{children}</div>
  );
}

/** Consistent page heading: optional icon chip + title + subtitle, optional right action. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  accent = 'purple',
  action,
  center = false,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: Accent;
  action?: React.ReactNode;
  center?: boolean;
}) {
  if (center) {
    return (
      <div className="mb-8 flex flex-col items-center text-center">
        {Icon && (
          <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${ACCENT[accent]}`}>
            <Icon className="h-6 w-6" />
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-md text-balance text-sm text-purple-200/60">{subtitle}</p>}
      </div>
    );
  }
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ACCENT[accent]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-purple-200/60">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** The one card. Glass surface, rounded-2xl, consistent padding. */
export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
}) {
  return <Tag className={`surface rounded-2xl p-5 sm:p-6 ${className}`}>{children}</Tag>;
}

/** Glass quick-action tile (replaces loud gradient blocks). Icon accent only. */
export function ActionTile({
  href,
  icon: Icon,
  title,
  subtitle,
  accent = 'purple',
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: Accent;
}) {
  return (
    <Link href={href} className="surface lift group flex items-center gap-3.5 rounded-2xl p-4 sm:p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT[accent]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white">{title}</p>
        {subtitle && <p className="truncate text-xs text-purple-200/55">{subtitle}</p>}
      </div>
    </Link>
  );
}

/** Small stat tile (label + value), glass, consistent. */
export function StatTile({
  label,
  value,
  icon: Icon,
  accent = 'purple',
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
}) {
  return (
    <div className="surface flex items-center gap-3 rounded-2xl p-4">
      {Icon && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ACCENT[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-purple-200/55">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}
