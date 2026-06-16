'use client';

import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2 } from 'lucide-react';

interface QRCodeCardProps {
  username: string;
  amount?: string;
  walletAddress: string;
  onShare?: () => void;
}

export default function QRCodeCard({ username, amount, walletAddress, onShare }: QRCodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate payment URL
  const getPaymentUrl = () => {
    const base = `superpay://pay?to=${username}`;
    return amount ? `${base}&amount=${amount}` : base;
  };

  // Copy payment link
  const copyLink = useCallback(async () => {
    const link = `https://superpay.app/send?to=${username}${amount ? `&amount=${amount}` : ''}`;
    await navigator.clipboard.writeText(link);
    onShare?.();
  }, [username, amount, onShare]);

  // Share functionality
  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'Pay with Zoopfi',
      text: `Send ${amount ? `${amount} USDC` : 'payment'} to @${username} on Zoopfi`,
      url: `https://superpay.app/send?to=${username}${amount ? `&amount=${amount}` : ''}`,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        onShare?.();
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await copyLink();
    }
  }, [username, amount, copyLink, onShare]);

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Card */}
      <div
        ref={cardRef}
        className="relative p-1 rounded-3xl animate-fade-in-up"
        style={{
          background: 'linear-gradient(135deg, #7f13ec 0%, #a855f7 50%, #6366f1 100%)',
          boxShadow: '0 20px 60px -15px rgba(127, 19, 236, 0.4)',
        }}
      >
        {/* Inner card */}
        <div 
          className="relative rounded-[22px] p-6 overflow-hidden bg-white dark:bg-[#251a30]"
        >
          {/* Background pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* QR Code Container */}
          <div className="relative">
            {/* Decorative corner accents */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-[#7f13ec]/50 rounded-tl-lg" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-[#7f13ec]/50 rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-[#7f13ec]/50 rounded-bl-lg" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-[#7f13ec]/50 rounded-br-lg" />

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-lg dark:shadow-none border border-slate-100 dark:border-transparent">
              <QRCodeSVG
                value={getPaymentUrl()}
                size={200}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#191022"
                imageSettings={{
                  src: '/icon.svg',
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Username Display */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[#7f13ec] text-lg font-bold">@</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {username}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#ad92c9] font-mono">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </p>
          </div>

          {/* Amount Badge (if specified) */}
          {amount && (
            <div className="mt-4 flex justify-center">
              <div 
                className="px-4 py-2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(127, 19, 236, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  border: '1px solid rgba(127, 19, 236, 0.3)',
                }}
              >
                <span className="text-[#a855f7] font-bold">{amount} USDC</span>
              </div>
            </div>
          )}

          {/* Branding */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 512 512" className="opacity-50">
              <defs>
                <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7f13ec"/>
                  <stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="96" fill="url(#brandGrad)"/>
              <g transform="translate(256, 256)">
                <path d="M-50,-80 Q-80,-80 -80,-50 Q-80,-20 -40,-10 L40,10 Q80,20 80,50 Q80,80 50,80" 
                      fill="none" stroke="white" strokeWidth="24" strokeLinecap="round"/>
                <line x1="0" y1="-110" x2="0" y2="-70" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                <line x1="0" y1="70" x2="0" y2="110" stroke="white" strokeWidth="20" strokeLinecap="round"/>
              </g>
            </svg>
            <span className="text-xs text-slate-500 dark:text-[#ad92c9] font-medium">Zoopfi</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 w-full max-w-xs">
        <button
          onClick={copyLink}
          className="flex-1 btn btn-secondary flex items-center justify-center gap-2 py-3 h-12"
        >
          <Copy size={18} />
          Copy Link
        </button>
        <button
          onClick={handleShare}
          className="flex-1 btn btn-primary flex items-center justify-center gap-2 py-3 h-12"
        >
          <Share2 size={18} />
          Share
        </button>
      </div>

      {/* Scan instructions */}
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-[#ad92c9]">
        Scan with Zoopfi or any QR scanner
      </p>
    </div>
  );
}
