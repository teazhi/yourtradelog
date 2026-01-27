"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@/components/ui";
import { Trade } from "@/types/database";
import {
  formatCurrency,
  formatDate,
  formatRMultiple,
} from "@/lib/calculations/formatters";

interface TradeCardProps {
  trade: Trade;
  onDelete?: (tradeId: string) => void;
}

export function TradeCard({ trade, onDelete }: TradeCardProps) {
  const isWin = trade.net_pnl !== null && trade.net_pnl > 0;
  const isLoss = trade.net_pnl !== null && trade.net_pnl < 0;
  const isOpen = trade.status === "open";

  const getPnLColor = () => {
    if (trade.net_pnl === null) return "text-muted-foreground";
    if (trade.net_pnl > 0) return "text-green-600 dark:text-green-400";
    if (trade.net_pnl < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getStatusBadge = () => {
    switch (trade.status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
          >
            Open
          </Badge>
        );
      case "closed":
        if (isWin) {
          return <Badge variant="default">Win</Badge>;
        }
        if (isLoss) {
          return (
            <Badge className="bg-red-500 text-white border-transparent hover:bg-red-500/80">
              Loss
            </Badge>
          );
        }
        return <Badge variant="secondary">B/E</Badge>;
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                trade.side === "long"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              )}
            >
              {trade.side === "long" ? (
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <Link
                href={`/trades/${trade.id}`}
                className="font-semibold hover:underline"
              >
                {trade.symbol}
              </Link>
              <p className="text-xs text-muted-foreground capitalize">
                {trade.side} &middot; {trade.entry_contracts} contract
                {trade.entry_contracts !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
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
          </div>
        </div>

        {/* Price info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-medium">
              {formatCurrency(trade.entry_price).replace("$", "")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Exit</p>
            <p className="font-medium">
              {trade.exit_price
                ? formatCurrency(trade.exit_price).replace("$", "")
                : "-"}
            </p>
          </div>
        </div>

        {/* P&L and R-Multiple row */}
        <div className="flex items-center justify-between py-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">P&L</p>
            <p className={cn("text-lg font-semibold", getPnLColor())}>
              {trade.net_pnl !== null
                ? `${trade.net_pnl > 0 ? "+" : ""}${formatCurrency(trade.net_pnl)}`
                : "-"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">R-Multiple</p>
            <p className={cn("text-lg font-semibold", getPnLColor())}>
              {trade.r_multiple !== null
                ? formatRMultiple(trade.r_multiple)
                : "-"}
            </p>
          </div>
        </div>

        {/* Footer - Date and additional info */}
        <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(trade.entry_date, "medium")}</span>
          </div>
          {trade.setup_id && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{trade.setup_id}</span>
            </div>
          )}
        </div>

        {/* Session indicator */}
        {trade.session && (
          <div className="mt-2 pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              {trade.session.replace(/_/g, " ")}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TradeCardListProps {
  trades: Trade[];
  onDelete?: (tradeId: string) => void;
  isLoading?: boolean;
}

export function TradeCardList({
  trades,
  onDelete,
  isLoading = false,
}: TradeCardListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full animate-pulse bg-muted" />
                  <div className="space-y-1">
                    <div className="h-4 w-16 animate-pulse bg-muted rounded" />
                    <div className="h-3 w-24 animate-pulse bg-muted rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="h-3 w-12 animate-pulse bg-muted rounded" />
                    <div className="h-5 w-20 animate-pulse bg-muted rounded" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 w-12 animate-pulse bg-muted rounded" />
                    <div className="h-5 w-20 animate-pulse bg-muted rounded" />
                  </div>
                </div>
                <div className="h-10 w-full animate-pulse bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
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
    <div className="grid gap-4 sm:grid-cols-2">
      {trades.map((trade) => (
        <TradeCard key={trade.id} trade={trade} onDelete={onDelete} />
      ))}
    </div>
  );
}
