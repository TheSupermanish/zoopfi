'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import DashboardLayout from '../components/DashboardLayout';
import QRCodeCard from '../components/QRCodeCard';
import { getUserByAddress, getPaymentRequests, createPaymentRequest } from '../lib/api';

type Tab = 'qr' | 'request';

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

export default function ReceivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'qr');
  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Request form
  const [requestAmount, setRequestAmount] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestPayer, setRequestPayer] = useState('');
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

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
        const userData = await getUserByAddress(address);
        if (userData) {
          setUsername(userData.username);
        }
      }
    };

    setup();
  }, [authenticated, user, connected, account]);

  // Fetch payment requests
  useEffect(() => {
    if (!walletAddress) return;

    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const result = await getPaymentRequests(walletAddress, 'sent');
        setRequests(result.requests || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [walletAddress]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Show toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
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
        showToast('Payment request created!');
      }
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setIsCreatingRequest(false);
    }
  };

  return (
    <DashboardLayout username={username} walletAddress={walletAddress}>
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Receive</h1>
          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Share your QR or create a request</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 rounded-xl bg-slate-200 dark:bg-[#251a30] border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setTab('qr')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                tab === 'qr'
                  ? 'bg-[#7f13ec] text-white shadow-lg'
                  : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
              }`}
              style={{ boxShadow: tab === 'qr' ? '0 10px 40px -10px rgba(127, 19, 236, 0.5)' : 'none' }}
            >
              📲 QR Code
            </button>
            <button
              onClick={() => setTab('request')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                tab === 'request'
                  ? 'bg-[#7f13ec] text-white shadow-lg'
                  : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white'
              }`}
              style={{ boxShadow: tab === 'request' ? '0 10px 40px -10px rgba(127, 19, 236, 0.5)' : 'none' }}
            >
              📋 Requests
            </button>
          </div>
        </div>

        {/* QR Tab */}
        {tab === 'qr' && username && walletAddress && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Beautiful QR Code */}
            <QRCodeCard 
              username={username}
              amount={amount || undefined}
              walletAddress={walletAddress}
              onShare={() => showToast('Link copied!')}
            />

            {/* Amount Input */}
            <div className="bg-white dark:bg-[#251a30] rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
              <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-3">
                Request specific amount (optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="input h-14 pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#ad92c9] font-bold">
                  MOVE
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60 mt-2">
                Adding an amount will update the QR code
              </p>
            </div>
          </div>
        )}

        {/* Request Tab */}
        {tab === 'request' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Create Request Button */}
            {!showRequestForm && (
              <button
                onClick={() => setShowRequestForm(true)}
                className="w-full btn btn-primary py-4 text-lg h-14"
              >
                <span className="mr-2">➕</span>
                Create Payment Request
              </button>
            )}

            {/* Request Form */}
            {showRequestForm && (
              <div className="bg-white dark:bg-[#251a30] rounded-2xl p-6 space-y-4 animate-scale-in border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
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
                      MOVE
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-2">
                    From (optional)
                  </label>
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
                  <label className="block text-sm text-slate-500 dark:text-[#ad92c9] mb-2">
                    Message (optional)
                  </label>
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
                    {isCreatingRequest ? (
                      <span className="flex items-center gap-2">
                        <div className="spinner spinner-sm" />
                        Creating...
                      </span>
                    ) : (
                      'Create Request'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Pending Requests */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Your Requests</h3>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner" />
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white dark:bg-[#251a30] rounded-2xl p-8 text-center border border-slate-200 dark:border-white/5 shadow-lg dark:shadow-none">
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
                      className="bg-white dark:bg-[#251a30] rounded-2xl p-4 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all shadow-lg dark:shadow-none"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {req.amount} MOVE
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

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#7f13ec] text-white text-sm font-bold shadow-lg animate-fade-in-up z-50">
          {toastMessage}
        </div>
      )}
    </DashboardLayout>
  );
}
