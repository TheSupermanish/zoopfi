'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Navbar from '../components/Navbar';
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

  // Redirect if not connected (only check once after initial load)
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
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="p-4 pt-safe">
        <h1 className="text-2xl font-bold text-white">Receive</h1>
        <p className="text-gray-400 text-sm">Share your QR or create a request</p>
      </header>

      {/* Tabs */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 p-1 rounded-xl glass">
          <button
            onClick={() => setTab('qr')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all touch-target ${
              tab === 'qr'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📲 QR Code
          </button>
          <button
            onClick={() => setTab('request')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all touch-target ${
              tab === 'request'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Requests
          </button>
        </div>
      </div>

      <div className="px-4">
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
            <div className="card p-4">
              <label className="block text-sm text-gray-400 mb-2">
                Request specific amount (optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="input pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  MOVE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
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
                className="w-full btn btn-primary py-4 text-lg"
              >
                <span className="mr-2">➕</span>
                Create Payment Request
              </button>
            )}

            {/* Request Form */}
            {showRequestForm && (
              <div className="card p-6 space-y-4 animate-scale-in">
                <h3 className="text-lg font-bold text-white">New Payment Request</h3>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="input pr-16"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      MOVE
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    From (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium z-10">@</span>
                    <input
                      type="text"
                      value={requestPayer}
                      onChange={(e) => setRequestPayer(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="anyone"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Message (optional)
                  </label>
                  <input
                    type="text"
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="What's this for?"
                    className="input"
                    maxLength={200}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRequestForm(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRequest}
                    disabled={isCreatingRequest || !requestAmount}
                    className="flex-1 btn btn-primary"
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
              <h3 className="text-lg font-bold text-white mb-4">Your Requests</h3>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner" />
                </div>
              ) : requests.length === 0 ? (
                <div className="empty-state card">
                  <span className="empty-state-icon">📋</span>
                  <p className="empty-state-title">No payment requests yet</p>
                  <p className="empty-state-description">
                    Create a request to ask someone to pay you
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req._id}
                      className="card-solid p-4 card-hover"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-white">
                          {req.amount} MOVE
                        </span>
                        <span className={`badge ${
                          req.status === 'pending'
                            ? 'badge-warning'
                            : req.status === 'paid'
                            ? 'badge-success'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      {req.payerUsername && (
                        <p className="text-gray-400 text-sm">
                          From: <span className="text-emerald-400">@{req.payerUsername}</span>
                        </p>
                      )}
                      {req.message && (
                        <p className="text-gray-500 text-sm mt-1 italic">"{req.message}"</p>
                      )}
                      <p className="text-gray-600 text-xs mt-2">
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
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-lg animate-fade-in-up z-50">
          {toastMessage}
        </div>
      )}

      <Navbar />
    </div>
  );
}

