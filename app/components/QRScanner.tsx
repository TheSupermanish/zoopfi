'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: { username: string; amount?: string }) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    if (scannerRef.current || isStarting) return;
    
    setIsStarting(true);
    setError('');

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore scan failures (happens every frame without QR)
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.toString().includes('Permission')) {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.toString().includes('NotFound')) {
        setError('No camera found on this device.');
      } else {
        setError('Could not start camera. Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    // Vibrate on success if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Parse the QR code data
    // Format: superpay://pay?to=username&amount=X
    // Or just: @username
    // Or just: username
    
    let username = '';
    let amount: string | undefined;

    try {
      if (decodedText.startsWith('superpay://')) {
        const url = new URL(decodedText);
        username = url.searchParams.get('to') || '';
        amount = url.searchParams.get('amount') || undefined;
      } else if (decodedText.startsWith('@')) {
        username = decodedText.slice(1);
      } else if (decodedText.includes('?to=')) {
        // Handle web URL format: https://superpay.app/send?to=username
        const url = new URL(decodedText);
        username = url.searchParams.get('to') || '';
        amount = url.searchParams.get('amount') || undefined;
      } else {
        // Assume it's just a username
        username = decodedText;
      }

      // Clean up username
      username = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

      if (username) {
        stopScanner();
        onScan({ username, amount });
        onClose();
      } else {
        setError('Invalid QR code. Please scan a SuperPay QR.');
      }
    } catch (err) {
      setError('Invalid QR code format.');
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between z-10">
        <button
          onClick={handleClose}
          className="p-2 rounded-xl glass touch-target"
        >
          <span className="text-xl text-white">✕</span>
        </button>
        <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Scanner Container */}
      <div className="relative w-full max-w-sm mx-4">
        {/* Scanner viewport */}
        <div 
          id="qr-reader" 
          ref={containerRef}
          className="rounded-2xl overflow-hidden bg-black"
          style={{ minHeight: '300px' }}
        />

        {/* Scanning overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-emerald-500 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-emerald-500 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-emerald-500 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-emerald-500 rounded-br-2xl" />
          
          {/* Scanning line animation */}
          <div 
            className="absolute left-4 right-4 h-0.5 bg-emerald-500"
            style={{
              animation: 'scan-line 2s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
            }}
          />
        </div>

        {/* Loading state */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-white">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl p-6">
            <div className="text-center">
              <span className="text-4xl mb-4 block">📷</span>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={startScanner}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe text-center">
        <p className="text-gray-400 text-sm">
          Point your camera at a SuperPay QR code
        </p>
      </div>

      {/* Scan line animation */}
      <style jsx>{`
        @keyframes scan-line {
          0%, 100% {
            top: 10%;
          }
          50% {
            top: 90%;
          }
        }
      `}</style>
    </div>
  );
}

