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
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";
import type { PnlDistribution, PnlBucket } from "@/types/analytics";

interface PnLDistributionProps {
  data?: PnlDistribution;
}

// Mock data for demonstration
const mockPnlDistribution: PnlDistribution = {
  buckets: [
    { range_start: -1000, range_end: -800, count: 3, percentage: 2.4 },
    { range_start: -800, range_end: -600, count: 5, percentage: 3.9 },
    { range_start: -600, range_end: -400, count: 8, percentage: 6.3 },
    { range_start: -400, range_end: -200, count: 15, percentage: 11.8 },
    { range_start: -200, range_end: 0, count: 22, percentage: 17.3 },
    { range_start: 0, range_end: 200, count: 28, percentage: 22.0 },
    { range_start: 200, range_end: 400, count: 20, percentage: 15.7 },
    { range_start: 400, range_end: 600, count: 12, percentage: 9.4 },
    { range_start: 600, range_end: 800, count: 8, percentage: 6.3 },
    { range_start: 800, range_end: 1000, count: 4, percentage: 3.1 },
    { range_start: 1000, range_end: 1200, count: 2, percentage: 1.6 },
  ],
  mean: 98.77,
  median: 75.50,
  standard_deviation: 312.45,
  skewness: 0.34,
  kurtosis: 2.87,
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PnlBucket & { label: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{data.label}</p>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Percentage:</span>
            <span>{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function getBarColor(rangeStart: number, rangeEnd: number): string {
  const midpoint = (rangeStart + rangeEnd) / 2;
  if (midpoint > 0) return "hsl(142, 76%, 36%)";
  if (midpoint < 0) return "hsl(0, 84%, 60%)";
  return "hsl(220, 14%, 50%)";
}

export function PnLDistribution({ data = mockPnlDistribution }: PnLDistributionProps) {
  // Add labels to buckets for display
  const chartData = data.buckets.map((bucket) => ({
    ...bucket,
    label: `${formatCurrency(bucket.range_start)} to ${formatCurrency(bucket.range_end)}`,
    shortLabel: `${bucket.range_start >= 0 ? "+" : ""}${bucket.range_start}`,
  }));

  const totalTrades = data.buckets.reduce((sum, b) => sum + b.count, 0);
  const lossingTrades = data.buckets.filter(b => b.range_end <= 0).reduce((sum, b) => sum + b.count, 0);
  const winningTrades = data.buckets.filter(b => b.range_start >= 0).reduce((sum, b) => sum + b.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Distribution</CardTitle>
        <CardDescription>
          Histogram of trade outcomes across {totalTrades} trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                width={35}
              />
              <ReferenceLine
                x={chartData.findIndex(b => b.range_start === 0)}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.range_start, entry.range_end)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Mean P&L</span>
              <span className={`font-medium ${data.mean >= 0 ? "text-green-500" : "text-red-500"}`}>
                {data.mean >= 0 ? "+" : ""}{formatCurrency(data.mean)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Median P&L</span>
              <span className={`font-medium ${data.median >= 0 ? "text-green-500" : "text-red-500"}`}>
                {data.median >= 0 ? "+" : ""}{formatCurrency(data.median)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Std Deviation</span>
              <span className="font-medium">{formatCurrency(data.standard_deviation)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Skewness</span>
              <span className="font-medium">{data.skewness.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Kurtosis</span>
              <span className="font-medium">{data.kurtosis.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Distribution</span>
              <span className="text-xs">
                <span className="text-red-500">{lossingTrades}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-green-500">{winningTrades}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Distribution explanation */}
        <div className="text-xs text-muted-foreground pt-2">
          {data.skewness > 0.5 ? (
            <p>Positive skew indicates more large wins than large losses - good sign of letting winners run.</p>
          ) : data.skewness < -0.5 ? (
            <p>Negative skew indicates more large losses than large wins - consider tighter stop losses.</p>
          ) : (
            <p>Distribution is relatively symmetric around the mean.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
