'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WalletProvider } from './lib/chain';
import { PRIVY_APP_ID, PRIVY_CONFIGURED, DEMO_MODE, MOCK_BACKEND } from './lib/chain/config';
import { DemoWalletProvider, MockBackend } from './lib/chain/demo';
import { ThemeProvider } from './context/ThemeContext';
import { QueryProvider } from './lib/query';
import { AuthRouter } from './components/AuthRouter';

function ConfigNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="card p-8 max-w-md text-center">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Zoopfi</h1>
        <p className="text-slate-500 dark:text-[#ad92c9] mb-4">
          Set <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-sm">NEXT_PUBLIC_PRIVY_APP_ID</code> in
          your <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-sm">.env</code> to enable login,
          or set <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-sm">NEXT_PUBLIC_DEMO_MODE=1</code> to explore the app.
        </p>
        <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">Get a Privy app ID at dashboard.privy.io, then restart the dev server.</p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  let inner: React.ReactNode;

  if (PRIVY_CONFIGURED) {
    // 1) Real auth when Privy is configured.
    inner = (
      <PrivyProvider
        appId={PRIVY_APP_ID as string}
        config={{
          // Social login methods.
          loginMethods: ['email', 'google', 'twitter', 'discord', 'github'],
        }}
      >
        {/* Provisions a Stellar (G...) embedded wallet and exposes useWallet(). */}
        <WalletProvider>
          <AuthRouter />
          {MOCK_BACKEND ? <MockBackend>{children}</MockBackend> : children}
        </WalletProvider>
      </PrivyProvider>
    );
  } else if (DEMO_MODE) {
    // 2) Demo mode: fake auth + stubbed backend, fully client-side.
    inner = (
      <DemoWalletProvider>
        <AuthRouter />
        {children}
      </DemoWalletProvider>
    );
  } else {
    // 3) Otherwise, prompt for configuration instead of crashing.
    inner = <ConfigNotice />;
  }

  return (
    <ThemeProvider>
      <QueryProvider>{inner}</QueryProvider>
    </ThemeProvider>
  );
}
