"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  Wallet,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  cn,
  toast,
} from "@/components/ui";
import { Account } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatRMultiple,
} from "@/lib/calculations/formatters";

type SortField =
  | "entry_date"
  | "symbol"
  | "side"
  | "entry_price"
  | "exit_price"
  | "net_pnl"
  | "r_multiple"
  | "status";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface TradeTableProps {
  trades: Trade[];
  onSort?: (field: SortField, direction: SortDirection) => void;
  sortConfig?: SortConfig;
  onDelete?: (tradeId: string) => void;
  onShare?: (tradeId: string) => void;
  onUnshare?: (tradeId: string) => void;
  isLoading?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  accounts?: Account[];
  onBulkAccountAssign?: (tradeIds: string[], accountId: string) => Promise<void>;
}

export function TradeTable({
  trades,
  onSort,
  sortConfig,
  onDelete,
  onShare,
  onUnshare,
  isLoading = false,
  pageSize = 25,
  currentPage = 1,
  totalCount,
  onPageChange,
  onPageSizeChange,
  accounts = [],
  onBulkAccountAssign,
}: TradeTableProps) {
  const [localSortConfig, setLocalSortConfig] = React.useState<SortConfig>({
    field: "entry_date",
    direction: "desc",
  });
  const [selectedTrades, setSelectedTrades] = React.useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = React.useState(false);

  const activeSortConfig = sortConfig || localSortConfig;
  const effectiveTotalCount = totalCount ?? trades.length;
  const totalPages = Math.ceil(effectiveTotalCount / pageSize);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedTrades.size === trades.length) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(trades.map((t) => t.id)));
    }
  };

  const toggleSelectTrade = (tradeId: string) => {
    const newSelection = new Set(selectedTrades);
    if (newSelection.has(tradeId)) {
      newSelection.delete(tradeId);
    } else {
      newSelection.add(tradeId);
    }
    setSelectedTrades(newSelection);
  };

  const clearSelection = () => {
    setSelectedTrades(new Set());
  };

  const handleBulkAccountAssign = async (accountId: string) => {
    if (selectedTrades.size === 0) return;

    setIsAssigning(true);
    try {
      if (onBulkAccountAssign) {
        await onBulkAccountAssign(Array.from(selectedTrades), accountId);
      } else {
        // Default implementation
        const supabase = createClient();
        const { error } = await (supabase
          .from("trades") as any)
          .update({ account_id: accountId, updated_at: new Date().toISOString() })
          .in("id", Array.from(selectedTrades));

        if (error) {
          throw error;
        }
      }
      toast.success(`Assigned ${selectedTrades.size} trade${selectedTrades.size !== 1 ? "s" : ""} to account`);
      clearSelection();
    } catch (err) {
      console.error("Error assigning trades to account:", err);
      toast.error("Failed to assign trades to account");
    } finally {
      setIsAssigning(false);
    }
  };

  const isAllSelected = trades.length > 0 && selectedTrades.size === trades.length;
  const isSomeSelected = selectedTrades.size > 0 && selectedTrades.size < trades.length;

  // Helper to get account name for a trade
  const getAccountName = (accountId: string | null | undefined) => {
    if (!accountId) return null;
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : null;
  };

  const handleSort = (field: SortField) => {
    const newDirection: SortDirection =
      activeSortConfig.field === field && activeSortConfig.direction === "desc"
        ? "asc"
        : "desc";

    if (onSort) {
      onSort(field, newDirection);
    } else {
      setLocalSortConfig({ field, direction: newDirection });
    }
  };

  const getSortIcon = (field: SortField) => {
    if (activeSortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return activeSortConfig.direction === "desc" ? (
      <ArrowDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUp className="ml-2 h-4 w-4" />
    );
  };

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => handleSort(field)}
      >
        {children}
        {getSortIcon(field)}
      </Button>
    </TableHead>
  );

  const getPnLColor = (pnl: number | null) => {
    if (pnl === null) return "text-muted-foreground";
    if (pnl > 0) return "text-green-600 dark:text-green-400";
    if (pnl < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getStatusBadge = (status: Trade["status"]) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
            Open
          </Badge>
        );
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "cancelled":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Gross P&L</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Net P&L</TableHead>
                <TableHead>R-Multiple</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 15 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No trades found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or add a new trade
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedTrades.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedTrades.size} trade{selectedTrades.size !== 1 ? "s" : ""} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <Select
                  disabled={isAssigning}
                  onValueChange={handleBulkAccountAssign}
                >
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Assign to account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.broker ? `(${account.broker})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all trades"
                />
              </TableHead>
              <SortableHeader field="entry_date">Date</SortableHeader>
              <TableHead>Time</TableHead>
              <SortableHeader field="symbol">Symbol</SortableHeader>
              <SortableHeader field="side">Side</SortableHeader>
              <SortableHeader field="entry_price">Entry</SortableHeader>
              <SortableHeader field="exit_price">Exit</SortableHeader>
              <TableHead className="text-right">Gross P&L</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <SortableHeader field="net_pnl" className="text-right">
                Net P&L
              </SortableHeader>
              <SortableHeader field="r_multiple" className="text-right">
                R-Multiple
              </SortableHeader>
              <TableHead>Setup</TableHead>
              <TableHead>Account</TableHead>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedTrades.has(trade.id)}
                    onCheckedChange={() => toggleSelectTrade(trade.id)}
                    aria-label={`Select trade ${trade.symbol}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/trades/${trade.id}`}
                    className="hover:underline"
                  >
                    {formatDate(trade.entry_date, "medium")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(trade.entry_date, false)}
                </TableCell>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {trade.side === "long" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className="capitalize">{trade.side}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {formatCurrency(trade.entry_price).replace("$", "")}
                </TableCell>
                <TableCell>
                  {trade.exit_price
                    ? formatCurrency(trade.exit_price).replace("$", "")
                    : "-"}
                </TableCell>
                <TableCell className={cn("text-right", getPnLColor(trade.gross_pnl))}>
                  {trade.gross_pnl !== null
                    ? `${trade.gross_pnl > 0 ? "+" : ""}${formatCurrency(trade.gross_pnl)}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {(trade.commission || 0) + (trade.fees || 0) > 0
                    ? `-${formatCurrency((trade.commission || 0) + (trade.fees || 0))}`
                    : "-"}
                </TableCell>
                <TableCell className={cn("text-right font-medium", getPnLColor(trade.net_pnl))}>
                  {trade.net_pnl !== null
                    ? `${trade.net_pnl > 0 ? "+" : ""}${formatCurrency(trade.net_pnl)}`
                    : "-"}
                </TableCell>
                <TableCell className={cn("text-right", getPnLColor(trade.r_multiple))}>
                  {trade.r_multiple !== null
                    ? formatRMultiple(trade.r_multiple)
                    : "-"}
                </TableCell>
                <TableCell>
                  {trade.setup_id ? (
                    <Badge variant="outline">{trade.setup_id}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getAccountName(trade.account_id) ? (
                    <span className="text-sm">{getAccountName(trade.account_id)}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(trade.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/trades/${trade.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/trades/${trade.id}?edit=true`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {trade.status === "closed" && (onShare || onUnshare) && (
                        <>
                          <DropdownMenuSeparator />
                          {(trade as any).shared_to_feed ? (
                            <DropdownMenuItem onClick={() => onUnshare?.(trade.id)}>
                              <Check className="mr-2 h-4 w-4 text-green-500" />
                              Shared to Feed
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onShare?.(trade.id)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share to Feed
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete?.(trade.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
