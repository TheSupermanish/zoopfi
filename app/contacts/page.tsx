'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { getContacts, addContact, deleteContact, getUserByUsername } from '../lib/api';

interface Contact {
  _id: string;
  username: string;
  nickname?: string;
  address: string;
  createdAt: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get wallet address
  useEffect(() => {
    if (authenticated && user) {
      const moveWallet = user.linkedAccounts?.find(
        (acc: any) => acc.chainType === 'aptos'
      ) as any;
      if (moveWallet?.address) {
        setWalletAddress(moveWallet.address);
      }
    } else if (connected && account?.address) {
      setWalletAddress(account.address.toString());
    }
  }, [authenticated, user, connected, account]);

  // Fetch contacts
  useEffect(() => {
    if (!walletAddress) return;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        const result = await getContacts(walletAddress);
        setContacts(result.contacts || []);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
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

  // Add new contact
  const handleAddContact = async () => {
    if (!newUsername) {
      setError('Please enter a username');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      // Verify user exists
      const userData = await getUserByUsername(newUsername);
      if (!userData) {
        setError('User not found');
        setIsAdding(false);
        return;
      }

      // Check if already added
      if (contacts.some((c) => c.username === newUsername)) {
        setError('Contact already exists');
        setIsAdding(false);
        return;
      }

      // Add contact
      const result = await addContact({
        ownerAddress: walletAddress,
        contactUsername: newUsername,
        contactAddress: userData.walletAddress,
        nickname: newNickname || undefined,
      });

      if (result.contact) {
        setContacts([result.contact, ...contacts]);
        setShowAddForm(false);
        setNewUsername('');
        setNewNickname('');
      }
    } catch (err) {
      setError('Failed to add contact');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete contact
  const handleDelete = async (contactId: string) => {
    if (!confirm('Remove this contact?')) return;

    try {
      await deleteContact(walletAddress, contactId);
      setContacts(contacts.filter((c) => c._id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate avatar color
  const getAvatarColor = (username: string) => {
    const colors = [
      'from-emerald-500 to-teal-600',
      'from-purple-500 to-indigo-600',
      'from-pink-500 to-rose-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="p-4 pt-safe flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-gray-400 text-sm">{contacts.length} saved contacts</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary py-2 px-4"
        >
          + Add
        </button>
      </header>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="input"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="px-4 mb-4">
          <div className="card p-4 space-y-4 animate-scale-in">
            <h3 className="text-lg font-bold text-white">Add Contact</h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium z-10">@</span>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Nickname (optional)</label>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="e.g., Mom, Boss, Friend"
                className="input"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUsername('');
                  setNewNickname('');
                  setError('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={isAdding || !newUsername}
                className="flex-1 btn btn-primary"
              >
                {isAdding ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-state-icon">👥</span>
            <p className="empty-state-title">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="empty-state-description">
              {searchQuery
                ? 'Try a different search term'
                : 'Add contacts for quick payments'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => (
              <div
                key={contact._id}
                className="card-solid p-4 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(contact.username)}`}
                    >
                      <span className="text-white font-bold text-lg">
                        {contact.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {contact.nickname || `@${contact.username}`}
                      </p>
                      {contact.nickname && (
                        <p className="text-gray-400 text-sm">@{contact.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/send?to=${contact.username}`}
                      className="btn btn-primary py-2 px-4 text-sm"
                    >
                      Send
                    </Link>
                    <button
                      onClick={() => handleDelete(contact._id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-target"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
