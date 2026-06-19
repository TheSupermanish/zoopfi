'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser } from '@/app/lib/hooks';
import Link from 'next/link';
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';
import {
  getContacts,
  deleteContact,
  getUserByUsername,
  sendContactRequest,
  getContactRequests,
  respondToContactRequest,
  cancelContactRequest,
} from '../lib/api';
import { toast } from 'sonner';
import {
  UserPlus,
  Users,
  Inbox,
  Send,
  MailOpen,
  Search,
  User,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface Contact {
  _id: string;
  contactUsername: string;
  nickname?: string;
  contactAddress: string;
  createdAt: string;
}

interface ContactRequest {
  _id: string;
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: string;
}

type Tab = 'friends' | 'requests' | 'sent';

/** Format a date, but never render "Invalid Date" when the value is missing/bad. */
const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? t.toLocaleDateString('en-US', opts) : 'recently';
};

export default function ContactsPage() {
  const router = useRouter();
  const { address: walletAddress, authenticated, isConnected } = useWallet();
  const { data: userData } = useUser();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ContactRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  // Add friend form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setListLoading(true);
      try {
        const [contactsResult, receivedResult, sentResult] = await Promise.all([
          getContacts(walletAddress),
          getContactRequests(walletAddress, 'received'),
          getContactRequests(walletAddress, 'sent'),
        ]);

        setContacts(contactsResult.contacts || []);
        setReceivedRequests(
          (receivedResult.requests || []).filter((r: ContactRequest) => r.status === 'pending')
        );
        setSentRequests(
          (sentResult.requests || []).filter((r: ContactRequest) => r.status === 'pending')
        );
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setListLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Send friend request
  const handleSendRequest = async () => {
    if (!newUsername) {
      setError('Please enter a username');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      const userData = await getUserByUsername(newUsername);
      if (!userData) {
        setError('User not found');
        setIsAdding(false);
        return;
      }

      if (contacts.some((c) => c.contactUsername === newUsername)) {
        setError('You are already friends with this user');
        setIsAdding(false);
        return;
      }

      const result = await sendContactRequest(walletAddress, newUsername, requestMessage || undefined);

      if (result.error) {
        setError(result.error);
      } else if (result.autoAccepted) {
        toast.success('You are now friends! 🎉');
        const contactsResult = await getContacts(walletAddress);
        setContacts(contactsResult.contacts || []);
        setShowAddForm(false);
        setNewUsername('');
        setRequestMessage('');
      } else {
        toast.success('Friend request sent!');
        setSentRequests([result.request, ...sentRequests]);
        setShowAddForm(false);
        setNewUsername('');
        setRequestMessage('');
      }
    } catch (err) {
      setError('Failed to send friend request');
    } finally {
      setIsAdding(false);
    }
  };

  // Accept/Decline request
  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const result = await respondToContactRequest(requestId, action, walletAddress);

      if (result.error) {
        toast.error(result.error);
      } else {
        setReceivedRequests(receivedRequests.filter((r) => r._id !== requestId));

        if (action === 'accept') {
          toast.success('Friend added! 🎉');
          const contactsResult = await getContacts(walletAddress);
          setContacts(contactsResult.contacts || []);
        } else {
          toast.success('Request declined');
        }
      }
    } catch (err) {
      console.error('Error responding to request:', err);
    }
  };

  // Cancel sent request
  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelContactRequest(requestId, walletAddress);
      setSentRequests(sentRequests.filter((r) => r._id !== requestId));
      toast.success('Request cancelled');
    } catch (err) {
      console.error('Error cancelling request:', err);
    }
  };

  // Remove friend
  const handleRemoveFriend = async (contactId: string) => {
    if (!confirm('Remove this friend?')) return;

    try {
      await deleteContact(walletAddress, contactId);
      setContacts(contacts.filter((c) => c._id !== contactId));
      toast.success('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(
    (c) =>
      c.contactUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate avatar color
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-[#7f13ec] to-[#a855f7]',
      'from-emerald-500 to-teal-600',
      'from-pink-500 to-rose-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const pendingCount = receivedRequests.length;

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
      active
        ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/30'
        : 'text-purple-200/60 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <AppShell>
      <PageShell variant="wide">
        <PageHeader
          title="Friends"
          subtitle="Connect and send money to your friends instantly."
          icon={Users}
          accent="rose"
          action={
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
            >
              <UserPlus className="h-5 w-5" />
              Add Friend
            </button>
          }
        />

        {/* Tabs */}
        <div className="surface mb-4 flex gap-1.5 rounded-2xl p-1.5">
          <button onClick={() => setActiveTab('friends')} className={tabClass(activeTab === 'friends')}>
            <Users className="h-4 w-4" />
            Friends ({contacts.length})
          </button>
          <button onClick={() => setActiveTab('requests')} className={`relative ${tabClass(activeTab === 'requests')}`}>
            <Inbox className="h-4 w-4" />
            Requests
            {pendingCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('sent')} className={tabClass(activeTab === 'sent')}>
            <Send className="h-4 w-4" />
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-4">
            {/* Search */}
            <label className="flex h-12 w-full items-center rounded-xl border border-white/10 bg-black/30 px-4 transition-colors focus-within:border-[#9b3bff]/60">
              <Search className="h-5 w-5 text-purple-200/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ml-3 w-full border-none bg-transparent text-white placeholder-purple-200/40 focus:outline-none focus:ring-0"
                placeholder="Search friends by name..."
              />
            </label>

            {/* Friends List */}
            {listLoading ? (
              <div className="flex justify-center py-12">
                <div className="spinner" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <Card className="py-12 text-center">
                <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#9b3bff]/15 text-[#c89bff]">
                  <Users className="h-12 w-12" />
                </span>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-sm text-purple-200/60">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start connecting by sending friend requests to people you know!'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-3 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Your First Friend
                  </button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredContacts.map((contact, index) => (
                  <Card
                    key={contact._id}
                    className="lift group animate-fade-in-up"
                  >
                    <div className="flex items-center gap-4" style={{ animationDelay: `${index * 50}ms` }}>
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarColor(contact.contactUsername)} shadow-lg transition-transform group-hover:scale-105`}
                      >
                        <span className="text-xl font-bold text-white">
                          {contact.contactUsername.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white transition-colors group-hover:text-[#c89bff]">
                          @{contact.contactUsername}
                        </p>
                        <p className="text-sm text-purple-200/60">
                          Friends since {fmtDate(contact.createdAt, { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                      <Link
                        href={`/transact?to=${contact.contactUsername}`}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-sm font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </Link>
                      <Link
                        href={`/profile/${contact.contactUsername}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                      >
                        <User className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleRemoveFriend(contact._id)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-purple-200/60 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="flex flex-col gap-4">
            {receivedRequests.length === 0 ? (
              <Card className="py-12 text-center">
                <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                  <MailOpen className="h-12 w-12" />
                </span>
                <h3 className="mb-2 text-base font-semibold text-white">No pending requests</h3>
                <p className="mx-auto max-w-sm text-sm text-purple-200/60">
                  When someone sends you a friend request, it will appear here for you to accept or decline.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request, index) => (
                  <Card key={request._id} className="animate-fade-in-up">
                    <div className="flex items-start gap-4" style={{ animationDelay: `${index * 50}ms` }}>
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarColor(request.senderUsername)} shadow-lg`}
                      >
                        <span className="text-xl font-bold text-white">
                          {request.senderUsername.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-white">@{request.senderUsername}</p>
                        <p className="text-sm text-purple-200/60">wants to be your friend</p>
                        {request.message && (
                          <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-3">
                            <p className="text-sm italic text-purple-200/60">"{request.message}"</p>
                          </div>
                        )}
                        <p className="mt-3 text-xs text-purple-200/45">
                          {fmtDate(request.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3 border-t border-white/5 pt-4">
                      <button
                        onClick={() => handleRespondToRequest(request._id, 'decline')}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(request._id, 'accept')}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
                      >
                        <Check className="h-5 w-5" />
                        Accept
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <div className="flex flex-col gap-4">
            {sentRequests.length === 0 ? (
              <Card className="py-12 text-center">
                <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <Send className="h-12 w-12" />
                </span>
                <h3 className="mb-2 text-base font-semibold text-white">No sent requests</h3>
                <p className="mx-auto max-w-sm text-sm text-purple-200/60">
                  Requests you've sent will appear here while they're waiting for a response.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request, index) => (
                  <Card key={request._id} className="animate-fade-in-up">
                    <div className="flex items-center justify-between" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarColor(request.receiverUsername)} shadow-lg`}
                        >
                          <span className="text-xl font-bold text-white">
                            {request.receiverUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">@{request.receiverUsername}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-sm font-medium text-amber-300">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                              Pending
                            </span>
                            <span className="text-xs text-purple-200/45">
                              • Sent {fmtDate(request.createdAt, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(request._id)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </PageShell>

      {/* Add Friend Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface-strong animate-scale-in w-full max-w-md rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9b3bff]/15 text-[#c89bff]">
                  <UserPlus className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">Add Friend</h2>
                  <p className="text-sm text-purple-200/60">Send a friend request</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                  setNewUsername('');
                  setRequestMessage('');
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-purple-200/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-purple-200/80">Username *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 font-bold text-[#c89bff]">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="h-14 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-purple-200/80">Message (optional)</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hey! Let's be friends on Zoopfi 👋"
                  className="h-14 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none transition-all placeholder:text-purple-200/40 focus:border-[#9b3bff]/60"
                  maxLength={200}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUsername('');
                    setRequestMessage('');
                    setError('');
                  }}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={isAdding || !newUsername}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <div className="spinner-sm" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
