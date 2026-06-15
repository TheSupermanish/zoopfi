/**
 * Display formatting for balances/amounts. USDC is dollar-denominated, so
 * formatUSD is effectively 1:1 (kept as a function so a price feed can slot in
 * later for XLM or other assets).
 */

/** Format a numeric balance string/number for display. */
export const formatBalance = (balance: number | string): string => {
  const b = typeof balance === 'string' ? Number(balance) : balance;
  if (!b || Number.isNaN(b)) return '0.00';
  if (b < 0.01) return '< 0.01';
  if (b < 1) return b.toFixed(4);
  if (b < 1000) return b.toFixed(2);
  if (b < 1_000_000) return `${(b / 1000).toFixed(2)}K`;
  return `${(b / 1_000_000).toFixed(2)}M`;
};

/** USDC -> USD display (1:1). pricePerUnit lets non-dollar assets reuse this. */
export const formatUSD = (amount: number | string, pricePerUnit = 1): string => {
  const a = (typeof amount === 'string' ? Number(amount) : amount) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a * pricePerUnit);
};
