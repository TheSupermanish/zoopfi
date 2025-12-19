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

