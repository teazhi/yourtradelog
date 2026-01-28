"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Button, toast, Spinner } from "@/components/ui";
import { TradeForm } from "@/components/trades/trade-form";
import { createClient } from "@/lib/supabase/client";
import type { Trade, Account } from "@/types/database";
import { useAccount } from "@/components/providers/account-provider";

interface Setup {
  id: string;
  name: string;
  color: string | null;
}

export default function NewTradePage() {
  const router = useRouter();
  const { selectedAccount, accounts, isLoading: accountsLoading } = useAccount();
  const [setups, setSetups] = React.useState<Setup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);

  // Set initial account when accounts load
  React.useEffect(() => {
    if (!accountsLoading && accounts.length > 0 && !selectedAccountId) {
      // Use the globally selected account, or find default, or use first account
      const defaultAccount = selectedAccount || accounts.find(a => a.is_default) || accounts[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [accountsLoading, accounts, selectedAccount, selectedAccountId]);

  // Fetch user's setups for the form dropdown
  React.useEffect(() => {
    async function fetchSetups() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase
          .from("setups") as any)
          .select("id, name, color")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name");

        if (error) {
          // Silently handle - setups table may not exist or user has none
          // This is not critical - the form will just not show setup options
          setSetups([]);
        } else {
          setSetups(data || []);
        }
      } catch (err) {
        console.error("Exception fetching setups:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSetups();
  }, []);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to add a trade");
        return;
      }

      // Combine date and time for entry
      let entryDateTime = new Date(data.entry_date);
      if (data.entry_time) {
        const [hours, minutes] = data.entry_time.split(":");
        entryDateTime.setHours(parseInt(hours), parseInt(minutes));
      }

      // Combine date and time for exit (if provided)
      let exitDateTime = null;
      if (data.exit_date) {
        exitDateTime = new Date(data.exit_date);
        if (data.exit_time) {
          const [hours, minutes] = data.exit_time.split(":");
          exitDateTime.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      // Calculate P&L if we have entry and exit prices
      let grossPnl = null;
      let netPnl = null;
      let rMultiple = null;

      if (data.exit_price && data.entry_price && data.entry_contracts) {
        const priceDiff = data.side === "long"
          ? data.exit_price - data.entry_price
          : data.entry_price - data.exit_price;

        // For futures, use tick value. Default to $12.50 for ES
        const tickValue = 12.50;
        const tickSize = 0.25;
        const ticks = priceDiff / tickSize;
        grossPnl = ticks * tickValue * data.entry_contracts;

        const totalFees = (data.commission || 0) + (data.fees || 0);
        netPnl = grossPnl - totalFees;

        // Calculate R-multiple if stop loss is set
        if (data.stop_loss && data.entry_price) {
          const stopDistance = Math.abs(data.entry_price - data.stop_loss);
          const stopTicks = stopDistance / tickSize;
          const riskAmount = stopTicks * tickValue * data.entry_contracts;
          if (riskAmount > 0) {
            rMultiple = netPnl / riskAmount;
          }
        }
      }

      const tradeData = {
        user_id: user.id,
        account_id: selectedAccountId,
        symbol: data.symbol,
        side: data.side,
        entry_date: entryDateTime.toISOString(),
        entry_price: data.entry_price,
        entry_contracts: data.entry_contracts,
        exit_date: exitDateTime ? exitDateTime.toISOString() : null,
        exit_price: data.exit_price || null,
        exit_contracts: data.exit_contracts || null,
        stop_loss: data.stop_loss || null,
        take_profit: data.take_profit || null,
        gross_pnl: grossPnl,
        commission: data.commission || 0,
        fees: data.fees || 0,
        net_pnl: netPnl,
        r_multiple: rMultiple,
        setup_id: data.setup_id || null,
        session: data.session || null,
        emotions: data.emotions || [],
        entry_rating: data.entry_rating || null,
        exit_rating: data.exit_rating || null,
        management_rating: data.management_rating || null,
        notes: data.notes || null,
        status: data.status || "open",
        import_source: "manual",
      };

      const { error } = await (supabase
        .from("trades") as any)
        .insert(tradeData);

      if (error) {
        console.error("Error saving trade:", error);
        toast.error("Failed to save trade");
        return;
      }

      toast.success("Trade saved successfully!");
      router.push("/trades");
    } catch (err) {
      console.error("Exception saving trade:", err);
      toast.error("Failed to save trade");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/trades">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to trades</span>
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">New Trade</h1>
          <p className="text-muted-foreground">
            Enter the details of your trade
          </p>
        </div>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedAccountId || ""}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                    {account.is_default && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Trade Form */}
      <TradeForm
        setups={setups}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />
    </div>
  );
}
