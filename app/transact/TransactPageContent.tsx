'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, ScanLine, FileText, Fuel, Shield, CheckCircle2, Check, X, Plus, Copy, Share2 } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import QRScanner from '../components/QRScanner';
import QRCodeCard from '../components/QRCodeCard';
import {
  getUserByUsername,
  recordTransaction,
  updateStreak,
  getContacts,
  getPaymentRequests,
  createPaymentRequest
} from '../lib/api';
import { useWallet, formatBalance, formatUSD, getExplorerUrl } from '@/app/lib/chain';
import { useUser, useBalance, useTransactions, useChainInvalidate } from '@/app/lib/hooks';
import { PageShell, PageHeader, Card } from '@/app/components/ui/primitives';
import { toast } from 'sonner';

type Step = 'form' | 'confirm' | 'success';
type Mode = 'send' | 'receive';
type ReceiveTab = 'qr' | 'request';

interface Contact {
  _id: string;
  username: string;
  nickname?: string;
}

interface PaymentRequest {
  _id: string;
  requesterUsername: string;
  payerUsername?: string;
  amount: number;
  message?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function TransactPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, address: walletAddress, authenticated, isConnected, ops } = useWallet();
  const { data: userData } = useUser();
  const { data: balance = 0 } = useBalance('USDC');
  const { data: recentTransactions = [] } = useTransactions(5);
  const invalidate = useChainInvalidate();
  const senderUsername = userData?.username ?? '';

  // Mode: send or receive
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'receive' ? 'receive' : 'send');

  // Send state
  const [step, setStep] = useState<Step>('form');
  const [recipientUsername, setRecipientUsername] = useState(searchParams.get('to') || '');
  const [recipientData, setRecipientData] = useState<any>(null);
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [note, setNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Receive state
  const [receiveTab, setReceiveTab] = useState<ReceiveTab>('qr');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestPayer, setRequestPayer] = useState('');
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // Common state
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Handle QR scan result
  const handleQRScan = async (data: { username: string; amount?: string }) => {
    setRecipientUsername(data.username);
    if (data.amount) {
      setAmount(data.amount);
    }
    await searchRecipient(data.username);
  };

  // Load lists that have no global hook (contacts + sent payment requests).
  useEffect(() => {
    const setup = async () => {
      const address = walletAddress;

      if (address) {
        const [contactsResult, requestsResult] = await Promise.all([
          getContacts(address).catch(() => ({ contacts: [] })),
          getPaymentRequests(address, 'sent').catch(() => ({ requests: [] })),
        ]);

        setContacts(contactsResult.contacts || []);
        setRequests(requestsResult.requests || []);
      }
      setRequestsLoading(false);
    };

    setup();
  }, [authenticated, walletAddress, isConnected]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Search for recipient
  const searchRecipient = async (username?: string) => {
    const searchName = username || recipientUsername;
    if (!searchName || searchName.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const result = await getUserByUsername(searchName);
      if (result) {
        if (result.walletAddress === walletAddress) {
          setError("You can't send to yourself");
          setRecipientData(null);
        } else {
          setRecipientData(result);
          setError('');
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

  // Quick select contact
  const selectContact = (contact: Contact) => {
    setRecipientUsername(contact.username);
    searchRecipient(contact.username);
  };

  // Send transaction
  const handleSend = async () => {
    if (!recipientData || !amount || Number(amount) <= 0) return;

    setIsSending(true);
    setError('');

    try {
      let hash: string;
      const amountNum = Number(amount);

      if (isPrivate) {
        // Private (shielded) transfer: routed through the privacy pool. The
        // sender<->recipient link stays hidden, so it is NOT recorded in the
        // public transaction history (it shows up in the user's /private feed).
        if (!(await ops.privacy.isEnabled())) await ops.privacy.enable();
        const result = await ops.privacy.transfer(recipientData.username, String(amountNum), 'USDC', note || undefined);
        if (!result.success) throw new Error(result.error || 'Private transfer failed. Please try again.');
        hash = result.hash;
      } else {
        const result = await ops.sendPayment(recipientData.walletAddress, String(amountNum), 'USDC', note || undefined);
        if (!result.success) throw new Error(result.error || 'Transaction failed. Please try again.');
        hash = result.hash;
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
      }

      setTxHash(hash);
      await updateStreak(walletAddress);
      invalidate();
      setStep('success');
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Create payment request
  const handleCreateRequest = async () => {
    if (!requestAmount) return;

    setIsCreatingRequest(true);
    try {
      const result = await createPaymentRequest({
        requesterAddress: walletAddress,
        payerUsername: requestPayer || undefined,
        amount: Number(requestAmount),
        message: requestMessage || undefined,
        expiresInHours: 24,
      });

      if (result.request) {
        setRequests([result.request, ...requests]);
        setShowRequestForm(false);
        setRequestAmount('');
        setRequestMessage('');
        setRequestPayer('');
        toast.success('Payment request created!');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // USDC is dollar-denominated (1:1)
  const usdValue = Number(amount);

  // Copy wallet address
  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    toast.success('Address copied!');
  };

  // Reset send form
  const resetSendForm = () => {
    setStep('form');
    setRecipientUsername('');
    setRecipientData(null);
    setAmount('');
    setNote('');
    setTxHash('');
    setError('');
    setIsPrivate(false);
  };

  // Send / Receive mode toggle, lives under the page header.
  const modeToggle = (
    <div className="surface inline-flex self-start rounded-xl p-1">
      <button
        onClick={() => { setMode('send'); resetSendForm(); }}
        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all md:px-6 ${
          mode === 'send'
            ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white'
            : 'text-purple-200/60 hover:text-white'
        }`}
      >
        <ArrowUpRight className="h-4 w-4" />
        Send
      </button>
      <button
        onClick={() => setMode('receive')}
        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all md:px-6 ${
          mode === 'receive'
            ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white'
            : 'text-purple-200/60 hover:text-white'
        }`}
      >
        <ArrowDownLeft className="h-4 w-4" />
        Receive
      </button>
    </div>
  );

  return (
    <AppShell>
      <PageShell variant="wide">
        <PageHeader
          title="Transact"
          subtitle="Send & receive assets securely and instantly."
          action={modeToggle}
        />

        <div className="flex flex-col gap-6 lg:flex-row">

          {/* LEFT COLUMN: Main Transaction Interface */}
          <div className="flex flex-1 flex-col gap-6">

            {/* ==================== SEND MODE ==================== */}
            {mode === 'send' && (
              <>
                {/* Success State */}
                {step === 'success' && (
                  <div className="animate-scale-in space-y-6 py-12 text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{isPrivate ? 'Sent Privately!' : 'Payment Sent!'}</h2>
                    <p className="text-purple-200/60">
                      {amount} USDC sent {isPrivate ? 'privately ' : ''}to @{recipientData?.username}
                    </p>
                    <Card className="mx-auto max-w-md">
                      <p className="mb-1 text-xs text-purple-200/60">Transaction Hash</p>
                      <a
                        href={getExplorerUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-mono text-sm text-[#c89bff] hover:underline"
                      >
                        {txHash}
                      </a>
                    </Card>
                    <div className="mx-auto max-w-md space-y-3">
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="btn btn-primary h-14 w-full py-4 text-lg"
                      >
                        Back to Home
                      </button>
                      <button
                        onClick={resetSendForm}
                        className="btn btn-secondary h-14 w-full py-4"
                      >
                        Send Another
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm State */}
                {step === 'confirm' && recipientData && (
                  <div className="animate-fade-in-up space-y-6">
                    <div className="mb-4 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#9b3bff]/10">
                        <FileText className="h-10 w-10 text-[#c89bff]" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Confirm Transfer</h2>
                    </div>

                    <Card className="overflow-hidden p-0">
                      <div className="border-b border-white/10 p-5">
                        <p className="text-sm text-purple-200/60">Amount</p>
                        <p className="text-3xl font-bold text-white">{amount} USDC</p>
                        <p className="text-sm text-purple-200/60">≈ ${usdValue.toFixed(2)} USD</p>
                      </div>
                      <div className="border-b border-white/10 p-5">
                        <p className="text-sm text-purple-200/60">To</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7f13ec] font-bold text-white">
                            {recipientData.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">@{recipientData.username}</p>
                            <p className="font-mono text-xs text-purple-200/60">
                              {recipientData.walletAddress.slice(0, 12)}...{recipientData.walletAddress.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {note && (
                        <div className="border-b border-white/10 p-5">
                          <p className="text-sm text-purple-200/60">Note</p>
                          <p className="text-white">{note}</p>
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-purple-200/60">
                            <Fuel className="h-4 w-4" /> Est. Gas Fee
                          </span>
                          <span className="font-bold text-white">~0.001 USDC</span>
                        </div>
                      </div>
                    </Card>

                    {/* Private toggle */}
                    <button
                      type="button"
                      onClick={() => setIsPrivate((v) => !v)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
                        isPrivate
                          ? 'border-[#9b3bff] bg-[#9b3bff]/10'
                          : 'border-white/10 bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex items-center gap-3 text-left">
                        <Shield className="h-6 w-6 text-[#c89bff]" />
                        <span>
                          <span className="block font-bold text-white">Send privately</span>
                          <span className="block text-xs text-purple-200/60">Hide this payment with a zero-knowledge proof</span>
                        </span>
                      </span>
                      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${isPrivate ? 'bg-[#7f13ec]' : 'bg-white/10'}`}>
                        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-5' : ''}`} />
                      </span>
                    </button>

                    {error && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('form')}
                        className="btn btn-secondary h-14 flex-1 py-4"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="btn btn-primary h-14 flex-1 py-4 text-lg"
                      >
                        {isSending ? (
                          <span className="flex items-center gap-2">
                            <div className="spinner spinner-sm" />
                            {isPrivate ? 'Generating proof...' : 'Sending...'}
                          </span>
                        ) : (
                          <>{isPrivate ? 'Confirm Private Send' : 'Confirm & Send'} →</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Send Form */}
                {step === 'form' && (
                  <Card className="flex flex-col gap-6">
                    {/* Amount Section */}
                    <div className="flex flex-col gap-4">
                      <label className="text-sm font-bold uppercase tracking-wider text-purple-200/60">Amount to send</label>
                      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 pr-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] text-sm font-bold text-white">
                            M
                          </div>
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-bold leading-tight text-white">USDC</span>
                            <span className="text-xs text-purple-200/60">Stellar</span>
                          </div>
                        </div>

                        <div className="w-full flex-1">
                          <input
                            type="text"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full border-none bg-transparent p-0 text-4xl font-black leading-tight text-white placeholder-purple-200/30 focus:ring-0 md:text-5xl lg:text-6xl"
                          />
                          <div className="mt-1 text-sm font-medium text-purple-200/60">
                            ≈ ${usdValue.toFixed(2)} USD • Balance: {formatBalance(balance)} USDC
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="my-2 border-white/10" />

                    {/* Recipient Section */}
                    <div className="flex flex-col gap-3">
                      <label className="text-sm font-bold uppercase tracking-wider text-purple-200/60">Recipient</label>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 transition-all focus-within:border-[#7f13ec]/50 focus-within:ring-2 ring-[#7f13ec]/20">
                        <div className="p-2 text-purple-200/60">
                          <span className="text-xl font-bold">@</span>
                        </div>
                        <input
                          type="text"
                          value={recipientUsername}
                          onChange={(e) => setRecipientUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          onBlur={() => recipientUsername.length >= 3 && searchRecipient()}
                          onKeyDown={(e) => e.key === 'Enter' && searchRecipient()}
                          placeholder="Username or wallet address"
                          className="flex-1 border-none bg-transparent font-medium text-white placeholder-purple-200/40 focus:ring-0"
                        />
                        <button
                          onClick={async () => {
                            const text = await navigator.clipboard.readText();
                            setRecipientUsername(text);
                          }}
                          className="flex items-center gap-2 rounded-xl px-3 p-2 text-sm font-bold text-[#c89bff] transition-colors hover:bg-white/[0.08]"
                        >
                          Paste
                        </button>
                        <button
                          onClick={() => setShowScanner(true)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white transition-colors hover:bg-[#7f13ec]"
                        >
                          <ScanLine className="h-5 w-5" />
                        </button>
                      </div>

                      {recipientData && (
                        <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7f13ec] font-bold text-white">
                            {recipientData.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-white">@{recipientData.username}</p>
                            <p className="font-mono text-xs text-purple-200/60">
                              {recipientData.walletAddress.slice(0, 10)}...{recipientData.walletAddress.slice(-6)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Check className="h-5 w-5 text-emerald-400" />
                            <button
                              type="button"
                              onClick={() => { setRecipientData(null); setRecipientUsername(''); setError(''); }}
                              aria-label="Clear recipient"
                              className="rounded-full p-1 text-purple-200/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      {isSearching && (
                        <div className="flex items-center gap-2 text-sm text-purple-200/60">
                          <div className="spinner spinner-sm" />
                          Searching...
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold uppercase tracking-wider text-purple-200/60">Note (optional)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What's this for?"
                        className="input h-12"
                        maxLength={200}
                      />
                    </div>

                    {/* Action */}
                    <div className="mt-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between px-1 text-sm">
                        <span className="flex items-center gap-1 text-purple-200/60">
                          <Fuel className="h-4 w-4" /> Est. Gas Fee
                        </span>
                        <span className="font-bold text-white">~0.001 USDC</span>
                      </div>
                      <button
                        onClick={() => setStep('confirm')}
                        disabled={!recipientData || !amount || Number(amount) <= 0 || Number(amount) > balance}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-4 text-lg font-bold text-white shadow-lg shadow-[#7f13ec]/25 transition-all hover:shadow-[#7f13ec]/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Review Transaction
                        <span>→</span>
                      </button>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ==================== RECEIVE MODE ==================== */}
            {mode === 'receive' && (
              <div className="space-y-6">
                {/* Sub-tabs for Receive */}
                <div className="surface flex gap-2 rounded-xl p-1">
                  <button
                    onClick={() => setReceiveTab('qr')}
                    className={`flex-1 rounded-lg py-3 text-sm font-bold transition-all ${
                      receiveTab === 'qr'
                        ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    📲 QR Code
                  </button>
                  <button
                    onClick={() => setReceiveTab('request')}
                    className={`flex-1 rounded-lg py-3 text-sm font-bold transition-all ${
                      receiveTab === 'request'
                        ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    📋 Requests
                  </button>
                </div>

                {/* QR Tab */}
                {receiveTab === 'qr' && senderUsername && walletAddress && (
                  <div className="animate-fade-in-up space-y-6">
                    <QRCodeCard
                      username={senderUsername}
                      amount={receiveAmount || undefined}
                      walletAddress={walletAddress}
                      onShare={() => toast.success('Link copied!')}
                    />

                    <Card>
                      <label className="mb-3 block text-sm text-purple-200/60">
                        Request specific amount (optional)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={receiveAmount}
                          onChange={(e) => setReceiveAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0.00"
                          className="input h-14 pr-20"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-purple-200/60">
                          USDC
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-purple-200/60">
                        Adding an amount will update the QR code
                      </p>
                    </Card>
                  </div>
                )}

                {/* Request Tab */}
                {receiveTab === 'request' && (
                  <div className="animate-fade-in-up space-y-6">
                    {!showRequestForm && (
                      <button
                        onClick={() => setShowRequestForm(true)}
                        className="btn btn-primary h-14 w-full py-4 text-lg"
                      >
                        <span className="mr-2">➕</span>
                        Create Payment Request
                      </button>
                    )}

                    {showRequestForm && (
                      <Card className="animate-scale-in space-y-4">
                        <h3 className="text-lg font-bold text-white">New Payment Request</h3>

                        <div>
                          <label className="mb-2 block text-sm text-purple-200/60">Amount *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={requestAmount}
                              onChange={(e) => setRequestAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                              placeholder="0.00"
                              className="input h-14 pr-20"
                              autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-purple-200/60">
                              USDC
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-purple-200/60">From (optional)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 font-bold text-[#c89bff]">@</span>
                            <input
                              type="text"
                              value={requestPayer}
                              onChange={(e) => setRequestPayer(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              placeholder="anyone"
                              className="input h-14"
                              style={{ paddingLeft: '2.5rem' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-purple-200/60">Message (optional)</label>
                          <input
                            type="text"
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            placeholder="What's this for?"
                            className="input h-14"
                            maxLength={200}
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => setShowRequestForm(false)}
                            className="btn btn-secondary h-12 flex-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateRequest}
                            disabled={isCreatingRequest || !requestAmount}
                            className="btn btn-primary h-12 flex-1"
                          >
                            {isCreatingRequest ? 'Creating...' : 'Create Request'}
                          </button>
                        </div>
                      </Card>
                    )}

                    {/* Requests List */}
                    <div>
                      <h3 className="mb-4 text-lg font-bold text-white">Your Requests</h3>

                      {requestsLoading ? (
                        <div className="flex justify-center py-12">
                          <div className="spinner" />
                        </div>
                      ) : requests.length === 0 ? (
                        <Card className="text-center">
                          <span className="mb-3 block text-4xl">📋</span>
                          <p className="font-bold text-white">No payment requests yet</p>
                          <p className="mt-1 text-sm text-purple-200/60">
                            Create a request to ask someone to pay you
                          </p>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {requests.map((req) => (
                            <Card
                              key={req._id}
                              className="p-4 transition-all hover:border-[#7f13ec]/30"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-2xl font-bold text-white">
                                  {req.amount} USDC
                                </span>
                                <span className={`badge ${
                                  req.status === 'pending'
                                    ? 'badge-warning'
                                    : req.status === 'paid'
                                    ? 'badge-success'
                                    : 'bg-white/10 text-purple-200/60'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              {req.payerUsername && (
                                <p className="text-sm text-purple-200/60">
                                  From: <span className="text-[#c89bff]">@{req.payerUsername}</span>
                                </p>
                              )}
                              {req.message && (
                                <p className="mt-1 text-sm italic text-purple-200/60">"{req.message}"</p>
                              )}
                              <p className="mt-2 text-xs text-purple-200/45">
                                Expires: {new Date(req.expiresAt).toLocaleDateString()}
                              </p>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: content cards */}
          <div className="flex w-full flex-col gap-6 lg:w-[380px]">
            {/* Balance Card */}
            <Card className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#7f13ec]/20 blur-[50px]"
              />
              <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-purple-200/60">Your Balance</p>
                    <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{formatBalance(balance)} USDC</h3>
                    <p className="mt-1 text-sm text-purple-200/60">{formatUSD(balance)}</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 shadow-lg">
                    <div className="flex h-12 w-12 items-center justify-center text-2xl">📲</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyAddress}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" /> Copy Address
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/pay/${senderUsername}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Payment link copied!');
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Quick Send */}
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Quick Send</h3>
                <Link href="/contacts" className="text-sm font-bold text-[#c89bff] hover:text-white">View All</Link>
              </div>
              <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
                <Link href="/contacts" className="group flex min-w-[70px] flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent bg-white/[0.08] transition-all group-hover:border-[#7f13ec]">
                    <Plus className="h-6 w-6 text-[#c89bff]" />
                  </div>
                  <span className="text-xs font-medium text-purple-200/60">New</span>
                </Link>

                {contacts.slice(0, 4).map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => { setMode('send'); selectContact(contact); }}
                    className="group flex min-w-[70px] flex-col items-center gap-2"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent bg-gradient-to-br from-[#7f13ec] to-[#a855f7] text-lg font-bold text-white transition-all group-hover:border-[#7f13ec]">
                      {contact.username[0].toUpperCase()}
                    </div>
                    <span className="max-w-[60px] truncate text-xs font-medium text-purple-200/60">
                      {contact.nickname || contact.username}
                    </span>
                  </button>
                ))}

                {contacts.length === 0 && (
                  <div className="flex w-full items-center justify-center py-4 text-sm text-purple-200/60">
                    No contacts yet
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="flex flex-1 flex-col">
              <h3 className="mb-4 text-lg font-bold text-white">Recent Activity</h3>
              <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1">
                {recentTransactions.length === 0 ? (
                  <div className="py-8 text-center text-purple-200/60">
                    <span className="mb-2 block text-3xl">📭</span>
                    <p className="text-sm">No recent transactions</p>
                  </div>
                ) : (
                  recentTransactions.map((tx: any) => {
                    const isSent = tx.senderAddress === walletAddress;
                    return (
                      <div
                        key={tx._id}
                        className="group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isSent ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isSent ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                              {isSent ? `To: @${tx.receiverUsername}` : `From: @${tx.senderUsername}`}
                            </span>
                            <span className="text-xs text-purple-200/60">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${isSent ? 'text-white' : 'text-emerald-400'}`}>
                            {isSent ? '-' : '+'}{tx.amount} USDC
                          </span>
                          <span className="text-xs text-purple-200/60">{tx.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Link
                href="/history"
                className="mt-auto block w-full border-t border-white/10 pt-4 text-center text-sm font-bold text-purple-200/60 transition-colors hover:text-[#c89bff]"
              >
                View All Transactions
              </Link>
            </Card>
          </div>
        </div>
      </PageShell>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </AppShell>
  );
}
