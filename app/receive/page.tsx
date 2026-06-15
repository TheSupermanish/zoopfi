'use client';

import { Suspense } from 'react';
import ReceivePageContent from './ReceivePageContent';

export default function ReceivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="spinner" />
      </div>
    }>
      <ReceivePageContent />
    </Suspense>
  );
}
