'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getPaymentRequests, getUserByAddress, getContactRequests, respondToContactRequest } from '../lib/api';
import PaymentRequestModal from './PaymentRequestModal';

interface PaymentRequest {
  _id: string;
  requesterUsername: string;
  requesterAddress: string;
  amount: number;
  message?: string;
  status: string;
  createdAt: string;
}

interface ContactRequest {
  _id: string;
  senderUsername: string;
  senderAddress: string;
  message?: string;
  status: string;
  createdAt: string;
}

interface NotificationBellProps {
  walletAddress: string;
}

type NotificationType = 'payment' | 'friend';

interface Notification {
  id: string;
  type: NotificationType;
  data: PaymentRequest | ContactRequest;
}

export default function NotificationBell({ walletAddress }: NotificationBellProps) {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [friendRequests, setFriendRequests] = useState<ContactRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequest | null>(null);
  const [senderUsername, setSenderUsername] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCount = paymentRequests.length + friendRequests.length;

  // Fetch all notifications
  const fetchNotifications = async () => {
    if (!walletAddress) return;
    
    try {
      const [paymentResult, friendResult] = await Promise.all([
        getPaymentRequests(walletAddress, 'received'),
        getContactRequests(walletAddress, 'received'),
      ]);
      
      const pendingPayments = paymentResult.requests?.filter((r: any) => r.status === 'pending') || [];
      const pendingFriends = friendResult.requests?.filter((r: any) => r.status === 'pending') || [];
      
      setPaymentRequests(pendingPayments);
      setFriendRequests(pendingFriends);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch user's username
  useEffect(() => {
    if (!walletAddress) return;
    getUserByAddress(walletAddress).then((user) => {
      if (user) setSenderUsername(user.username);
    });
  }, [walletAddress]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [walletAddress]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePaymentClick = (request: PaymentRequest) => {
    setSelectedPaymentRequest(request);
    setIsOpen(false);
  };

  const handlePaymentModalComplete = () => {
    fetchNotifications();
    setSelectedPaymentRequest(null);
  };

  const handleFriendResponse = async (requestId: string, action: 'accept' | 'decline') => {
    setProcessingId(requestId);
    try {
      await respondToContactRequest(requestId, action, walletAddress);
      setFriendRequests(friendRequests.filter((r) => r._id !== requestId));
    } catch (error) {
      console.error('Error responding to friend request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Combine and sort notifications by date
  const allNotifications: Notification[] = [
    ...paymentRequests.map((p) => ({ id: p._id, type: 'payment' as NotificationType, data: p })),
    ...friendRequests.map((f) => ({ id: f._id, type: 'friend' as NotificationType, data: f })),
  ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl touch-target transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <Bell size={20} className="text-slate-700 dark:text-white" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div 
            className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#251a30] rounded-2xl overflow-hidden animate-scale-in z-50 border border-slate-200 dark:border-white/5 shadow-2xl"
            style={{ transformOrigin: 'top right' }}
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-slate-900 dark:text-white font-bold">Notifications</h3>
              {totalCount > 0 && (
                <span className="text-xs text-slate-600 dark:text-[#ad92c9] bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full">
                  {totalCount} pending
                </span>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {allNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="text-4xl mb-2 block">🔕</span>
                  <p className="text-slate-900 dark:text-white font-medium">All caught up!</p>
                  <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1">No pending notifications</p>
                </div>
              ) : (
                <div>
                  {allNotifications.map((notif) => {
                    if (notif.type === 'payment') {
                      const req = notif.data as PaymentRequest;
                      return (
                        <button
                          key={notif.id}
                          onClick={() => handlePaymentClick(req)}
                          className="w-full p-4 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {req.requesterUsername.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 dark:text-white text-sm font-bold">
                                💰 Payment Request
                              </p>
                              <p className="text-slate-700 dark:text-white text-sm">
                                {req.amount} USDC from @{req.requesterUsername}
                              </p>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs mt-1">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="text-[#7f13ec] text-xs font-bold px-2 py-1 bg-[#7f13ec]/10 rounded-full">
                                Pay →
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    } else {
                      const req = notif.data as ContactRequest;
                      const isProcessing = processingId === req._id;
                      return (
                        <div
                          key={notif.id}
                          className="p-4 border-b border-slate-100 dark:border-white/5"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {req.senderUsername.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 dark:text-white text-sm font-bold">
                                👋 Friend Request
                              </p>
                              <p className="text-slate-700 dark:text-white text-sm">
                                @{req.senderUsername} wants to be friends
                              </p>
                              {req.message && (
                                <p className="text-slate-500/70 dark:text-[#ad92c9]/70 text-xs mt-1 italic">
                                  "{req.message}"
                                </p>
                              )}
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs mt-1">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 ml-13 pl-13">
                            <button
                              onClick={() => handleFriendResponse(req._id, 'decline')}
                              disabled={isProcessing}
                              className="flex-1 py-2 text-sm font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-[#ad92c9] rounded-lg transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleFriendResponse(req._id, 'accept')}
                              disabled={isProcessing}
                              className="flex-1 py-2 text-sm font-bold bg-[#7f13ec] hover:bg-[#7f13ec]/80 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? '...' : 'Accept'}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>

            {allNotifications.length > 0 && (
              <div className="border-t border-slate-200 dark:border-white/5 p-2 flex gap-2">
                <Link
                  href="/receive?tab=request"
                  className="flex-1 text-center py-2 text-[#7f13ec] text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  Payment Requests
                </Link>
                <Link
                  href="/contacts?tab=requests"
                  className="flex-1 text-center py-2 text-[#7f13ec] text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  Friend Requests
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Request Modal */}
      {selectedPaymentRequest && (
        <PaymentRequestModal
          request={selectedPaymentRequest}
          walletAddress={walletAddress}
          senderUsername={senderUsername}
          isOpen={!!selectedPaymentRequest}
          onClose={() => setSelectedPaymentRequest(null)}
          onComplete={handlePaymentModalComplete}
        />
      )}
    </>
  );
}
