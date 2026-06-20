'use client';

/**
 * Demo mode: makes the entire app navigable with NO Privy app ID, NO backend,
 * and NO MongoDB. It (1) bypasses Privy auth with a fake authenticated wallet,
 * and (2) intercepts backend API calls (`/api/backend/*`) and serves them from
 * a STATEFUL in-memory store persisted to localStorage. Create/edit flows
 * (groups, expenses, members, contacts, requests, transactions) actually work
 * and survive reloads. Combined with the mock chain adapter, the full UX runs
 * entirely client-side.
 *
 * DESIGN-PREVIEW ONLY. It does NOT exercise the real Privy -> Stellar wallet
 * connect. Opt-in via NEXT_PUBLIC_DEMO_MODE=1 (see config.ts DEMO_MODE).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { CHAIN_ADAPTER, getExplorerUrl } from './config';
import { createMockChainOps } from './mock';
import { WalletStateContext, type WalletState } from './useWallet';

// A valid-format (fake) Stellar G-address for the demo user.
export const DEMO_ADDRESS = 'GDEMO' + 'A'.repeat(51);

const nowIso = () => new Date().toISOString();
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
// Synthesize a deterministic-ish G-address for a username.
const addrFor = (uname: string) => ('G' + uname.toUpperCase().replace(/[^A-Z2-7]/g, 'X') + 'X'.repeat(55)).slice(0, 56);

const BASE_USER = {
  username: 'demo',
  walletAddress: DEMO_ADDRESS,
  accountType: 'personal' as 'personal' | 'business',
  displayName: 'Demo User',
  email: 'demo@zoopfi.app',
  createdAt: ago(60 * 24 * 30),
  totalSent: 320.5,
  totalReceived: 512.25,
  streak: 4,
  transferCount: 23,
  lastActivityDate: ago(120),
  businessInfo: undefined as any,
};

const DEMO_STREAK = {
  streak: 4,
  transferCount: 23,
  lastActivityDate: ago(120),
  currentMilestone: { name: 'Rising Star', emoji: '🚀', count: 10 },
  nextMilestone: { name: 'Pro Sender', emoji: '⭐', count: 50 },
};

interface DemoDB {
  user: Partial<typeof BASE_USER>;
  contacts: any[];
  contactRequests: any[];
  paymentRequests: any[];
  transactions: any[];
  groups: any[];
  expenses: Record<string, any[]>;
  invoices: any[];
}

const DB_KEY = 'zoopfi.demo.db.v2';

function seedDB(): DemoDB {
  const mk = (id: string, name: string, nickname: string) => ({
    _id: id, ownerAddress: DEMO_ADDRESS, username: name, walletAddress: addrFor(name),
    contactUsername: name, contactAddress: addrFor(name), nickname,
  });
  return {
    user: {},
    contacts: [mk('c1', 'alice', 'Alice'), mk('c2', 'bob', 'Bob'), mk('c3', 'carol', 'Carol')],
    contactRequests: [],
    paymentRequests: [],
    transactions: [
      { _id: 't1', senderUsername: 'demo', receiverUsername: 'alice', senderAddress: DEMO_ADDRESS, receiverAddress: addrFor('alice'), amount: 25, txHash: 'demo_tx_1'.padEnd(64, '0'), type: 'send', status: 'confirmed', timestamp: ago(30), note: 'Lunch' },
      { _id: 't2', senderUsername: 'bob', receiverUsername: 'demo', senderAddress: addrFor('bob'), receiverAddress: DEMO_ADDRESS, amount: 100, txHash: 'demo_tx_2'.padEnd(64, '0'), type: 'receive', status: 'confirmed', timestamp: ago(240) },
      { _id: 't3', senderUsername: 'demo', receiverUsername: 'carol', senderAddress: DEMO_ADDRESS, receiverAddress: addrFor('carol'), amount: 12.5, txHash: 'demo_tx_3'.padEnd(64, '0'), type: 'send', status: 'confirmed', timestamp: ago(600), note: 'Coffee' },
    ],
    groups: [],
    expenses: {},
    invoices: [],
  };
}

function loadDB(): DemoDB {
  if (typeof window === 'undefined') return seedDB();
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const fresh = seedDB();
  saveDB(fresh);
  return fresh;
}

function saveDB(db: DemoDB) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

const currentUser = (db: DemoDB) => ({ ...BASE_USER, ...db.user });

const memberFromUsername = (uname: string) => ({
  username: uname, walletAddress: addrFor(uname), balance: 0, joinedAt: nowIso(),
});

const usernameForAddress = (db: DemoDB, addr: string, group: any): string => {
  if (addr === DEMO_ADDRESS) return currentUser(db).username || 'demo';
  const m = group?.members?.find((x: any) => x.walletAddress === addr);
  return m?.username || 'member';
};

/** Stateful demo backend. Returns the JSON body for a given request. */
function handle(path: string, method: string, body: any, query: URLSearchParams): unknown {
  const db = loadDB();
  const p = path.replace(/\/$/, '');
  const seg = p.split('/').filter(Boolean); // e.g. ['groups','g_x','expenses']

  // --- Users / auth ---
  if (p.startsWith('/auth/check-username')) return { available: true, username: seg[seg.length - 1] };
  if (p === '/auth/register' && method === 'POST') {
    // A freshly registered (real) wallet starts with zeroed stats so demo
    // numbers (320 sent / 23 transfers) don't leak into a real account.
    db.user = { ...body, totalSent: 0, totalReceived: 0, streak: 0, transferCount: 0, createdAt: nowIso(), lastActivityDate: null };
    saveDB(db);
    return { user: currentUser(db) };
  }
  if (p.startsWith('/users/address')) {
    if (method === 'GET') {
      // Only treat the address as registered if it matches the stored user.
      // A fresh wallet (e.g. a real Privy login) returns null -> onboarding.
      const addr = decodeURIComponent(seg[2] || '');
      const u = currentUser(db);
      if (u.walletAddress !== addr) return null;
      // The demo wallet keeps its rich seed stats; a real wallet reads as zeroed.
      return addr === DEMO_ADDRESS ? u : { ...u, totalSent: 0, totalReceived: 0, streak: 0, transferCount: 0 };
    }
    // PATCH (updateUserProfile) or convert-to-business
    if (p.endsWith('/convert-to-business')) {
      db.user = { ...db.user, accountType: 'business', businessInfo: body?.businessInfo, displayName: body?.displayName || db.user.displayName };
    } else {
      db.user = { ...db.user, ...body };
    }
    saveDB(db);
    return { user: currentUser(db) };
  }
  if (p.startsWith('/users/')) {
    const uname = decodeURIComponent(seg[seg.length - 1]);
    return { username: uname, walletAddress: addrFor(uname), accountType: 'personal', displayName: uname.charAt(0).toUpperCase() + uname.slice(1), totalSent: 0, totalReceived: 0, streak: 0, transferCount: 0, createdAt: ago(60 * 24 * 10) };
  }

  // --- Rewards (rich for the demo wallet, zeroed for a real one) ---
  if (p.startsWith('/rewards/streak')) {
    return query.get('address') === DEMO_ADDRESS
      ? DEMO_STREAK
      : { streak: 0, transferCount: 0, lastActivityDate: null, currentMilestone: { name: 'Newcomer', emoji: '🌱', count: 0 }, nextMilestone: { name: 'Explorer', emoji: '🚀', count: 10 } };
  }

  // --- Transactions (scoped to the requesting address) ---
  if (p === '/transactions') {
    if (method === 'POST') {
      const tx = { _id: genId('tx'), status: 'confirmed', timestamp: nowIso(), ...body };
      db.transactions.unshift(tx); saveDB(db);
      return { transaction: tx };
    }
    const a = query.get('address');
    return { transactions: db.transactions.filter((t) => !a || t.senderAddress === a || t.receiverAddress === a) };
  }

  // --- Contacts (scoped to the owner) ---
  if (p === '/contacts') {
    if (method === 'POST') {
      const c = { _id: genId('c'), ownerAddress: body?.ownerAddress, username: body?.contactUsername, walletAddress: body?.contactAddress || addrFor(body?.contactUsername || 'user'), contactUsername: body?.contactUsername, contactAddress: body?.contactAddress, nickname: body?.nickname || body?.contactUsername };
      db.contacts.unshift(c); saveDB(db);
      return { contact: c };
    }
    const a = query.get('address');
    return { contacts: db.contacts.filter((c) => !a || c.ownerAddress === a) };
  }
  if (p.startsWith('/contacts/')) {
    if (method === 'DELETE') { db.contacts = db.contacts.filter((c) => c._id !== seg[1]); saveDB(db); return { success: true }; }
    return { success: true };
  }

  // --- Contact requests ---
  if (p.startsWith('/contact-requests/pending')) return { count: db.contactRequests.filter((r) => r.status === 'pending' && r.type === 'received').length };
  if (p === '/contact-requests') {
    if (method === 'POST') {
      const r = { _id: genId('cr'), senderAddress: body?.senderAddress, receiverUsername: body?.receiverUsername, message: body?.message, status: 'pending', type: 'sent', createdAt: nowIso() };
      db.contactRequests.unshift(r); saveDB(db);
      return { request: r };
    }
    return { requests: db.contactRequests };
  }
  if (p.startsWith('/contact-requests/')) {
    const id = seg[1];
    if (method === 'PATCH') {
      const r = db.contactRequests.find((x) => x._id === id);
      if (r) r.status = body?.action === 'accept' ? 'accepted' : 'declined';
      saveDB(db); return { success: true };
    }
    if (method === 'DELETE') { db.contactRequests = db.contactRequests.filter((x) => x._id !== id); saveDB(db); return { success: true }; }
    return { success: true };
  }

  // --- Payment requests ---
  if (p === '/requests') {
    if (method === 'POST') {
      const r = { _id: genId('pr'), requesterAddress: body?.requesterAddress, requesterUsername: currentUser(db).username, payerUsername: body?.payerUsername, amount: body?.amount, message: body?.message, status: 'pending', createdAt: nowIso() };
      db.paymentRequests.unshift(r); saveDB(db);
      return { request: r };
    }
    return { requests: db.paymentRequests };
  }
  if (p.startsWith('/requests/')) {
    const id = seg[1];
    const r = db.paymentRequests.find((x) => x._id === id);
    if (r && body?.status) r.status = body.status;
    saveDB(db); return { success: true, request: r };
  }

  // --- Group invitations ---
  if (p.startsWith('/groups/invitations')) return { invitations: [] };

  // --- Groups ---
  if (p === '/groups') {
    if (method === 'POST') {
      const u = currentUser(db);
      const group = {
        _id: genId('g'),
        name: body?.name || 'New Group',
        description: body?.description || '',
        icon: body?.icon || '👥',
        color: body?.color || '#7f13ec',
        creatorAddress: body?.creatorAddress || DEMO_ADDRESS,
        creatorUsername: u.username,
        members: [{ username: u.username || 'demo', walletAddress: DEMO_ADDRESS, balance: 0, joinedAt: nowIso() }],
        totalSpent: 0,
        currency: 'USDC',
        isSettled: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.groups.unshift(group); db.expenses[group._id] = []; saveDB(db);
      return { group };
    }
    return { groups: db.groups };
  }
  if (p.startsWith('/groups/')) {
    const id = seg[1];
    const group = db.groups.find((g) => g._id === id);
    if (!group) return { group: null, expenses: [] };

    // /groups/:id/members
    if (seg[2] === 'members') {
      if (method === 'POST') {
        const uname = body?.username;
        if (uname && !group.members.some((m: any) => m.username === uname)) {
          group.members.push(memberFromUsername(uname));
          group.updatedAt = nowIso();
        }
        saveDB(db); return { group };
      }
      if (method === 'DELETE') {
        group.members = group.members.filter((m: any) => m.walletAddress !== seg[3]);
        saveDB(db); return { group };
      }
    }

    // /groups/:id/expenses
    if (seg[2] === 'expenses') {
      if (method === 'POST') {
        const amount = Number(body?.amount) || 0;
        const splits = (body?.splits || []).map((s: any) => ({ ...s, paid: s.walletAddress === body?.paidByAddress }));
        const expense = {
          _id: genId('exp'),
          description: body?.description || 'Expense',
          amount,
          category: body?.category || 'other',
          paidByAddress: body?.paidByAddress,
          paidByUsername: usernameForAddress(db, body?.paidByAddress, group),
          splitType: body?.splitType || 'equal',
          splits,
          createdAt: nowIso(),
        };
        db.expenses[id] = [expense, ...(db.expenses[id] || [])];
        // Update balances: payer +amount, each member -their split.
        group.members.forEach((m: any) => {
          const sp = splits.find((s: any) => s.walletAddress === m.walletAddress);
          if (sp) m.balance = Number(((m.balance || 0) - sp.amount).toFixed(6));
          if (m.walletAddress === body?.paidByAddress) m.balance = Number(((m.balance || 0) + amount).toFixed(6));
        });
        group.totalSpent = Number(((group.totalSpent || 0) + amount).toFixed(6));
        group.isSettled = group.members.every((m: any) => Math.abs(m.balance || 0) < 0.0001);
        group.updatedAt = nowIso();
        saveDB(db);
        return { expense, group };
      }
      return { expenses: db.expenses[id] || [] };
    }

    // /groups/:id/settle
    if (seg[2] === 'settle' && method === 'POST') {
      const from = group.members.find((m: any) => m.walletAddress === body?.fromAddress);
      const to = group.members.find((m: any) => m.walletAddress === body?.toAddress);
      const amt = Number(body?.amount) || 0;
      if (from) from.balance = Number(((from.balance || 0) + amt).toFixed(6));
      if (to) to.balance = Number(((to.balance || 0) - amt).toFixed(6));
      group.isSettled = group.members.every((m: any) => Math.abs(m.balance || 0) < 0.0001);
      saveDB(db); return { success: true, group };
    }

    // DELETE /groups/:id
    if (method === 'DELETE') {
      db.groups = db.groups.filter((g) => g._id !== id);
      delete db.expenses[id]; saveDB(db);
      return { success: true };
    }

    // GET /groups/:id
    return { group, expenses: db.expenses[id] || [] };
  }

  // --- Invoices ---
  if (p === '/invoices') {
    if (method === 'POST') { const inv = { _id: genId('inv'), status: 'draft', ...body }; db.invoices.unshift(inv); saveDB(db); return { invoice: inv }; }
    return { invoices: db.invoices };
  }
  if (p.startsWith('/invoices/')) return { invoice: db.invoices.find((i) => i._id === seg[1]) || null };

  return { success: true };
}

let installed = false;
function installDemoApi() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.includes('/api/backend/')) {
      const after = url.split('/api/backend')[1];
      const path = after.split('?')[0];
      const query = new URLSearchParams(after.split('?')[1] || '');
      const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
      let parsedBody: any = undefined;
      try { if (init?.body && typeof init.body === 'string') parsedBody = JSON.parse(init.body); } catch { /* ignore */ }
      const data = handle(path, method, parsedBody, query);
      return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return orig(input, init);
  };
}

