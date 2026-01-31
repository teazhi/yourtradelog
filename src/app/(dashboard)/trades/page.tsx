"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, LayoutGrid, List, RefreshCw, Upload } from "lucide-react";
import { Button, ToggleGroup, ToggleGroupItem, useIsMobile, Spinner, toast } from "@/components/ui";
import { TradeFilters, TradeFiltersState } from "@/components/trades/trade-filters";
import { TradeTable } from "@/components/trades/trade-table";
import { TradeCardList } from "@/components/trades/trade-card";
import { Trade } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "@/components/providers/account-provider";

type ViewMode = "table" | "cards";

export default function TradesPage() {
  const isMobile = useIsMobile();
  const { selectedAccountId, accounts, showAllAccounts } = useAccount();
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    isMobile ? "cards" : "table"
  );
  const [filters, setFilters] = React.useState<TradeFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    symbol: "",
    side: "",
    setup: "",
    status: "",
    search: "",
    accountId: "",
  });

  // Sync account filter with global account selector
  React.useEffect(() => {
    if (showAllAccounts) {
      setFilters(prev => ({ ...prev, accountId: "" }));
    } else if (selectedAccountId) {
      setFilters(prev => ({ ...prev, accountId: selectedAccountId }));
    }
  }, [selectedAccountId, showAllAccounts]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // Trades state
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch trades from Supabase
  const fetchTrades = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in - show empty state
        setTrades([]);
        setIsLoading(false);
        return;
      }

      // Fetch trades for the current user, ordered by entry date descending
      const { data, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      if (fetchError) {
        console.error("Error fetching trades:", fetchError);
        setError("Failed to load trades. Please try again.");
        setTrades([]);
      } else {
        setTrades(data || []);
      }
    } catch (err) {
      console.error("Exception fetching trades:", err);
      setError("An unexpected error occurred.");
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch trades on mount
  React.useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Filter trades based on current filters
  const filteredTrades = React.useMemo(() => {
    return trades.filter((trade) => {
      // Account filter
      if (filters.accountId && trade.account_id !== filters.accountId) {
        return false;
      }

      // Date filter
      if (filters.dateFrom) {
        const entryDate = new Date(trade.entry_date);
        if (entryDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const entryDate = new Date(trade.entry_date);
        if (entryDate > filters.dateTo) return false;
      }

      // Symbol filter
      if (filters.symbol && trade.symbol !== filters.symbol) {
        return false;
      }

      // Side filter
      if (filters.side && trade.side !== filters.side) {
        return false;
      }

      // Setup filter
      if (filters.setup && trade.setup_id !== filters.setup) {
        return false;
      }

      // Status filter
      if (filters.status && trade.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSymbol = trade.symbol.toLowerCase().includes(searchLower);
        const matchesNotes = trade.notes?.toLowerCase().includes(searchLower);
        if (!matchesSymbol && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [trades, filters]);

  // Paginate trades
  const paginatedTrades = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  const handleDelete = async (tradeId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeId);

      if (error) {
        console.error("Error deleting trade:", error);
        toast("Failed to delete trade");
      } else {
        // Remove from local state
        setTrades(prev => prev.filter(t => t.id !== tradeId));
        toast("Trade deleted successfully");
      }
    } catch (err) {
      console.error("Exception deleting trade:", err);
      toast("An error occurred while deleting");
    }
  };

  // Auto-switch to cards on mobile
  React.useEffect(() => {
    if (isMobile && viewMode === "table") {
      setViewMode("cards");
    }
  }, [isMobile, viewMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading trades...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchTrades} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trades</h1>
            <p className="text-muted-foreground">
              Manage and analyze your trade history
            </p>
          </div>
          <Button asChild>
            <Link href="/import">
              <Upload className="mr-2 h-4 w-4" />
              Import Trades
            </Link>
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <div className="text-center space-y-4">
            <div className="text-4xl">📊</div>
            <div>
              <h3 className="font-semibold text-lg">No trades yet</h3>
              <p className="text-muted-foreground">
                Get started by importing your trades from a CSV file.
              </p>
            </div>
            <Button asChild>
              <Link href="/import">
                <Upload className="mr-2 h-4 w-4" />
                Import Trades
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trades</h1>
          <p className="text-muted-foreground">
            Manage and analyze your trade history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchTrades} className="h-9 w-9 sm:w-auto sm:px-3">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="icon" asChild className="h-9 w-9 sm:w-auto sm:px-3">
            <Link href="/import">
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TradeFilters filters={filters} onFiltersChange={setFilters} accounts={accounts} />

      {/* View toggle (desktop only) */}
      {!isMobile && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""}{" "}
            found
          </p>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Trade list */}
      {viewMode === "table" ? (
        <TradeTable
          trades={paginatedTrades}
          onDelete={handleDelete}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={filteredTrades.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          accounts={accounts}
          onBulkAccountAssign={async (tradeIds, accountId) => {
            const supabase = createClient();
            const { error } = await (supabase
              .from("trades") as any)
              .update({ account_id: accountId, updated_at: new Date().toISOString() })
              .in("id", tradeIds);

            if (error) {
              throw error;
            }
            // Update local state
            setTrades(prev => prev.map(t =>
              tradeIds.includes(t.id) ? { ...t, account_id: accountId } : t
            ));
          }}
        />
      ) : (
        <TradeCardList trades={paginatedTrades} onDelete={handleDelete} />
      )}
    </div>
  );
}
