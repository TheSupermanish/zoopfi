// API calls go through Next.js proxy to backend
// This allows tunneling just the frontend while backend stays on localhost
const API_BASE = '/api/backend';

// Types
export type AccountType = 'personal' | 'business';
export type BusinessCategory = 'retail' | 'food' | 'services' | 'technology' | 'healthcare' | 'entertainment' | 'other';

export interface BusinessInfo {
  ownerFirstName: string;
  ownerLastName: string;
  category: BusinessCategory;
  description?: string;
  address?: string;
  website?: string;
}

export interface RegisterData {
  walletAddress: string;
  username: string;
  accountType: AccountType;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  businessInfo?: BusinessInfo;
}

export interface UserData {
  username: string;
  walletAddress: string;
  accountType: AccountType;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  totalSent: number;
  totalReceived: number;
  streak: number;
  transferCount: number;
  lastActivityDate?: string;
  businessInfo?: BusinessInfo;
}

// User API
export const checkUsername = async (username: string): Promise<{ available: boolean; username: string }> => {
  const response = await fetch(`${API_BASE}/auth/check-username/${username}`);
  return response.json();
};

export const registerUser = async (data: RegisterData) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getUserByUsername = async (username: string): Promise<UserData | null> => {
  const response = await fetch(`${API_BASE}/users/${username}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch user');
  }
  return response.json();
};

export const getUserByAddress = async (address: string): Promise<UserData | null> => {
  const response = await fetch(`${API_BASE}/users/address/${address}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch user');
  }
  return response.json();
};

// Shielded-pool key directory ------------------------------------------------

export interface PoolKeys {
  username: string;
  displayName?: string;
  notePubKey: string;
  encryptionPubKey: string;
}

/** Publish my shielded-pool public keys so others can pay me by @username. Best-effort. */
export const publishPoolKeys = async (
  walletAddress: string,
  notePubKey: string,
  encryptionPubKey: string,
): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/privacy/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, notePubKey, encryptionPubKey }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Resolve a @username to its shielded-pool public keys.
 * `userExists` distinguishes "no such Zoopfi user" (safe to fall back to a demo
 * keypair) from "user exists but hasn't enabled private payments" (must NOT
 * send — the recipient couldn't claim it).
 */
export const resolvePoolKeys = async (
  username: string,
): Promise<{ keys: PoolKeys | null; userExists: boolean }> => {
  try {
    const res = await fetch(`${API_BASE}/privacy/keys?username=${encodeURIComponent(username)}`);
    if (res.ok) return { keys: (await res.json()) as PoolKeys, userExists: true };
    if (res.status === 409) return { keys: null, userExists: true }; // exists, no keys yet
    return { keys: null, userExists: false }; // 404 / not a Zoopfi user
  } catch {
    return { keys: null, userExists: false };
  }
};

export const convertToBusiness = async (
  walletAddress: string,
  businessInfo: BusinessInfo,
  displayName?: string
) => {
  const response = await fetch(`${API_BASE}/users/address/${walletAddress}/convert-to-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessInfo, displayName }),
  });
  return response.json();
};

export const updateUserProfile = async (
  walletAddress: string,
  data: {
    displayName?: string;
    avatarUrl?: string;
    email?: string;
    phone?: string;
    businessInfo?: Partial<BusinessInfo>;
  }
) => {
  const response = await fetch(`${API_BASE}/users/address/${walletAddress}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

// Transaction API
export const getTransactions = async (address: string, limit = 20, offset = 0) => {
  const response = await fetch(
    `${API_BASE}/transactions?address=${address}&limit=${limit}&offset=${offset}`
  );
  return response.json();
};

export const recordTransaction = async (data: {
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  amount: number;
  txHash: string;
  type?: string;
  note?: string;
}) => {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

// Contacts API
export const getContacts = async (address: string) => {
  const response = await fetch(`${API_BASE}/contacts?address=${address}`);
  return response.json();
};

export const addContact = async (data: {
  ownerAddress: string;
  contactUsername: string;
  contactAddress: string;
  nickname?: string;
}) => {
  const response = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteContact = async (ownerAddress: string, contactId: string) => {
  const response = await fetch(
    `${API_BASE}/contacts/${contactId}?ownerAddress=${ownerAddress}`,
    { method: 'DELETE' }
  );
  return response.json();
};

// Payment Requests API
export const getPaymentRequests = async (address: string, type: 'all' | 'sent' | 'received' = 'all') => {
  const response = await fetch(`${API_BASE}/requests?address=${address}&type=${type}`);
  return response.json();
};

export const createPaymentRequest = async (data: {
  requesterAddress: string;
  payerUsername?: string;
  amount: number;
  message?: string;
  expiresInHours?: number;
}) => {
  const response = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updatePaymentRequest = async (requestId: string, status: 'paid' | 'cancelled', txHash?: string) => {
  const response = await fetch(`${API_BASE}/requests/${requestId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, txHash }),
  });
  return response.json();
};

// Rewards API
export const getStreakInfo = async (address: string) => {
  const response = await fetch(`${API_BASE}/rewards/streak?address=${address}`);
  return response.json();
};

export const updateStreak = async (address: string) => {
  const response = await fetch(`${API_BASE}/rewards/streak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  return response.json();
};

// Contact Requests API (Friend Requests)
export const sendContactRequest = async (senderAddress: string, receiverUsername: string, message?: string) => {
  const response = await fetch(`${API_BASE}/contact-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderAddress, receiverUsername, message }),
  });
  return response.json();
};

export const getContactRequests = async (address: string, type: 'all' | 'sent' | 'received' = 'received') => {
  const response = await fetch(`${API_BASE}/contact-requests?address=${address}&type=${type}`);
  return response.json();
};

export const getPendingContactRequestsCount = async (address: string) => {
  const response = await fetch(`${API_BASE}/contact-requests/pending?address=${address}`);
  return response.json();
};

export const respondToContactRequest = async (requestId: string, action: 'accept' | 'decline', address: string) => {
  const response = await fetch(`${API_BASE}/contact-requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, address }),
  });
  return response.json();
};

export const cancelContactRequest = async (requestId: string, address: string) => {
  const response = await fetch(`${API_BASE}/contact-requests/${requestId}?address=${address}`, {
    method: 'DELETE',
  });
  return response.json();
};

// Groups API (Bill Splitting)
export const getGroups = async (address: string) => {
  const response = await fetch(`${API_BASE}/groups?address=${address}`);
  return response.json();
};

export const getGroup = async (groupId: string) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}`);
  return response.json();
};

export const createGroup = async (data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  creatorAddress: string;
  memberUsernames?: string[];
}) => {
  const response = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updateGroup = async (groupId: string, data: {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const inviteGroupMember = async (groupId: string, username: string, inviterAddress: string) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, inviterAddress }),
  });
  return response.json();
};

// Keep old name for backwards compatibility, but now sends invitation
export const addGroupMember = inviteGroupMember;

export const removeGroupMember = async (groupId: string, address: string) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/members/${address}`, {
    method: 'DELETE',
  });
  return response.json();
};

export const addGroupExpense = async (groupId: string, data: {
  description: string;
  amount: number;
  category?: string;
  paidByAddress: string;
  splitType?: 'equal' | 'exact' | 'percentage';
  splitWith?: string[];
  splits?: { walletAddress: string; username: string; amount: number }[];
}) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getGroupExpenses = async (groupId: string, limit = 50, offset = 0) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/expenses?limit=${limit}&offset=${offset}`);
  return response.json();
};

export const settleGroupPayment = async (groupId: string, data: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  txHash?: string;
}) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteGroup = async (groupId: string, address: string) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}?address=${address}`, {
    method: 'DELETE',
  });
  return response.json();
};

