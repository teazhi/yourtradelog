"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Account } from "@/types/database";

interface AccountContextType {
  accounts: Account[];
  selectedAccount: Account | null;
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  selectAccount: (accountId: string | null) => void;
  refreshAccounts: () => Promise<void>;
  showAllAccounts: boolean;
  setShowAllAccounts: (show: boolean) => void;
}

const AccountContext = React.createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = "tradelog-selected-account";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAllAccounts, setShowAllAccounts] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Fetch accounts on mount
  const fetchAccounts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAccounts([]);
        setSelectedAccountId(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const accountsList = (data as Account[]) || [];
      setAccounts(accountsList);

      // On initial load, try to restore saved selection or use default
      if (!initialized) {
        const savedAccountId = localStorage.getItem(STORAGE_KEY);

        if (savedAccountId === "all") {
          setShowAllAccounts(true);
          setSelectedAccountId(null);
        } else if (savedAccountId && accountsList.find(a => a.id === savedAccountId)) {
          setSelectedAccountId(savedAccountId);
          setShowAllAccounts(false);
        } else {
          // Fall back to default account or first account
          const defaultAccount = accountsList.find(a => a.is_default) || accountsList[0];
          if (defaultAccount) {
            setSelectedAccountId(defaultAccount.id);
            setShowAllAccounts(false);
          } else {
            // No accounts exist, show all (which is effectively nothing)
            setShowAllAccounts(true);
            setSelectedAccountId(null);
          }
        }
        setInitialized(true);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  }, [initialized]);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Save selection to localStorage
  React.useEffect(() => {
    if (!initialized) return;

    if (showAllAccounts) {
      localStorage.setItem(STORAGE_KEY, "all");
    } else if (selectedAccountId) {
      localStorage.setItem(STORAGE_KEY, selectedAccountId);
    }
  }, [selectedAccountId, showAllAccounts, initialized]);

  const selectAccount = React.useCallback((accountId: string | null) => {
    if (accountId === null) {
      setShowAllAccounts(true);
      setSelectedAccountId(null);
    } else {
      setShowAllAccounts(false);
      setSelectedAccountId(accountId);
    }
  }, []);

  const selectedAccount = React.useMemo(() => {
    if (showAllAccounts || !selectedAccountId) return null;
    return accounts.find(a => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId, showAllAccounts]);

  const value = React.useMemo(() => ({
    accounts,
    selectedAccount,
    selectedAccountId: showAllAccounts ? null : selectedAccountId,
    isLoading,
    error,
    selectAccount,
    refreshAccounts: fetchAccounts,
    showAllAccounts,
    setShowAllAccounts: (show: boolean) => {
      setShowAllAccounts(show);
      if (show) {
        setSelectedAccountId(null);
      }
    },
  }), [accounts, selectedAccount, selectedAccountId, isLoading, error, selectAccount, fetchAccounts, showAllAccounts]);

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = React.useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
