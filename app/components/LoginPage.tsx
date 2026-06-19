'use client';

import { WalletSelectionModal } from './wallet-selection-modal';
import { ShieldCheck, Lock, Scale, Wallet, Cpu, BadgeCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0613] text-white flex items-center justify-center p-4">
      {/* Ambient glow background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/25 blur-[150px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-[#7f13ec]/40 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/40">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-white via-purple-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Zoopfi
          </h1>
          <p className="mt-3 text-balance text-base text-purple-200/70">
            The privacy layer for Stellar payments. Shielded amounts, hidden
            counterparties, every proof verified on-chain.
          </p>
        </div>

        {/* ZK badges */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {[
            [BadgeCheck, 'Live on testnet'],
            [Cpu, 'Groth16 · Poseidon2'],
            [Scale, 'Compliant (ASP)'],
          ].map(([Icon, label], i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-purple-100/80 backdrop-blur">
              <Icon className="h-3.5 w-3.5 text-[#b07bff]" />
              {label as string}
            </span>
          ))}
        </div>

        {/* Feature cards */}
        <div className="mt-7 grid grid-cols-3 gap-3">
          {[
            [Lock, 'Shielded', 'amounts hidden'],
            [Scale, 'Compliant', 'ASP allow-lists'],
            [Wallet, 'Any wallet', 'Privy or kit'],
          ].map(([Icon, title, sub], i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center backdrop-blur">
              <div className="mb-1.5 flex justify-center text-[#b07bff]">{(() => { const I = Icon as typeof Lock; return <I className="h-5 w-5" />; })()}</div>
              <p className="text-sm font-semibold">{title as string}</p>
              <p className="text-[11px] text-purple-200/60">{sub as string}</p>
            </div>
          ))}
        </div>

        {/* Connect */}
        <div className="mt-7">
          <WalletSelectionModal>
            <button className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">
              Connect wallet
            </button>
          </WalletSelectionModal>
          <p className="mt-3 text-center text-xs text-purple-200/60">
            Social login or any Stellar wallet — Freighter · xBull · Albedo · Lobstr
          </p>
        </div>

        {/* Trust footer */}
        <div className="mt-8 border-t border-white/5 pt-5">
          <div className="flex flex-wrap justify-center gap-4">
            {['Non-custodial', 'On-chain ZK verification', 'Powered by Stellar'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-purple-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
