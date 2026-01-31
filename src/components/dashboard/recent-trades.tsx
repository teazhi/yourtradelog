"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/calculations/formatters";

interface Trade {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entryDate: string;
  exitDate: string;
  pnl: number;
  status: "win" | "loss" | "breakeven";
}

interface RecentTradesProps {
  trades?: Trade[];
}

export function RecentTrades({ trades = [] }: RecentTradesProps) {
  // Empty state
  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Your last closed trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No trades yet. Get started by importing your trades.
            </p>
            <Button asChild size="sm">
              <Link href="/import">Import Trades</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Recent Trades</CardTitle>
        <CardDescription>Your last {trades.length} closed trades</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Exit Date</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {trade.direction === "long" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className="capitalize">{trade.direction}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(trade.exitDate, "medium")}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      trade.pnl > 0
                        ? "text-green-500"
                        : trade.pnl < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </TableCell>
                  <TableCell>
                    {trade.status === "win" ? (
                      <Badge variant="default">Win</Badge>
                    ) : trade.status === "loss" ? (
                      <Badge className="bg-red-500 text-white border-transparent hover:bg-red-500/80">
                        Loss
                      </Badge>
                    ) : (
                      <Badge variant="secondary">B/E</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-2">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${trade.direction === "long" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  {trade.direction === "long" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{trade.symbol}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(trade.exitDate, "short")}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold text-sm ${
                    trade.pnl > 0
                      ? "text-green-500"
                      : trade.pnl < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {trade.pnl > 0 ? "+" : ""}
                  {formatCurrency(trade.pnl)}
                </p>
                {trade.status === "win" ? (
                  <Badge variant="default" className="text-xs">Win</Badge>
                ) : trade.status === "loss" ? (
                  <Badge className="bg-red-500 text-white border-transparent hover:bg-red-500/80 text-xs">
                    Loss
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">B/E</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
