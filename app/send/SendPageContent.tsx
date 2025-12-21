'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import Navbar from '../components/Navbar';
import QRScanner from '../components/QRScanner';
import { getUserByUsername, getUserByAddress, recordTransaction, updateStreak } from '../lib/api';
import { fetchBalance, formatBalance } from '../lib/balance';
import { transferWithPrivy, transferWithNativeWallet } from '../lib/transfer';
import { getExplorerUrl } from '../lib/aptos';

type Step = 'recipient' | 'amount' | 'confirm' | 'success';

export default function SendPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authenticated } = usePrivy();
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { signRawHash } = useSignRawHash();

  const [step, setStep] = useState<Step>('recipient');
  const [recipientUsername, setRecipientUsername] = useState(searchParams.get('to') || '');
  const [recipientData, setRecipientData] = useState<any>(null);
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [note, setNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const [walletAddress, setWalletAddress] = useState('');
  const [senderUsername, setSenderUsername] = useState('');
  const [balance, setBalance] = useState(0);

  // Handle QR scan result
  const handleQRScan = async (data: { username: string; amount?: string }) => {
    setRecipientUsername(data.username);
    if (data.amount) {
      setAmount(data.amount);
    }
    // Auto-search for the recipient
    setIsSearching(true);
    setError('');
    try {
      const result = await getUserByUsername(data.username);
      if (result) {
        if (result.walletAddress === walletAddress) {
          setError("You can't send to yourself");
          setRecipientData(null);
        } else {
          setRecipientData(result);
          setStep('amount');
        }
      } else {
        setError('User not found');
        setRecipientData(null);
      }
    } catch (err) {
      setError('Failed to search for user');
    } finally {
      setIsSearching(false);
    }
  };

  // Get wallet info
  useEffect(() => {
    const setup = async () => {
      let address = '';
      
      if (authenticated && user) {
        const moveWallet = user.linkedAccounts?.find(
          (acc: any) => acc.chainType === 'aptos'
        ) as any;
        if (moveWallet?.address) {
          address = moveWallet.address;
        }
      } else if (connected && account?.address) {
        address = account.address.toString();
      }

      if (address) {
        setWalletAddress(address);
        const bal = await fetchBalance(address);
        setBalance(bal);
        
        const userData = await getUserByAddress(address);
        if (userData) {
          setSenderUsername(userData.username);
        }
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Redirect if not connected (only check once after initial load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Search for recipient
  const searchRecipient = async () => {
    if (!recipientUsername || recipientUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const result = await getUserByUsername(recipientUsername);
      if (result) {
        if (result.walletAddress === walletAddress) {
          setError("You can't send to yourself");
          setRecipientData(null);
        } else {
          setRecipientData(result);
          setStep('amount');
        }
      } else {
        setError('User not found');
        setRecipientData(null);
      }
    } catch (err) {
      setError('Failed to search for user');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle amount input
  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 8) return;
    setAmount(cleaned);
  };

  // Set percentage of balance
  const setPercentage = (percent: number) => {
    const value = (balance * percent) / 100;
    const adjusted = percent === 100 ? Math.max(0, value - 0.01) : value;
    setAmount(adjusted.toFixed(4));
  };

  // Send transaction
  const handleSend = async () => {
    if (!recipientData || !amount || Number(amount) <= 0) return;

    setIsSending(true);
    setError('');

    try {
      let hash: string;
      const amountNum = Number(amount);

      const isPrivyWallet = authenticated && user?.linkedAccounts?.find(
        (acc: any) => acc.chainType === 'aptos'
      );

      if (isPrivyWallet && signRawHash) {
        const moveWallet = user!.linkedAccounts!.find(
          (acc: any) => acc.chainType === 'aptos'
        ) as any;

        hash = await transferWithPrivy(
          walletAddress,
          recipientData.walletAddress,
          amountNum,
          moveWallet.publicKey,
          signRawHash
        );
      } else if (connected && signAndSubmitTransaction) {
        hash = await transferWithNativeWallet(
          walletAddress,
          recipientData.walletAddress,
          amountNum,
          signAndSubmitTransaction
        );
      } else {
        throw new Error('No wallet available for signing');
      }

      setTxHash(hash);

      await recordTransaction({
        senderAddress: walletAddress,
        senderUsername: senderUsername,
        receiverAddress: recipientData.walletAddress,
        receiverUsername: recipientData.username,
        amount: amountNum,
        txHash: hash,
        type: 'send',
        note: note || undefined,
      });

      await updateStreak(walletAddress);
      setStep('success');
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const stepIndex = ['recipient', 'amount', 'confirm', 'success'].indexOf(step);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="p-4 pt-safe flex items-center gap-4">
        <button 
          onClick={() => step === 'recipient' ? router.back() : setStep(stepIndex > 0 ? ['recipient', 'amount', 'confirm', 'success'][stepIndex - 1] as Step : 'recipient')}
          className="p-2 rounded-xl glass touch-target hover:bg-white/10 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <h1 className="text-xl font-bold text-white">Send MOVE</h1>
      </header>

      {/* Progress Steps */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-center gap-2">
          {['recipient', 'amount', 'confirm', 'success'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s 
                    ? 'bg-emerald-500 text-white scale-110' 
                    : stepIndex > i 
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-gray-500'
                }`}
              >
                {stepIndex > i ? '✓' : i + 1}
              </div>
              {i < 3 && (
                <div className={`w-8 h-0.5 transition-colors ${stepIndex > i ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        {/* Step 1: Recipient */}
        {step === 'recipient' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-5xl">👤</span>
              <h2 className="text-2xl font-bold text-white mt-4">Who are you sending to?</h2>
              <p className="text-gray-400 mt-2">Enter username or scan QR code</p>
            </div>

            {/* Scan QR Button */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-3 touch-target"
            >
              <span className="text-3xl">📷</span>
              <div className="text-left">
                <p className="text-white font-semibold">Scan QR Code</p>
                <p className="text-emerald-400 text-sm">Quick & easy payment</p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-sm">or enter username</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-lg font-medium z-10">@</span>
              <input
                type="text"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="input text-lg"
                style={{ paddingLeft: '2.5rem' }}
                onKeyDown={(e) => e.key === 'Enter' && searchRecipient()}
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={searchRecipient}
              disabled={isSearching || recipientUsername.length < 3}
              className="w-full btn btn-primary py-4 text-lg"
            >
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <div className="spinner spinner-sm" />
                  Searching...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === 'amount' && recipientData && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Recipient Card */}
            <div className="card p-4">
              <p className="text-gray-400 text-sm">Sending to</p>
              <p className="text-white text-lg font-bold">@{recipientData.username}</p>
              <p className="text-gray-500 text-xs font-mono mt-1">
                {recipientData.walletAddress.slice(0, 10)}...{recipientData.walletAddress.slice(-8)}
              </p>
            </div>

            {/* Amount Input */}
            <div className="text-center py-8">
              <div className="relative inline-block">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-5xl font-bold text-white bg-transparent text-center w-48 outline-none"
                  autoFocus
                />
                <span className="text-2xl text-gray-400 ml-2">MOVE</span>
              </div>
              <p className="text-gray-500 mt-2">
                Balance: {formatBalance(balance)} MOVE
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setPercentage(percent)}
                  className="flex-1 py-2 rounded-lg btn-secondary text-sm font-medium"
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Note */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="input"
              maxLength={200}
            />

            {Number(amount) > balance && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">Insufficient balance</p>
              </div>
            )}

            <button
              onClick={() => setStep('confirm')}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > balance}
              className="w-full btn btn-primary py-4 text-lg"
            >
              Review
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && recipientData && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="text-5xl">📝</span>
              <h2 className="text-2xl font-bold text-white mt-4">Confirm Transfer</h2>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <p className="text-gray-400 text-sm">Amount</p>
                <p className="text-3xl font-bold text-white">{amount} MOVE</p>
              </div>
              <div className="p-4 border-b border-white/5">
                <p className="text-gray-400 text-sm">To</p>
                <p className="text-lg font-bold text-white">@{recipientData.username}</p>
                <p className="text-gray-500 text-xs font-mono break-all">
                  {recipientData.walletAddress}
                </p>
              </div>
              {note && (
                <div className="p-4 border-b border-white/5">
                  <p className="text-gray-400 text-sm">Note</p>
                  <p className="text-white">{note}</p>
                </div>
              )}
              <div className="p-4">
                <p className="text-gray-400 text-sm">Network Fee</p>
                <p className="text-white">~0.001 MOVE</p>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-full btn btn-primary py-4 text-lg"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <div className="spinner spinner-sm" />
                  Sending...
                </span>
              ) : (
                'Confirm & Send'
              )}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-6 animate-scale-in">
            <div className="py-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Payment Sent!</h2>
              <p className="text-gray-400 mt-2">
                {amount} MOVE sent to @{recipientData?.username}
              </p>
            </div>

            <div className="card p-4">
              <p className="text-gray-400 text-xs mb-1">Transaction Hash</p>
              <a 
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 text-sm font-mono hover:underline break-all"
              >
                {txHash}
              </a>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full btn btn-primary py-4 text-lg"
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  setStep('recipient');
                  setRecipientUsername('');
                  setRecipientData(null);
                  setAmount('');
                  setNote('');
                  setTxHash('');
                  setError('');
                }}
                className="w-full btn btn-secondary py-4"
              >
                Send Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />

      <Navbar />
    </div>
  );
}

