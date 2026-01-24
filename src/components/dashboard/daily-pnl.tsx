"use client";

import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

interface DailyPnLProps {
  data?: { date: string; pnl: number }[];
}

export function DailyPnL({ data = [] }: DailyPnLProps) {
  // Calculate today's stats
  const today = new Date().toISOString().split("T")[0];
  const todayData = data.find(d => d.date === today);
  const todayPnL = todayData?.pnl || 0;

  const isPositive = todayPnL > 0;
  const isNegative = todayPnL < 0;

  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Daily P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">No data</p>
              <p className="text-sm text-muted-foreground">
                Import or add trades to see your daily P&L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s P&L
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isPositive
                    ? "bg-green-500/10"
                    : isNegative
                    ? "bg-red-500/10"
                    : "bg-muted"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : isNegative ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p
                className={`text-2xl font-bold ${
                  isPositive
                    ? "text-green-500"
                    : isNegative
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(todayPnL)}
              </p>
            </div>
          </div>
          <CardDescription>Last {data.length} trading days</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={60}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number), "P&L"]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
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
      </CardContent>
    </Card>
  );
}
