"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { BarChart3 } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface PnLByDayData {
  day: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface PnLByDayProps {
  data?: PnLByDayData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PnLByDayData }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{label}</p>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={data.pnl >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.pnl >= 0 ? "+" : ""}{formatCurrency(data.pnl)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Win Rate:</span>
            <span>{formatPercentage(data.winRate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span>{data.trades}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function PnLByDay({ data }: PnLByDayProps) {
  // Empty state
  if (!data || data.length === 0 || data.every(d => d.trades === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L by Day of Week</CardTitle>
          <CardDescription>Performance breakdown by trading day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trade data yet. Add trades to see your daily performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataWithTrades = data.filter(d => d.trades > 0);
  const bestDay = dataWithTrades.length > 0
    ? dataWithTrades.reduce((prev, current) => (prev.pnl > current.pnl) ? prev : current)
    : null;
  const worstDay = dataWithTrades.length > 0
    ? dataWithTrades.reduce((prev, current) => (prev.pnl < current.pnl) ? prev : current)
    : null;
  const totalPnL = data.reduce((sum, d) => sum + d.pnl, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>P&L by Day of Week</CardTitle>
            <CardDescription>
              Performance breakdown by trading day
            </CardDescription>
          </div>
          {bestDay && worstDay && (
            <div className="text-right text-sm">
              <div className="text-green-500">Best: {bestDay.day}</div>
              <div className="text-red-500">Worst: {worstDay.day}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value) => {
                  if (value === 0) return "$0";
                  const abs = Math.abs(value);
                  if (abs >= 1000) {
                    return `$${value >= 0 ? "" : "-"}${(abs / 1000).toFixed(1)}k`;
                  }
                  return `$${value}`;
                }}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
          <span>Weekly Total: </span>
          <span className={`ml-2 font-medium ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
            {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
