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
  const { address: walletAddress, authenticated, isConnected, ops } = useWallet();
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
      if (!authenticated && !isConnected) {
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

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN: Main Transaction Interface */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Page Heading & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Transact</h1>
                <p className="text-slate-500 dark:text-[#ad92c9] text-base md:text-lg">Send & receive assets securely and instantly.</p>
              </div>
              
              {/* Mode Toggle */}
              <div className="bg-slate-200 dark:bg-white/[0.08] p-1.5 rounded-2xl inline-flex self-start sm:self-end">
                <button
                  onClick={() => { setMode('send'); resetSendForm(); }}
                  className={`px-5 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    mode === 'send' 
                      ? 'bg-white dark:bg-black/20 text-[#7f13ec] shadow-sm' 
                      : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Send
                </button>
                <button
                  onClick={() => setMode('receive')}
                  className={`px-5 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    mode === 'receive' 
                      ? 'bg-white dark:bg-black/20 text-[#7f13ec] shadow-sm' 
                      : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Receive
                </button>
              </div>
            </div>

            {/* ==================== SEND MODE ==================== */}
            {mode === 'send' && (
              <>
                {/* Success State */}
                {step === 'success' && (
                  <div className="text-center space-y-6 animate-scale-in py-12">
                    <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                      <CheckCircle2 className="text-emerald-500 w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{isPrivate ? 'Sent Privately!' : 'Payment Sent!'}</h2>
                    <p className="text-slate-500 dark:text-[#ad92c9]">
                      {amount} USDC sent {isPrivate ? 'privately ' : ''}to @{recipientData?.username}
                    </p>
                    <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-4 border border-slate-200 dark:border-white/5 max-w-md mx-auto shadow-lg dark:shadow-none">
                      <p className="text-slate-500 dark:text-[#ad92c9] text-xs mb-1">Transaction Hash</p>
                      <a 
                        href={getExplorerUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7f13ec] text-sm font-mono hover:underline break-all"
                      >
                        {txHash}
                      </a>
                    </div>
                    <div className="space-y-3 max-w-md mx-auto">
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full btn btn-primary py-4 text-lg h-14"
                      >
                        Back to Home
                      </button>
                      <button
                        onClick={resetSendForm}
                        className="w-full btn btn-secondary py-4 h-14"
                      >
                        Send Another
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm State */}
                {step === 'confirm' && recipientData && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="text-center mb-4">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center mb-4">
                        <FileText className="w-10 h-10 text-[#7f13ec]" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Confirm Transfer</h2>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#7f13ec] to-purple-600 rounded-3xl blur opacity-10 dark:opacity-20"></div>
                      <div className="relative bg-white dark:bg-white/[0.04] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none">
                        <div className="p-5 border-b border-slate-200 dark:border-white/5">
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Amount</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-white">{amount} USDC</p>
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">≈ ${usdValue.toFixed(2)} USD</p>
                        </div>
                        <div className="p-5 border-b border-slate-200 dark:border-white/5">
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">To</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="w-10 h-10 rounded-full bg-[#7f13ec] flex items-center justify-center text-white font-bold">
                              {recipientData.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">@{recipientData.username}</p>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-mono">
                                {recipientData.walletAddress.slice(0, 12)}...{recipientData.walletAddress.slice(-8)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {note && (
                          <div className="p-5 border-b border-slate-200 dark:border-white/5">
                            <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Note</p>
                            <p className="text-slate-900 dark:text-white">{note}</p>
                          </div>
                        )}
                        <div className="p-5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-[#ad92c9] flex items-center gap-1">
                              <Fuel className="w-4 h-4" /> Est. Gas Fee
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">~0.001 USDC</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Private toggle */}
                    <button
                      type="button"
                      onClick={() => setIsPrivate((v) => !v)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isPrivate
                          ? 'border-[#7f13ec] bg-[#7f13ec]/10'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex items-center gap-3 text-left">
                        <Shield className="w-6 h-6 text-[#7f13ec]" />
                        <span>
                          <span className="block font-bold text-slate-900 dark:text-white">Send privately</span>
                          <span className="block text-xs text-slate-500 dark:text-[#ad92c9]">Hide this payment with a zero-knowledge proof</span>
                        </span>
                      </span>
                      <span className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${isPrivate ? 'bg-[#7f13ec]' : 'bg-slate-300 dark:bg-white/10'}`}>
                        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-5' : ''}`} />
                      </span>
                    </button>

                    {error && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('form')}
                        className="flex-1 btn btn-secondary py-4 h-14"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="flex-1 btn btn-primary py-4 text-lg h-14"
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
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#7f13ec] to-purple-600 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition duration-500"></div>
                    
                    <div className="relative bg-white dark:bg-white/[0.04] rounded-3xl p-5 md:p-8 border border-slate-200 dark:border-white/5 flex flex-col gap-6 shadow-xl dark:shadow-none">
                      {/* Amount Section */}
                      <div className="flex flex-col gap-4">
                        <label className="text-sm font-bold text-slate-500 dark:text-[#ad92c9] uppercase tracking-wider">Amount to send</label>
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex items-center gap-3 bg-slate-100 dark:bg-black/30 p-3 pr-4 rounded-2xl border border-slate-200 dark:border-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center text-white font-bold text-sm">
                              M
                            </div>
                            <div className="flex flex-col items-start text-left">
                              <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">USDC</span>
                              <span className="text-xs text-slate-500 dark:text-[#ad92c9]">Stellar</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-transparent text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-[#362348] border-none focus:ring-0 p-0 leading-tight"
                            />
                            <div className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1 font-medium">
                              ≈ ${usdValue.toFixed(2)} USD • Balance: {formatBalance(balance)} USDC
                            </div>
                          </div>
                        </div>
                      </div>

                      <hr className="border-slate-200 dark:border-white/5 my-2" />

                      {/* Recipient Section */}
                      <div className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-slate-500 dark:text-[#ad92c9] uppercase tracking-wider">Recipient</label>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/30 p-2 rounded-2xl border border-slate-200 dark:border-white/10 focus-within:border-[#7f13ec]/50 focus-within:ring-2 ring-[#7f13ec]/20 transition-all">
                          <div className="p-2 text-slate-400 dark:text-[#ad92c9]">
                            <span className="text-xl font-bold">@</span>
                          </div>
                          <input
                            type="text"
                            value={recipientUsername}
                            onChange={(e) => setRecipientUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            onBlur={() => recipientUsername.length >= 3 && searchRecipient()}
                            onKeyDown={(e) => e.key === 'Enter' && searchRecipient()}
                            placeholder="Username or wallet address"
                            className="bg-transparent flex-1 border-none focus:ring-0 text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-[#ad92c9]/50"
                          />
                          <button 
                            onClick={async () => {
                              const text = await navigator.clipboard.readText();
                              setRecipientUsername(text);
                            }}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/[0.08] rounded-xl text-[#7f13ec] transition-colors flex items-center gap-2 text-sm font-bold px-3"
                          >
                            Paste
                          </button>
                          <button 
                            onClick={() => setShowScanner(true)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-white/[0.08] hover:bg-[#7f13ec] rounded-xl text-slate-700 dark:text-white transition-colors"
                          >
                            <ScanLine className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {recipientData && (
                          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-fade-in">
                            <div className="w-10 h-10 rounded-full bg-[#7f13ec] flex items-center justify-center text-white font-bold">
                              {recipientData.username[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-900 dark:text-white font-bold">@{recipientData.username}</p>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-mono">
                                {recipientData.walletAddress.slice(0, 10)}...{recipientData.walletAddress.slice(-6)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Check className="text-emerald-400 w-5 h-5" />
                              <button
                                type="button"
                                onClick={() => { setRecipientData(null); setRecipientUsername(''); setError(''); }}
                                aria-label="Clear recipient"
                                className="p-1 rounded-full text-slate-400 dark:text-[#ad92c9] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {error && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-sm">{error}</p>
                          </div>
                        )}

                        {isSearching && (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-[#ad92c9] text-sm">
                            <div className="spinner spinner-sm" />
                            Searching...
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-500 dark:text-[#ad92c9] uppercase tracking-wider">Note (optional)</label>
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
                        <div className="flex justify-between items-center text-sm px-1">
                          <span className="text-slate-500 dark:text-[#ad92c9] flex items-center gap-1">
                            <Fuel className="w-4 h-4" /> Est. Gas Fee
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">~0.001 USDC</span>
                        </div>
                        <button
                          onClick={() => setStep('confirm')}
                          disabled={!recipientData || !amount || Number(amount) <= 0 || Number(amount) > balance}
                          className="w-full py-4 bg-[#7f13ec] hover:bg-[#7f13ec]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#7f13ec]/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                          Review Transaction
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ==================== RECEIVE MODE ==================== */}
            {mode === 'receive' && (
              <div className="space-y-6">
                {/* Sub-tabs for Receive */}
                <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
                  <button
                    onClick={() => setReceiveTab('qr')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                      receiveTab === 'qr'
                        ? 'bg-[#7f13ec] text-white shadow-lg'
                        : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={{ boxShadow: receiveTab === 'qr' ? '0 10px 40px -10px rgba(127, 19, 236, 0.5)' : 'none' }}
                  >
                    📲 QR Code
                  </button>
                  <button
                    onClick={() => setReceiveTab('request')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                      receiveTab === 'request'
                        ? 'bg-[#7f13ec] text-white shadow-lg'
                        : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={{ boxShadow: receiveTab === 'request' ? '0 10px 40px -10px rgba(127, 19, 236, 0.5)' : 'none' }}
                  >
                    📋 Requests
                  </button>
                </div>

                {/* QR Tab */}
                {receiveTab === 'qr' && senderUsername && walletAddress && (
                  <div className="space-y-6 animate-fade-in-up">
                    <QRCodeCard 
                      username={senderUsername}
                      amount={receiveAmount || undefined}
                      walletAddress={walletAddress}
                      onShare={() => toast.success('Link copied!')}
                    />

                    <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
                      <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-3">
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
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#ad92c9] font-bold">
                          USDC
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60 mt-2">
                        Adding an amount will update the QR code
                      </p>
                    </div>
                  </div>
                )}

                {/* Request Tab */}
                {receiveTab === 'request' && (
                  <div className="space-y-6 animate-fade-in-up">
                    {!showRequestForm && (
                      <button
                        onClick={() => setShowRequestForm(true)}
                        className="w-full btn btn-primary py-4 text-lg h-14"
                      >
                        <span className="mr-2">➕</span>
                        Create Payment Request
                      </button>
                    )}

                    {showRequestForm && (
                      <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-6 space-y-4 animate-scale-in border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Payment Request</h3>
                        
                        <div>
                          <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-2">Amount *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={requestAmount}
                              onChange={(e) => setRequestAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                              placeholder="0.00"
                              className="input h-14 pr-20"
                              autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#ad92c9] font-bold">
                              USDC
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-2">From (optional)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f13ec] font-bold z-10">@</span>
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
                          <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-2">Message (optional)</label>
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
                            className="flex-1 btn btn-secondary h-12"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateRequest}
                            disabled={isCreatingRequest || !requestAmount}
                            className="flex-1 btn btn-primary h-12"
                          >
                            {isCreatingRequest ? 'Creating...' : 'Create Request'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Requests List */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Your Requests</h3>
                      
                      {requestsLoading ? (
                        <div className="flex justify-center py-12">
                          <div className="spinner" />
                        </div>
                      ) : requests.length === 0 ? (
                        <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-8 text-center border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
                          <span className="text-4xl mb-3 block">📋</span>
                          <p className="text-slate-900 dark:text-white font-bold">No payment requests yet</p>
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1">
                            Create a request to ask someone to pay you
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {requests.map((req) => (
                            <div
                              key={req._id}
                              className="bg-white dark:bg-white/[0.04] rounded-2xl p-4 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all shadow-lg dark:shadow-none"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                  {req.amount} USDC
                                </span>
                                <span className={`badge ${
                                  req.status === 'pending'
                                    ? 'badge-warning'
                                    : req.status === 'paid'
                                    ? 'badge-success'
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#ad92c9]'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              {req.payerUsername && (
                                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                                  From: <span className="text-[#7f13ec]">@{req.payerUsername}</span>
                                </p>
                              )}
                              {req.message && (
                                <p className="text-slate-400 dark:text-[#ad92c9]/60 text-sm mt-1 italic">"{req.message}"</p>
                              )}
                              <p className="text-slate-400 dark:text-[#ad92c9]/40 text-xs mt-2">
                                Expires: {new Date(req.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar */}
          <div className="w-full lg:w-[380px] flex flex-col gap-6">
            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-[#7f13ec] to-[#5b0ba8] dark:from-[#2a1e35] dark:to-[#150d1d] rounded-3xl p-5 md:p-6 text-white relative overflow-hidden border border-[#7f13ec]/20 dark:border-white/5 shadow-xl dark:shadow-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 dark:bg-[#7f13ec]/30 rounded-full blur-[50px] -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-white/70 dark:text-[#ad92c9] text-sm font-medium mb-1">Your Balance</p>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{formatBalance(balance)} USDC</h3>
                    <p className="text-white/70 dark:text-[#ad92c9] text-sm mt-1">{formatUSD(balance)}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-lg">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl">📲</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyAddress}
                    className="flex-1 bg-white/20 dark:bg-white/[0.08] hover:bg-white/30 dark:hover:bg-white/10 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copy Address
                  </button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/pay/${senderUsername}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Payment link copied!');
                    }}
                    className="flex-1 bg-white/20 dark:bg-white/[0.08] hover:bg-white/30 dark:hover:bg-white/10 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Send */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Send</h3>
                <Link href="/contacts" className="text-[#7f13ec] text-sm font-bold hover:underline">View All</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                <Link href="/contacts" className="flex flex-col items-center gap-2 min-w-[70px] group">
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-white/[0.08] border-2 border-transparent group-hover:border-[#7f13ec] flex items-center justify-center transition-all">
                    <Plus className="text-[#7f13ec] w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-[#ad92c9]">New</span>
                </Link>
                
                {contacts.slice(0, 4).map((contact) => (
                  <button 
                    key={contact._id}
                    onClick={() => { setMode('send'); selectContact(contact); }}
                    className="flex flex-col items-center gap-2 min-w-[70px] group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] border-2 border-transparent group-hover:border-[#7f13ec] flex items-center justify-center text-white font-bold text-lg transition-all">
                      {contact.username[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-[#ad92c9] truncate max-w-[60px]">
                      {contact.nickname || contact.username}
                    </span>
                  </button>
                ))}
                
                {contacts.length === 0 && (
                  <div className="flex items-center justify-center text-slate-500 dark:text-[#ad92c9] text-sm py-4 w-full">
                    No contacts yet
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="flex-1 bg-white dark:bg-white/[0.04] rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-white/5 flex flex-col shadow-lg dark:shadow-none">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Recent Activity</h3>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[280px] pr-1">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-[#ad92c9]">
                    <span className="text-3xl mb-2 block">📭</span>
                    <p className="text-sm">No recent transactions</p>
                  </div>
                ) : (
                  recentTransactions.map((tx: any) => {
                    const isSent = tx.senderAddress === walletAddress;
                    return (
                      <div 
                        key={tx._id}
                        className="flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSent ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isSent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {isSent ? `To: @${tx.receiverUsername}` : `From: @${tx.senderUsername}`}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-[#ad92c9]">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-sm ${isSent ? 'text-slate-900 dark:text-white' : 'text-emerald-400'}`}>
                            {isSent ? '-' : '+'}{tx.amount} USDC
                          </span>
                          <span className="text-xs text-slate-500 dark:text-[#ad92c9]">{tx.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Link 
                href="/history"
                className="w-full mt-auto py-2 text-sm font-bold text-slate-500 dark:text-[#ad92c9] hover:text-[#7f13ec] transition-colors border-t border-slate-200 dark:border-white/5 pt-4 text-center block"
              >
                View All Transactions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </AppShell>
  );
}