/** Demo-only control to flip the fake user between personal and business. */
function DemoBadge() {
  const [account, setAccount] = useState<'personal' | 'business'>(() => {
    try { return (loadDB().user.accountType as any) || 'personal'; } catch { return 'personal'; }
  });
  const switchTo = (acct: 'personal' | 'business') => {
    if (acct === account) return;
    const db = loadDB();
    if (acct === 'business') {
      db.user = { ...db.user, accountType: 'business', displayName: 'Brew & Bean Cafe', businessInfo: { ownerFirstName: 'Demo', ownerLastName: 'Owner', category: 'food', description: 'Specialty coffee bar' } };
    } else {
      db.user = { ...db.user, accountType: 'personal', displayName: 'Demo User', businessInfo: undefined };
    }
    saveDB(db);
    setAccount(acct);
    if (typeof window !== 'undefined') window.location.reload();
  };
  return (
    <div
      style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 9999 }}
      className="flex items-center gap-1.5 rounded-full bg-amber-500/95 text-black text-[10px] font-bold px-2 py-1 shadow"
    >
      <span className="uppercase tracking-wide">Demo</span>
      <button
        onClick={() => switchTo('personal')}
        className={`px-1.5 py-0.5 rounded-full transition-colors ${account === 'personal' ? 'bg-black text-amber-400' : 'hover:bg-black/10'}`}
      >
        Personal
      </button>
      <button
        onClick={() => switchTo('business')}
        className={`px-1.5 py-0.5 rounded-full transition-colors ${account === 'business' ? 'bg-black text-amber-400' : 'hover:bg-black/10'}`}
      >
        Business
      </button>
    </div>
  );
}

