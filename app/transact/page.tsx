'use client';

import { Suspense } from 'react';
import TransactPageContent from './TransactPageContent';

export default function TransactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    }>
      <TransactPageContent />
    </Suspense>
  );
}

