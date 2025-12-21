'use client';

import { Suspense } from 'react';
import SendPageContent from './SendPageContent';

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="spinner" />
      </div>
    }>
      <SendPageContent />
    </Suspense>
  );
}
