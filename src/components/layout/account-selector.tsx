"use client";

import * as React from "react";
import { ChevronDown, Wallet, Check, Plus, Loader2 } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { useAccount } from "@/components/providers/account-provider";
import Link from "next/link";

export function AccountSelector() {
  const {
    accounts,
    selectedAccount,
    isLoading,
    selectAccount,
    showAllAccounts,
  } = useAccount();

  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <Button variant="ghost" className="h-9 gap-2 px-3" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  const displayName = showAllAccounts
    ? "All Accounts"
    : selectedAccount?.name || "Select Account";

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="h-9 gap-2 px-3 min-w-[140px] sm:min-w-[180px] justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 truncate">
          <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{displayName}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover shadow-lg z-50">
          <div className="p-2">
            {/* All Accounts Option */}
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent",
                showAllAccounts && "bg-accent"
              )}
              onClick={() => {
                selectAccount(null);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span>All Accounts</span>
              </div>
              {showAllAccounts && <Check className="h-4 w-4 text-primary" />}
            </button>

            {accounts.length > 0 && (
              <>
                <div className="my-2 border-t" />
                <div className="px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Your Accounts
                  </span>
                </div>
              </>
            )}

            {/* Individual Accounts */}
            {accounts.map((account) => (
              <button
                key={account.id}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent",
                  selectedAccount?.id === account.id && !showAllAccounts && "bg-accent"
                )}
                onClick={() => {
                  selectAccount(account.id);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{account.name}</span>
                    {account.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {account.broker || "No broker"} • ${account.current_balance?.toLocaleString() || "0"}
                  </span>
                </div>
                {selectedAccount?.id === account.id && !showAllAccounts && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}

            {/* Add Account Link */}
            <div className="mt-2 border-t pt-2">
              <Link
                href="/settings?tab=accounts"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <Plus className="h-4 w-4" />
                <span>Manage Accounts</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
