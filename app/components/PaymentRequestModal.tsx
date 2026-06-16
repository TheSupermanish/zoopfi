'use client';

import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { updatePaymentRequest, recordTransaction, updateStreak, getUserByUsername } from '../lib/api';
import { useWallet, formatBalance } from '@/app/lib/chain';

interface PaymentRequest {
  _id: string;
  requesterUsername: string;
  requesterAddress: string;
  amount: number;
  message?: string;
  status: string;
  createdAt: string;
}

interface PaymentRequestModalProps {
  request: PaymentRequest;
  walletAddress: string;
  senderUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function PaymentRequestModal({
  request,
  walletAddress,
  senderUsername,
  isOpen,
  onClose,
  onComplete,
}: PaymentRequestModalProps) {
  const { ops } = useWallet();

  const [isPaying, setIsPaying] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch balance when modal opens
  useState(() => {
    if (isOpen && walletAddress) {
      ops.getBalance(walletAddress, 'USDC').then((bal) => setBalance(Number(bal)));
    }
  });

  const handlePay = async () => {
    setIsPaying(true);
    setError('');

    try {
      // Check balance
      const currentBalance = Number(await ops.getBalance(walletAddress, 'USDC'));
      if (currentBalance < request.amount) {
        setError('Insufficient balance');
        setIsPaying(false);
        return;
      }

      let txHash: string;

      const result = await ops.sendPayment(request.requesterAddress, String(request.amount), 'USDC', request.message || undefined);
      if (!result.success) throw new Error(result.error || 'Transaction failed. Please try again.');
      txHash = result.hash;

      // Record the transaction
      await recordTransaction({
        senderAddress: walletAddress,
        senderUsername: senderUsername,
        receiverAddress: request.requesterAddress,
        receiverUsername: request.requesterUsername,
        amount: request.amount,
        txHash: txHash,
        type: 'payment_request',
        note: request.message,
      });

      // Update the payment request status
      await updatePaymentRequest(request._id, 'paid', txHash);

      // Update streak
      await updateStreak(walletAddress);

      setSuccess(true);
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError('');

    try {
      await updatePaymentRequest(request._id, 'cancelled');
      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Decline error:', err);
      setError(err.message || 'Failed to decline. Please try again.');
    } finally {
      setIsDeclining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="card p-6 max-w-sm w-full animate-scale-in">
        {success ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Sent!</h3>
            <p className="text-gray-400">
              {request.amount} USDC sent to @{request.requesterUsername}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Payment Request</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Request Details */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {request.requesterUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold">@{request.requesterUsername}</p>
                  <p className="text-gray-400 text-sm">requested payment</p>
                </div>
              </div>

              <div className="text-center py-4 border-t border-b border-white/5">
                <p className="text-4xl font-bold text-white">{request.amount}</p>
                <p className="text-gray-400">USDC</p>
              </div>

              {request.message && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm">Message:</p>
                  <p className="text-white italic">"{request.message}"</p>
                </div>
              )}

              <p className="text-gray-500 text-xs mt-4">
                Requested on {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Balance Info */}
            {balance !== null && (
              <p className="text-gray-400 text-sm text-center mb-4">
                Your balance: <span className={balance >= request.amount ? 'text-emerald-400' : 'text-red-400'}>
                  {formatBalance(balance)} USDC
                </span>
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                disabled={isDeclining || isPaying}
                className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isDeclining ? 'Declining...' : 'Decline'}
              </button>
              <button
                onClick={handlePay}
                disabled={isPaying || isDeclining || (balance !== null && balance < request.amount)}
                className="flex-1 btn btn-primary py-3"
              >
                {isPaying ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner spinner-sm" />
                    Paying...
                  </span>
                ) : (
                  `Pay ${request.amount} USDC`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

