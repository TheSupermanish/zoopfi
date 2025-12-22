'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ReceiveRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', 'receive');
    
    const tab = searchParams.get('tab');
    if (tab) params.set('tab', tab);
    
    router.replace(`/transact?${params.toString()}`);
  }, [router, searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
      <div className="spinner" />
    </div>
  );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    }>
      <ReceiveRedirect />
    </Suspense>
  );
}
