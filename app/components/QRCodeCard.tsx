'use client';

import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

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
  }, [username, amount]);

  // Share functionality
  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'Pay with SuperPay',
      text: `Send ${amount ? `${amount} MOVE` : 'payment'} to @${username} on SuperPay`,
      url: `https://superpay.app/send?to=${username}${amount ? `&amount=${amount}` : ''}`,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        onShare?.();
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      await copyLink();
      onShare?.();
    }
  }, [username, amount, copyLink, onShare]);

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Card */}
      <div
        ref={cardRef}
        className="relative p-1 rounded-3xl animate-fade-in-up"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 20px 60px -15px rgba(16, 185, 129, 0.4)',
        }}
      >
        {/* Inner card */}
        <div 
          className="relative rounded-[22px] p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%)',
          }}
        >
          {/* Background pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* QR Code Container */}
          <div className="relative">
            {/* Decorative corner accents */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-500/50 rounded-tl-lg" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-emerald-500/50 rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-emerald-500/50 rounded-bl-lg" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-500/50 rounded-br-lg" />

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={getPaymentUrl()}
                size={200}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0a0a0f"
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
              <span className="text-emerald-400 text-lg">@</span>
              <span className="text-2xl font-bold text-white tracking-tight">
                {username}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </p>
          </div>

          {/* Amount Badge (if specified) */}
          {amount && (
            <div className="mt-4 flex justify-center">
              <div 
                className="px-4 py-2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span className="text-emerald-400 font-bold">{amount} MOVE</span>
              </div>
            </div>
          )}

          {/* Branding */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 512 512" className="opacity-50">
              <defs>
                <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981"/>
                  <stop offset="100%" stopColor="#059669"/>
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
            <span className="text-xs text-gray-500 font-medium">SuperPay</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 w-full max-w-xs">
        <button
          onClick={copyLink}
          className="flex-1 btn btn-secondary flex items-center justify-center gap-2 py-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Link
        </button>
        <button
          onClick={handleShare}
          className="flex-1 btn btn-primary flex items-center justify-center gap-2 py-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
      </div>

      {/* Scan instructions */}
      <p className="mt-4 text-center text-sm text-gray-500">
        Scan with SuperPay or any QR scanner
      </p>
    </div>
  );
}

