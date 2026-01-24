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
  cn,
} from "@/components/ui";
import { Trade } from "@/types/database";
import {
  formatCurrency,
  formatDate,
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
  isLoading?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TradeTable({
  trades,
  onSort,
  sortConfig,
  onDelete,
  isLoading = false,
  pageSize = 25,
  currentPage = 1,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: TradeTableProps) {
  const [localSortConfig, setLocalSortConfig] = React.useState<SortConfig>({
    field: "entry_date",
    direction: "desc",
  });

  const activeSortConfig = sortConfig || localSortConfig;
  const effectiveTotalCount = totalCount ?? trades.length;
  const totalPages = Math.ceil(effectiveTotalCount / pageSize);

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
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>R-Multiple</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="entry_date">Date</SortableHeader>
              <SortableHeader field="symbol">Symbol</SortableHeader>
              <SortableHeader field="side">Side</SortableHeader>
              <SortableHeader field="entry_price">Entry</SortableHeader>
              <SortableHeader field="exit_price">Exit</SortableHeader>
              <SortableHeader field="net_pnl" className="text-right">
                P&L
              </SortableHeader>
              <SortableHeader field="r_multiple" className="text-right">
                R-Multiple
              </SortableHeader>
              <TableHead>Setup</TableHead>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} className="group">
                <TableCell>
                  <Link
                    href={`/trades/${trade.id}`}
                    className="hover:underline"
                  >
                    {formatDate(trade.entry_date, "medium")}
                  </Link>
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
