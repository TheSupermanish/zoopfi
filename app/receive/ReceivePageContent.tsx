'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser } from '@/app/lib/hooks';
import AppShell from '../components/shell/AppShell';
import QRCodeCard from '../components/QRCodeCard';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';
import { getPaymentRequests, createPaymentRequest } from '../lib/api';
import { QrCode, Copy } from 'lucide-react';

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
  const { ready, address: walletAddress, authenticated, isConnected } = useWallet();
  const { data: userData } = useUser();
  const username = userData?.username ?? '';

  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'qr');
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
      if (ready && !authenticated && !isConnected) {
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
    <AppShell>
      <PageShell variant="focused">
        <PageHeader
          title="Receive"
          subtitle="Share your QR or create a request"
          icon={QrCode}
          center
        />

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
          <button
            onClick={() => setTab('qr')}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
              tab === 'qr'
                ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/30'
                : 'text-purple-200/60 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2"><QrCode className="h-4 w-4" /> QR Code</span>
          </button>
          <button
            onClick={() => setTab('request')}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
              tab === 'request'
                ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/30'
                : 'text-purple-200/60 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2"><Copy className="h-4 w-4" /> Requests</span>
          </button>
        </div>

        {/* QR Tab */}
        {tab === 'qr' && username && walletAddress && (
          <div className="animate-fade-in-up space-y-6">
            {/* Beautiful QR Code */}
            <QRCodeCard
              username={username}
              amount={amount || undefined}
              walletAddress={walletAddress}
              onShare={() => showToast('Link copied!')}
            />

            {/* Amount Input */}
            <Card>
              <label className="mb-3 block text-sm text-purple-200/60">
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-purple-200/60">
                  USDC
                </span>
              </div>
              <p className="mt-2 text-xs text-purple-200/55">
                Adding an amount will update the QR code
              </p>
            </Card>
          </div>
        )}

        {/* Request Tab */}
        {tab === 'request' && (
          <div className="animate-fade-in-up space-y-6">
            {/* Create Request Button */}
            {!showRequestForm && (
              <button
                onClick={() => setShowRequestForm(true)}
                className="btn btn-primary h-14 w-full py-4 text-lg"
              >
                <span className="mr-2">➕</span>
                Create Payment Request
              </button>
            )}

            {/* Request Form */}
            {showRequestForm && (
              <Card className="animate-scale-in space-y-4">
                <h3 className="text-base font-semibold text-white">New Payment Request</h3>

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
                  <label className="mb-2 block text-sm text-purple-200/60">
                    From (optional)
                  </label>
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
                  <label className="mb-2 block text-sm text-purple-200/60">
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
                    className="btn btn-secondary h-12 flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRequest}
                    disabled={isCreatingRequest || !requestAmount}
                    className="btn btn-primary h-12 flex-1"
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
              </Card>
            )}

            {/* Pending Requests */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-white">Your Requests</h3>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner" />
                </div>
              ) : requests.length === 0 ? (
                <Card className="text-center">
                  <Copy className="mx-auto mb-3 h-10 w-10 text-purple-200/60" />
                  <p className="font-semibold text-white">No payment requests yet</p>
                  <p className="mt-1 text-sm text-purple-200/60">
                    Create a request to ask someone to pay you
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <Card
                      key={req._id}
                      className="p-4 transition-colors hover:border-[#9b3bff]/30"
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
                        <p className="mt-1 text-sm italic text-purple-200/55">"{req.message}"</p>
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
      </PageShell>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-full bg-[#7f13ec] px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </AppShell>
  );
}
