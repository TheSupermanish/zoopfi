/**
 * Central chain configuration for Zoopfi on Stellar.
 *
 * Everything chain-specific (network, RPC/Horizon URLs, asset, decimals,
 * explorer) lives here so the rest of the app never hardcodes it.
 */

export type ChainNetwork = 'testnet' | 'mainnet';

// Which chain-data adapter the app uses for balances/payments/privacy.
// Auth always runs through Privy regardless of this flag; this only switches
// whether on-chain reads/writes are real (stellar) or simulated (mock).
//   - 'mock'    : canned balances, fake tx hashes, instant success. Great for
//                 demoing the full UX without funding/trustlines.
//   - 'stellar' : real Stellar testnet via @stellar/stellar-sdk.
export type ChainAdapterMode = 'mock' | 'stellar';

// Strip surrounding quotes so a quoted .env value (NEXT_PUBLIC_X="stellar")
// can't silently miss an exact match. IMPORTANT: each process.env.NEXT_PUBLIC_*
// must be accessed as a STATIC literal — Next only inlines those into the client
// bundle. A dynamic process.env[key] is undefined in the browser.
const stripQuotes = (v?: string): string | undefined =>
  v ? v.replace(/^['"]|['"]$/g, '') : undefined;

export const CHAIN_ADAPTER: ChainAdapterMode =
  (stripQuotes(process.env.NEXT_PUBLIC_CHAIN_ADAPTER) as ChainAdapterMode) || 'mock';

export const CURRENT_NETWORK: ChainNetwork =
  (stripQuotes(process.env.NEXT_PUBLIC_STELLAR_NETWORK) as ChainNetwork) || 'testnet';

// Privy configuration / demo mode.
export const PRIVY_APP_ID = stripQuotes(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
export const PRIVY_CONFIGURED = !!PRIVY_APP_ID && PRIVY_APP_ID !== 'YOUR_PRIVY_APP_ID';
// Demo mode is a DESIGN-PREVIEW ONLY bypass: it fakes an authenticated wallet
// and stubs the backend so the logged-in screens can be viewed with no Privy
// app ID / backend / MongoDB. It does NOT exercise the real Privy -> Stellar
// wallet connect. It is OPT-IN ONLY (never auto-on) so the mock chain adapter
// can run with REAL Privy auth (real wallet connect + mocked balances).
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

// Is a real Express/MongoDB backend configured?
const BACKEND_CONFIGURED =
  !!process.env.NEXT_PUBLIC_API_URL && !/YOUR_BACKEND/i.test(process.env.NEXT_PUBLIC_API_URL || '');

// Serve the backend (user/contacts/groups/etc.) from the in-app seeded store
// when there's no real backend, or explicitly via NEXT_PUBLIC_MOCK_BACKEND=1,
// or in demo mode. This lets you connect a REAL Privy wallet and use the whole
// app without running the Express/MongoDB backend. Auth + chain stay real.
export const MOCK_BACKEND =
  DEMO_MODE || process.env.NEXT_PUBLIC_MOCK_BACKEND === '1' || !BACKEND_CONFIGURED;

interface NetworkConfig {
  name: string;
  horizonUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
  friendbotUrl: string | null;
  explorerBase: string;
  // Native Circle USDC issuer for this network.
  usdcIssuer: string;
}

export const STELLAR_CONFIGS: Record<ChainNetwork, NetworkConfig> = {
  testnet: {
    name: 'Stellar Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    friendbotUrl: 'https://friendbot.stellar.org',
    explorerBase: 'https://stellar.expert/explorer/testnet',
    // Circle testnet USDC issuer. Verify via stellar.expert if it ever changes.
    usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  mainnet: {
    name: 'Stellar Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    // SDF does not host a public mainnet RPC; set a provider URL in env.
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_MAINNET_RPC_URL || 'https://mainnet.sorobanrpc.com',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    friendbotUrl: null,
    explorerBase: 'https://stellar.expert/explorer/public',
    // Circle mainnet USDC issuer.
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
};

export const NETWORK = STELLAR_CONFIGS[CURRENT_NETWORK];

// The asset Zoopfi transacts. USDC has 7 decimals on Stellar.
export const USDC = {
  code: 'USDC',
  issuer: NETWORK.usdcIssuer,
  decimals: 7,
  symbol: 'USDC',
} as const;

// XLM is native, used for fees/reserves only.
export const XLM = {
  code: 'XLM',
  issuer: null,
  decimals: 7,
  symbol: 'XLM',
} as const;

export type AssetCode = 'USDC' | 'XLM';

export const PRIMARY_ASSET: AssetCode = 'USDC';

/** Explorer URL for a transaction hash. */
export const getExplorerUrl = (txHash: string): string => {
  const clean = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  return `${NETWORK.explorerBase}/tx/${clean}`;
};

/** Explorer URL for an account/contract address. */
export const getAddressExplorerUrl = (address: string): string => {
  const kind = address.startsWith('C') ? 'contract' : 'account';
  return `${NETWORK.explorerBase}/${kind}/${address}`;
};

// Deployed contract IDs (filled in as we deploy to testnet). Empty => the
// feature falls back to mock behavior.
// Defaults are our public Stellar testnet deployments, so the app works on a
// fresh clone / Vercel deploy with no contract env vars to set. Env vars still
// override (e.g. to point at a different deployment).
const DEFAULT_TESTNET = {
  yieldVault: 'CBD637UVMIYLTPCVWEOLTV26OCL77NVPZOLDYUEHXTBC7RDEJKN7JOBE',
  privacyPool: 'CAO6RPMITSCQTUOFUMFCNELXLNURXMQMRBDZLSIKZX36VH7MBA4LD3UA',
  verifier: 'CCIRAIRRTZN4QMUE7XVPLBO2II7UQPCPK7GGVSMFJW5HO44LL37SQDCN',
  aspMembership: 'CANLVYWPTVIBPG2L2PS4GT6BXRXDAWGGZ7PL62WNDXSLWRNGDJYUILHG',
  aspNonMembership: 'CB3ECD5HYWQDCB34ZYQWLN3PCVMYUBE3WLLH7IVHG5YJSSN7B3IU4IYE',
  token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
} as const;
// Only apply the baked testnet defaults on testnet (never silently on mainnet).
const T = CURRENT_NETWORK === 'testnet';

export const CONTRACTS = {
  counter: process.env.NEXT_PUBLIC_COUNTER_CONTRACT_ID || '',
  // Zoopfi balance vault (deposit / transfer / withdraw + events). Deployed to testnet.
  vault: process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID || '',
  // Yield vault (ERC-4626-style shares + time-accruing index). Deployed to testnet.
  yieldVault: process.env.NEXT_PUBLIC_YIELD_VAULT_CONTRACT_ID || (T ? DEFAULT_TESTNET.yieldVault : ''),
  privacyPool: process.env.NEXT_PUBLIC_PRIVACY_POOL_CONTRACT_ID || (T ? DEFAULT_TESTNET.privacyPool : ''),
} as const;

// Compliant shielded-payments stack (Groth16 over BN254, Poseidon2), deployed to
// Stellar testnet. Forked from NethermindEth/stellar-private-payments; the proof
// is verified on-chain by the Groth16 verifier contract.
export const PRIVACY = {
  pool: process.env.NEXT_PUBLIC_PRIVACY_POOL_CONTRACT_ID || (T ? DEFAULT_TESTNET.privacyPool : ''),
  verifier: process.env.NEXT_PUBLIC_PRIVACY_VERIFIER_CONTRACT_ID || (T ? DEFAULT_TESTNET.verifier : ''),
  aspMembership: process.env.NEXT_PUBLIC_ASP_MEMBERSHIP_CONTRACT_ID || (T ? DEFAULT_TESTNET.aspMembership : ''),
  aspNonMembership: process.env.NEXT_PUBLIC_ASP_NON_MEMBERSHIP_CONTRACT_ID || (T ? DEFAULT_TESTNET.aspNonMembership : ''),
  token: process.env.NEXT_PUBLIC_PRIVACY_TOKEN_CONTRACT_ID || (T ? DEFAULT_TESTNET.token : ''),
} as const;

/** True when the real on-chain shielded pool is configured (vs the mock). */
export const PRIVACY_LIVE = !!(PRIVACY.pool && PRIVACY.verifier);
