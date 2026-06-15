'use client';

import { useState, useEffect, useRef } from 'react';
import { getPaymentRequests, getUserByAddress } from '../lib/api';
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

interface NotificationBellProps {
  walletAddress: string;
}

export default function NotificationBell({ walletAddress }: NotificationBellProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [senderUsername, setSenderUsername] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending payment requests
  const fetchRequests = async () => {
    if (!walletAddress) return;
    
    try {
      const result = await getPaymentRequests(walletAddress, 'received');
      const pending = result.requests?.filter((r: any) => r.status === 'pending') || [];
      setRequests(pending);
      setUnreadCount(pending.length);
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
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Poll every 30s
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

  const handleRequestClick = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setIsOpen(false);
  };

  const handleModalComplete = () => {
    fetchRequests(); // Refresh the list
    setSelectedRequest(null);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl glass touch-target transition-colors hover:bg-white/10"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div 
            className="absolute right-0 top-12 w-80 card overflow-hidden animate-scale-in z-50"
            style={{ transformOrigin: 'top right' }}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className="text-white font-bold">Notifications</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {requests.length === 0 ? (
                <div className="p-6 text-center">
                  <span className="text-3xl mb-2 block">🔕</span>
                  <p className="text-gray-500 text-sm">No pending requests</p>
                </div>
              ) : (
                <div>
                  {requests.map((req) => (
                    <button
                      key={req._id}
                      onClick={() => handleRequestClick(req)}
                      className="w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">
                            {req.requesterUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">
                            Payment request for {req.amount} MOVE
                          </p>
                          <p className="text-gray-400 text-xs">
                            from @{req.requesterUsername}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-500/10 rounded-full">
                            Pay
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {requests.length > 0 && (
              <a
                href="/receive?tab=request"
                className="block p-3 text-center text-emerald-400 text-sm font-medium hover:bg-white/5 transition-colors border-t border-white/5"
              >
                View All Requests →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Payment Request Modal */}
      {selectedRequest && (
        <PaymentRequestModal
          request={selectedRequest}
          walletAddress={walletAddress}
          senderUsername={senderUsername}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onComplete={handleModalComplete}
        />
      )}
    </>
  );
}
