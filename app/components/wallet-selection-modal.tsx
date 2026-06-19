"use client";

import { useState, useEffect } from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { useWallet } from "@/app/lib/chain";

interface WalletSelectionModalProps {
  children: React.ReactNode;
}

/**
 * Login entry point. Privy social login (email/google/twitter/discord/github)
 * authenticates the user; the WalletProvider then auto-provisions a Stellar
 * (G...) embedded wallet. External wallets (Freighter/xBull via Stellar Wallets
 * Kit) are a planned secondary path.
 */
export function WalletSelectionModal({ children }: WalletSelectionModalProps) {
  const [open, setOpen] = useState(false);
  const { ready, authenticated } = usePrivy();
  const { address, creatingWallet, connectExternalWallet } = useWallet();
  const [connectingExternal, setConnectingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  const { login } = useLogin({
    // Don't close on login completion — the embedded Stellar wallet is still
    // provisioning. Closing here flashed a logged-out UI. The effect below
    // closes the modal once `address` is ready, then AuthRouter routes a new
    // user to onboarding.
    onComplete: () => {},
    onError: (error) => {
      console.error("Login failed:", error);
    },
  });

  // Close once authenticated AND the wallet is provisioned (instant for a
  // returning user; after provisioning for a fresh signup).
  useEffect(() => {
    if (open && authenticated && address) setOpen(false);
  }, [open, authenticated, address]);

  const onConnectExternal = async () => {
    setExternalError(null);
    setConnectingExternal(true);
    try {
      await connectExternalWallet();
      setOpen(false);
    } catch (e) {
      const msg = (e as Error)?.message || "Failed to connect wallet";
      if (!/cancel|reject|declin|closed/i.test(msg)) setExternalError(msg);
    } finally {
      setConnectingExternal(false);
    }
  };

  const busy = !ready || (authenticated && !address) || creatingWallet;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Zoopfi</DialogTitle>
          <DialogDescription>
            Sign in to get your private Stellar wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Continue with social login</h3>
            <p className="text-sm text-muted-foreground">
              Secure login with an automatically created self-custodial Stellar wallet
            </p>
          </div>

          <Button
            variant="default"
            className="w-full justify-center h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium"
            onClick={() => login()}
            disabled={busy || authenticated}
          >
            {busy ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Setting up your wallet...</span>
              </div>
            ) : authenticated ? (
              <span>✓ Connected</span>
            ) : (
              <span>Continue</span>
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* External Stellar wallet via StellarWalletsKit */}
          <Button
            variant="outline"
            className="w-full justify-center h-12 font-medium"
            onClick={onConnectExternal}
            disabled={connectingExternal || !!address}
          >
            {connectingExternal ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                <span>Opening wallet…</span>
              </div>
            ) : (
              <span>Connect a Stellar wallet</span>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Freighter · xBull · Albedo · Lobstr · Rabet
          </p>

          {externalError && (
            <p className="text-xs text-center text-red-500">{externalError}</p>
          )}

          {authenticated && address && (
            <div className="text-sm text-center bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="font-medium">Stellar Wallet Ready</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
