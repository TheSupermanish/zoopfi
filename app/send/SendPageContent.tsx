'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import QRScanner from '../components/QRScanner';
import { getUserByUsername, getUserByAddress, recordTransaction, updateStreak, getTransactions, getContacts } from '../lib/api';
import { fetchBalance, formatBalance, formatUSD } from '../lib/balance';
import { transferWithPrivy, transferWithNativeWallet } from '../lib/transfer';
import { getExplorerUrl } from '../lib/aptos';

type Step = 'form' | 'confirm' | 'success';
type Mode = 'send' | 'receive';

interface Contact {
  _id: string;
  username: string;
  nickname?: string;
}

interface Transaction {
  _id: string;
  senderUsername: string;
  receiverUsername: string;
  amount: number;
  timestamp: string;
  senderAddress: string;
  status: string;
}

export default function SendPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authenticated } = usePrivy();
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { signRawHash } = useSignRawHash();

  const [mode, setMode] = useState<Mode>('send');
  const [step, setStep] = useState<Step>('form');
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Handle QR scan result
  const handleQRScan = async (data: { username: string; amount?: string }) => {
    setRecipientUsername(data.username);
    if (data.amount) {
      setAmount(data.amount);
    }
    await searchRecipient(data.username);
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
        const [bal, userData, contactsResult, txResult] = await Promise.all([
          fetchBalance(address),
          getUserByAddress(address),
          getContacts(address).catch(() => ({ contacts: [] })),
          getTransactions(address, 5, 0).catch(() => ({ transactions: [] })),
        ]);
        
        setBalance(bal);
        if (userData) {
          setSenderUsername(userData.username);
        }
        setContacts(contactsResult.contacts || []);
        setRecentTransactions(txResult.transactions || []);
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
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

  // Calculate USD value
  const usdValue = Number(amount) * 0.05; // Placeholder rate

  // Copy wallet address
  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
  };

  return (
    <DashboardLayout username={senderUsername} walletAddress={walletAddress}>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN: Main Transaction Interface */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Page Heading & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Send & Receive</h1>
                <p className="text-slate-500 dark:text-[#ad92c9] text-lg">Move your assets securely and instantly.</p>
              </div>
              
              {/* Segmented Control */}
              <div className="bg-slate-200 dark:bg-[#362348] p-1.5 rounded-2xl inline-flex self-start sm:self-end">
                <button
                  onClick={() => setMode('send')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    mode === 'send' 
                      ? 'bg-white dark:bg-[#1a1122] text-[#7f13ec] shadow-sm' 
                      : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📤</span>
                  Send
                </button>
                <button
                  onClick={() => {
                    setMode('receive');
                    router.push('/receive');
                  }}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    mode === 'receive' 
                      ? 'bg-white dark:bg-[#1a1122] text-[#7f13ec] shadow-sm' 
                      : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📥</span>
                  Receive
                </button>
              </div>
            </div>

            {/* Success State */}
            {step === 'success' && (
              <div className="text-center space-y-6 animate-scale-in py-12">
                <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <span className="text-5xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Sent!</h2>
                <p className="text-slate-500 dark:text-[#ad92c9]">
                  {amount} MOVE sent to @{recipientData?.username}
                </p>
                <div className="bg-white dark:bg-[#251a30] rounded-2xl p-4 border border-slate-200 dark:border-white/5 max-w-md mx-auto shadow-lg dark:shadow-none">
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
                    onClick={() => {
                      setStep('form');
                      setRecipientUsername('');
                      setRecipientData(null);
                      setAmount('');
                      setNote('');
                      setTxHash('');
                      setError('');
                    }}
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
                    <span className="text-4xl">📝</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Confirm Transfer</h2>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#7f13ec] to-purple-600 rounded-3xl blur opacity-10 dark:opacity-20"></div>
                  <div className="relative bg-white dark:bg-[#251a30] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none">
                    <div className="p-5 border-b border-slate-200 dark:border-white/5">
                      <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Amount</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{amount} MOVE</p>
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
                          <span>⛽</span> Est. Gas Fee
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">~0.001 MOVE</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                        Sending...
                      </span>
                    ) : (
                      <>Confirm & Send →</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Main Send Card */}
            {step === 'form' && (
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#7f13ec] to-purple-600 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition duration-500"></div>
                
                <div className="relative bg-white dark:bg-[#251a30] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 flex flex-col gap-6 shadow-xl dark:shadow-none">
                  {/* Amount Section */}
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-bold text-slate-500 dark:text-[#ad92c9] uppercase tracking-wider">Amount to send</label>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      {/* Asset Badge */}
                      <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#130b1b] p-3 pr-4 rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center text-white font-bold text-sm">
                          M
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">MOVE</span>
                          <span className="text-xs text-slate-500 dark:text-[#ad92c9]">Movement</span>
                        </div>
                      </div>
                      
                      {/* Amount Input */}
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent text-5xl md:text-6xl font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-[#362348] border-none focus:ring-0 p-0 leading-tight"
                        />
                        <div className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1 font-medium">
                          ≈ ${usdValue.toFixed(2)} USD • Balance: {formatBalance(balance)} MOVE
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-white/5 my-2" />

                  {/* Recipient Section */}
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-slate-500 dark:text-[#ad92c9] uppercase tracking-wider">Recipient</label>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#130b1b] p-2 rounded-2xl border border-slate-200 dark:border-white/10 focus-within:border-[#7f13ec]/50 focus-within:ring-2 ring-[#7f13ec]/20 transition-all">
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
                        className="p-2 hover:bg-slate-200 dark:hover:bg-[#362348] rounded-xl text-[#7f13ec] transition-colors flex items-center gap-2 text-sm font-bold px-3"
                      >
                        Paste
                      </button>
                      <button 
                        onClick={() => setShowScanner(true)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-[#362348] hover:bg-[#7f13ec] rounded-xl text-slate-700 dark:text-white transition-colors"
                      >
                        📷
                      </button>
                    </div>
                    
                    {/* Recipient Found */}
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
                        <span className="text-emerald-400">✓</span>
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

                  {/* Note (optional) */}
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
                        <span>⛽</span> Est. Gas Fee
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">~0.001 MOVE</span>
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
          </div>

          {/* RIGHT COLUMN: Sidebar */}
          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-[#7f13ec] to-[#5b0ba8] dark:from-[#2a1e35] dark:to-[#150d1d] rounded-3xl p-6 text-white relative overflow-hidden border border-[#7f13ec]/20 dark:border-white/5 shadow-xl dark:shadow-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 dark:bg-[#7f13ec]/30 rounded-full blur-[50px] -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-white/70 dark:text-[#ad92c9] text-sm font-medium mb-1">Your Balance</p>
                    <h3 className="text-3xl font-bold tracking-tight">{formatBalance(balance)} MOVE</h3>
                    <p className="text-white/70 dark:text-[#ad92c9] text-sm mt-1">{formatUSD(balance)}</p>
                  </div>
                  <Link href="/receive" className="bg-white p-2 rounded-xl shadow-lg hover:scale-105 transition-transform">
                    <div className="w-14 h-14 flex items-center justify-center text-3xl">📲</div>
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyAddress}
                    className="flex-1 bg-white/20 dark:bg-[#362348] hover:bg-white/30 dark:hover:bg-[#482e5e] py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    📋 Copy Address
                  </button>
                  <Link 
                    href="/receive"
                    className="flex-1 bg-white/20 dark:bg-[#362348] hover:bg-white/30 dark:hover:bg-[#482e5e] py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    🔗 Share
                  </Link>
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
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-[#362348] border-2 border-transparent group-hover:border-[#7f13ec] flex items-center justify-center transition-all">
                    <span className="text-[#7f13ec] text-2xl">+</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-[#ad92c9]">New</span>
                </Link>
                
                {contacts.slice(0, 4).map((contact) => (
                  <button 
                    key={contact._id}
                    onClick={() => selectContact(contact)}
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
            <div className="flex-1 bg-white dark:bg-[#251a30] rounded-3xl p-6 border border-slate-200 dark:border-white/5 flex flex-col shadow-lg dark:shadow-none">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Recent Activity</h3>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[300px] pr-1">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-[#ad92c9]">
                    <span className="text-3xl mb-2 block">📭</span>
                    <p className="text-sm">No recent transactions</p>
                  </div>
                ) : (
                  recentTransactions.map((tx) => {
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
                            <span className="text-lg">{isSent ? '📤' : '📥'}</span>
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
                            {isSent ? '-' : '+'}{tx.amount} MOVE
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
                className="w-full mt-4 py-2 text-sm font-bold text-slate-500 dark:text-[#ad92c9] hover:text-[#7f13ec] transition-colors border-t border-slate-200 dark:border-white/5 pt-4 text-center block"
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
    </DashboardLayout>
  );
}
