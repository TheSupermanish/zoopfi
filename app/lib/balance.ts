import { aptos } from './aptos';

// Fetch MOVE token balance for an address
export const fetchBalance = async (address: string): Promise<number> => {
  try {
    const resources = await aptos.getAccountResources({ accountAddress: address });
    
    // Find the CoinStore resource for AptosCoin (MOVE uses same structure)
    const coinStore = resources.find(
      (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );

    if (coinStore) {
      const balance = (coinStore.data as any).coin.value;
      // Convert from octas (8 decimals) to MOVE
      return Number(balance) / 100_000_000;
    }

    return 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

// Format balance for display
export const formatBalance = (balance: number): string => {
  if (balance === 0) return '0.00';
  if (balance < 0.01) return '< 0.01';
  if (balance < 1) return balance.toFixed(4);
  if (balance < 1000) return balance.toFixed(2);
  if (balance < 1000000) return `${(balance / 1000).toFixed(2)}K`;
  return `${(balance / 1000000).toFixed(2)}M`;
};

// Format USD value (placeholder - would need price feed)
export const formatUSD = (moveAmount: number, pricePerMove: number = 0.05): string => {
  const usdValue = moveAmount * pricePerMove;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(usdValue);
};

