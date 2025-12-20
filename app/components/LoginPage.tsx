'use client';

import { WalletSelectionModal } from './wallet-selection-modal';

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-accent)' }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-purple)' }}
        />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo Card */}
        <div className="card p-8 md:p-10 text-center">
          {/* App Icon */}
          <div className="mb-6 flex justify-center">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse-glow"
              style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)'
              }}
            >
              <svg width="48" height="48" viewBox="0 0 512 512">
                <g transform="translate(256, 256)">
                  <circle cx="0" cy="0" r="140" fill="none" stroke="white" strokeWidth="16" opacity="0.3"/>
                  <path d="M-50,-80 Q-80,-80 -80,-50 Q-80,-20 -40,-10 L40,10 Q80,20 80,50 Q80,80 50,80" 
                        fill="none" stroke="white" strokeWidth="24" strokeLinecap="round"/>
                  <line x1="0" y1="-110" x2="0" y2="-70" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                  <line x1="0" y1="70" x2="0" y2="110" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                </g>
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            SuperPay
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Send crypto by username
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="card-solid p-3 rounded-xl">
              <div className="text-2xl mb-1">⚡</div>
              <p className="text-xs text-gray-400">Instant</p>
            </div>
            <div className="card-solid p-3 rounded-xl">
              <div className="text-2xl mb-1">🔒</div>
              <p className="text-xs text-gray-400">Secure</p>
            </div>
            <div className="card-solid p-3 rounded-xl">
              <div className="text-2xl mb-1">🎁</div>
              <p className="text-xs text-gray-400">Rewards</p>
            </div>
          </div>

          {/* Connect Button */}
          <WalletSelectionModal>
            <button className="w-full btn btn-primary py-4 text-lg">
              Connect Wallet
            </button>
          </WalletSelectionModal>

          {/* Trust badges */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-xs text-gray-500 mb-3">
              Powered by Movement Network
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <span className="text-emerald-500">●</span> Non-custodial
              </span>
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <span className="text-emerald-500">●</span> Low fees
              </span>
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <span className="text-emerald-500">●</span> Decentralized
              </span>
            </div>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Version 1.0.0
        </p>
      </div>
    </div>
  );
}
