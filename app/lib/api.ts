// API calls go through Next.js proxy to backend
// This allows tunneling just the frontend while backend stays on localhost
const API_BASE = '/api/backend';

// User API
export const checkUsername = async (username: string): Promise<{ available: boolean; username: string }> => {
  const response = await fetch(`${API_BASE}/auth/check-username/${username}`);
  return response.json();
};

export const registerUser = async (walletAddress: string, username: string) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, walletAddress }),
  });
  return response.json();
};

export const getUserByUsername = async (username: string) => {
  const response = await fetch(`${API_BASE}/users/${username}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch user');
  }
  return response.json();
};

export const getUserByAddress = async (address: string) => {
  const response = await fetch(`${API_BASE}/users/address/${address}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch user');
  }
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

export const addGroupMember = async (groupId: string, username: string) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return response.json();
};

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

