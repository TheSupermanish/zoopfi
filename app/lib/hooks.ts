'use client';

/**
 * Global data hooks backed by TanStack Query. These share one cache app-wide,
 * so navigating between pages reuses data instantly (no per-page refetch /
 * spinner flicker) and revalidates in the background. Balances/transactions
 * poll on an interval so they stay near real-time, and `useChainInvalidate`
 * forces an immediate refresh after a payment/shield/transfer.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './chain';
import type { AssetCode } from './chain';
import { getUserByAddress, getTransactions, getStreakInfo, type UserData } from './api';

/** Current user/account, cached app-wide (drives business vs personal shell). */
export function useUser() {
  const { address } = useWallet();
  return useQuery<UserData | null>({
    queryKey: ['user', address],
    queryFn: () => getUserByAddress(address),
    enabled: !!address,
    staleTime: 60_000,
  });
}

/** Public balance for an asset, polled so it stays near real-time. */
export function useBalance(asset: AssetCode = 'USDC') {
  const { address, ops } = useWallet();
  return useQuery({
    queryKey: ['balance', address, asset],
    queryFn: async () => Number(await ops.getBalance(address, asset)),
    enabled: !!address,
    staleTime: 4_000,
    refetchInterval: 8_000,
  });
}

/** Recent transactions, polled. */
export function useTransactions(limit = 20) {
  const { address } = useWallet();
  return useQuery({
    queryKey: ['transactions', address, limit],
    queryFn: async () => (await getTransactions(address, limit, 0))?.transactions ?? [],
    enabled: !!address,
    refetchInterval: 10_000,
  });
}

/** Rewards / streak info. */
export function useStreak() {
  const { address } = useWallet();
  return useQuery({
    queryKey: ['streak', address],
    queryFn: () => getStreakInfo(address),
    enabled: !!address,
  });
}

/** Returns a function that refreshes balance/tx/streak immediately (call after a tx). */
export function useChainInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['balance'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['streak'] });
  };
}
