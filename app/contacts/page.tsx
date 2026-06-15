'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser } from '@/app/lib/hooks';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
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

export default function ContactsPage() {
  const router = useRouter();
  const { address: walletAddress, authenticated, isConnected } = useWallet();
  const { data: userData } = useUser();
  const username = userData?.username ?? '';

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

  return (
    <DashboardLayout username={username} walletAddress={walletAddress}>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
        {/* Background Gradient */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#7f13ec]/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
          {/* Page Header */}
          <header className="flex flex-wrap justify-between items-end gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-slate-900 dark:text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                Friends
              </h2>
              <p className="text-slate-500 dark:text-[#ad92c9] text-lg font-normal">
                Connect and send money to your friends instantly.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#7f13ec] text-white font-bold rounded-xl hover:bg-[#6a10c7] transition-colors shadow-lg shadow-[#7f13ec]/25"
            >
              <UserPlus className="w-5 h-5" />
              Add Friend
            </button>
          </header>

          {/* Tabs */}
          <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#191022]/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 dark:border-white/5">
            <div className="flex gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#362348] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'friends'
                    ? 'bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/25'
                    : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                Friends ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${
                  activeTab === 'requests'
                    ? 'bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/25'
                    : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Requests
                {pendingCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center ml-1">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'sent'
                    ? 'bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/25'
                    : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Send className="w-4 h-4" />
                Sent ({sentRequests.length})
              </button>
            </div>
          </div>

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <label className="flex w-full items-center rounded-2xl bg-white dark:bg-[#362348] h-14 px-4 border border-slate-200 dark:border-transparent focus-within:border-[#7f13ec]/50 transition-colors shadow-sm dark:shadow-none">
                  <Search className="w-5 h-5 text-slate-400 dark:text-[#ad92c9]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#ad92c9] focus:ring-0 ml-3 focus:outline-none"
                    placeholder="Search friends by name..."
                  />
                </label>
              </div>

              {/* Friends List */}
              {listLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="bg-white dark:bg-[#362348]/50 rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center mb-6">
                    <Users className="w-12 h-12 text-[#7f13ec]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {searchQuery ? 'No friends found' : 'No friends yet'}
                  </h3>
                  <p className="text-slate-500 dark:text-[#ad92c9] mb-6 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start connecting by sending friend requests to people you know!'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#7f13ec] text-white font-bold rounded-xl hover:bg-[#6a10c7] transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Your First Friend
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredContacts.map((contact, index) => (
                    <div
                      key={contact._id}
                      className="group bg-white dark:bg-[#362348] rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 hover:shadow-lg hover:shadow-[#7f13ec]/5 transition-all animate-fade-in-up shadow-sm dark:shadow-none"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getAvatarColor(contact.contactUsername)} shadow-lg group-hover:scale-105 transition-transform`}
                        >
                          <span className="text-white font-bold text-xl">
                            {contact.contactUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 dark:text-white font-bold text-lg truncate group-hover:text-[#7f13ec] transition-colors">
                            @{contact.contactUsername}
                          </p>
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                            Friends since {new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                        <Link
                          href={`/transact?to=${contact.contactUsername}`}
                          className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold rounded-xl text-sm transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </Link>
                        <Link
                          href={`/profile/${contact.contactUsername}`}
                          className="h-11 w-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl transition-colors text-slate-700 dark:text-white"
                        >
                          <User className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleRemoveFriend(contact._id)}
                          className="h-11 w-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 hover:bg-red-500/20 text-slate-500 dark:text-[#ad92c9] hover:text-red-500 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="flex flex-col gap-4">
              {receivedRequests.length === 0 ? (
                <div className="bg-white dark:bg-[#362348]/50 rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                    <MailOpen className="w-12 h-12 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No pending requests</h3>
                  <p className="text-slate-500 dark:text-[#ad92c9] max-w-sm mx-auto">
                    When someone sends you a friend request, it will appear here for you to accept or decline.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedRequests.map((request, index) => (
                    <div
                      key={request._id}
                      className="bg-white dark:bg-[#362348] rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all animate-fade-in-up shadow-sm dark:shadow-none"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getAvatarColor(request.senderUsername)} shadow-lg`}
                        >
                          <span className="text-white font-bold text-xl">
                            {request.senderUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 dark:text-white font-bold text-lg">@{request.senderUsername}</p>
                          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">wants to be your friend</p>
                          {request.message && (
                            <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                              <p className="text-slate-600 dark:text-[#ad92c9] text-sm italic">"{request.message}"</p>
                            </div>
                          )}
                          <p className="text-slate-400 dark:text-[#ad92c9]/50 text-xs mt-3">
                            {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                        <button
                          onClick={() => handleRespondToRequest(request._id, 'decline')}
                          className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold rounded-xl transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(request._id, 'accept')}
                          className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#7f13ec]/25"
                        >
                          <Check className="w-5 h-5" />
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Tab */}
          {activeTab === 'sent' && (
            <div className="flex flex-col gap-4">
              {sentRequests.length === 0 ? (
                <div className="bg-white dark:bg-[#362348]/50 rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Send className="w-12 h-12 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No sent requests</h3>
                  <p className="text-slate-500 dark:text-[#ad92c9] max-w-sm mx-auto">
                    Requests you've sent will appear here while they're waiting for a response.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((request, index) => (
                    <div
                      key={request._id}
                      className="bg-white dark:bg-[#362348] rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all animate-fade-in-up shadow-sm dark:shadow-none"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getAvatarColor(request.receiverUsername)} shadow-lg`}
                          >
                            <span className="text-white font-bold text-xl">
                              {request.receiverUsername.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold text-lg">@{request.receiverUsername}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Pending
                              </span>
                              <span className="text-slate-400 dark:text-[#ad92c9]/50 text-xs">
                                • Sent {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelRequest(request._id)}
                          className="px-4 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-red-500/20 text-slate-700 dark:text-white hover:text-red-500 font-bold rounded-xl text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#251a30] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-[#7f13ec]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Friend</h2>
                  <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Send a friend request</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                  setNewUsername('');
                  setRequestMessage('');
                }}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-[#ad92c9] hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Username *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f13ec] font-bold z-10">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="w-full h-14 rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] pl-10 pr-4 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message (optional)</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hey! Let's be friends on Zoopfi 👋"
                  className="w-full h-14 rounded-xl border border-slate-300 dark:border-[#4d3267] bg-slate-50 dark:bg-[#1a1122] px-4 text-slate-900 dark:text-white focus:border-[#7f13ec] focus:ring-1 focus:ring-[#7f13ec] outline-none transition-all placeholder:text-slate-400"
                  maxLength={200}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-500 text-sm">{error}</p>
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
                  className="flex-1 h-12 flex items-center justify-center bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={isAdding || !newUsername}
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#7f13ec] hover:bg-[#6a10c7] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#7f13ec]/25"
                >
                  {isAdding ? (
                    <>
                      <div className="spinner-sm" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
