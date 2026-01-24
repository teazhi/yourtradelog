"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { TrendingDown } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface DrawdownDataPoint {
  date: string;
  equity: number;
  peak: number;
  drawdown: number;
  drawdownPercent: number;
}

interface DrawdownChartProps {
  data?: DrawdownDataPoint[];
  maxDrawdownLimit?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: DrawdownDataPoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Equity: </span>
            <span className="font-medium">{formatCurrency(data.equity)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Peak: </span>
            <span className="font-medium">{formatCurrency(data.peak)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Drawdown: </span>
            <span className="font-medium text-red-500">
              -{formatCurrency(data.drawdown)} ({data.drawdownPercent.toFixed(2)}%)
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function DrawdownChart({
  data = [],
  maxDrawdownLimit = 10,
}: DrawdownChartProps) {
  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>
            Track your equity drawdown over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No drawdown data yet. Add trades to see drawdown analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentDrawdown = data[data.length - 1]?.drawdownPercent ?? 0;
  const maxDrawdown = Math.max(...data.map((d) => d.drawdownPercent));
  const avgDrawdown =
    data.reduce((sum, d) => sum + d.drawdownPercent, 0) / data.length;

  // Calculate recovery info
  const peakEquity = data[data.length - 1]?.peak ?? 0;
  const currentEquity = data[data.length - 1]?.equity ?? 0;
  const recoveryNeeded = peakEquity - currentEquity;
  const recoveryPercent =
    currentEquity > 0 ? (recoveryNeeded / currentEquity) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown Analysis</CardTitle>
        <CardDescription>
          Track your equity drawdown over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current Drawdown</p>
            <p className="text-lg font-bold text-red-500">
              -{currentDrawdown.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
            <p className="text-lg font-bold text-red-500">
              -{maxDrawdown.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Avg Drawdown</p>
            <p className="text-lg font-bold text-orange-500">
              -{avgDrawdown.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">To Recover Peak</p>
            <p className="text-lg font-bold">
              +{recoveryPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickMargin={8}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tickFormatter={(value) => `-${value.toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                width={50}
                domain={[0, Math.max(maxDrawdown * 1.2, maxDrawdownLimit)]}
                reversed
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={maxDrawdownLimit}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{
                  value: `Max Limit: -${maxDrawdownLimit}%`,
                  position: "right",
                  className: "fill-destructive text-xs",
                }}
              />
              <Area
                type="monotone"
                dataKey="drawdownPercent"
                stroke="hsl(var(--destructive))"
                fill="hsl(var(--destructive) / 0.3)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery Info */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="text-sm font-medium">Recovery Analysis</h4>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Equity</p>
              <p className="font-medium">{formatCurrency(currentEquity)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peak Equity</p>
              <p className="font-medium">{formatCurrency(peakEquity)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount to Recover</p>
              <p className="font-medium text-green-500">
                +{formatCurrency(recoveryNeeded)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Gain Needed</p>
              <p className="font-medium text-green-500">
                +{formatPercentage(recoveryPercent)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