/**
 * Installs the seeded mock backend (intercepts /api/backend/*) WITHOUT faking
 * auth. Use this with real Privy auth when there's no Express/MongoDB backend,
 * so a real wallet can still use the full app.
 */
export function MockBackend({ children }: { children: ReactNode }) {
  useState(() => { installDemoApi(); return null; });
  return <>{children}</>;
}

export function DemoWalletProvider({ children }: { children: ReactNode }) {
  // Install the API interceptor synchronously before children render/fetch.
  useState(() => { installDemoApi(); return null; });

  const ops = useMemo(
    () => createMockChainOps({ address: DEMO_ADDRESS, publicKey: DEMO_ADDRESS, signRawHash: null }),
    [],
  );

  const value: WalletState = {
    ready: true,
    authenticated: true,
    address: DEMO_ADDRESS,
    publicKey: DEMO_ADDRESS,
    isConnected: true,
    hasWallet: true,
    creatingWallet: false,
    adapterMode: CHAIN_ADAPTER,
    ops,
    createStellarWallet: async () => {},
    connectExternalWallet: async () => {},
    walletSource: 'privy',
    signRawHash: null,
    setupAccount: async () => {},
    logout: async () => {},
    getExplorerUrl,
  };

  return (
    <WalletStateContext.Provider value={value}>
      {children}
      {/* Demo badge + Personal/Business switcher (design preview, not a real wallet). */}
      <DemoBadge />
    </WalletStateContext.Provider>
  );
}