// Group Invitations API
export const getGroupInvitations = async (address: string) => {
  const response = await fetch(`${API_BASE}/groups/invitations/pending?address=${address}`);
  return response.json();
};

export const acceptGroupInvitation = async (invitationId: string, address: string) => {
  const response = await fetch(`${API_BASE}/groups/invitations/${invitationId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  return response.json();
};

export const declineGroupInvitation = async (invitationId: string, address: string) => {
  const response = await fetch(`${API_BASE}/groups/invitations/${invitationId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  return response.json();
};

// Invoice API
export const getInvoices = async (
  address: string,
  role: 'business' | 'customer' = 'business',
  status: string = 'all'
) => {
  const response = await fetch(
    `${API_BASE}/invoices?address=${address}&role=${role}&status=${status}`
  );
  return response.json();
};

export const getInvoice = async (invoiceId: string) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);
  return response.json();
};

export const createInvoice = async (data: {
  businessAddress: string;
  customerDisplayName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerUsername?: string;
  lineItems: any[];
  dueDate: string;
  notes?: string;
  terms?: string;
  customerInfo?: {
    address?: string;
    phone?: string;
  };
  status?: 'draft' | 'sent';
}) => {
  const response = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updateInvoice = async (invoiceId: string, data: any) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const sendInvoice = async (invoiceId: string, businessAddress: string) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessAddress }),
  });
  return response.json();
};

export const payInvoice = async (
  invoiceId: string,
  customerAddress: string,
  txHash: string,
  amount: number
) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerAddress, txHash, amount }),
  });
  return response.json();
};

export const cancelInvoice = async (invoiceId: string, businessAddress: string) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessAddress }),
  });
  return response.json();
};

export const deleteInvoice = async (invoiceId: string, businessAddress: string) => {
  const response = await fetch(
    `${API_BASE}/invoices/${invoiceId}?businessAddress=${businessAddress}`,
    { method: 'DELETE' }
  );
  return response.json();
};

export const downloadInvoicePDF = async (invoiceId: string) => {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}/pdf`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

