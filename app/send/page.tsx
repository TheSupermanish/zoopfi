'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SendRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', 'send');
    
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');
    
    if (to) params.set('to', to);
    if (amount) params.set('amount', amount);
    
    router.replace(`/transact?${params.toString()}`);
  }, [router, searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
      <div className="spinner" />
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
        <div className="spinner" />
      </div>
    }>
      <SendRedirect />
    </Suspense>
  );
}
