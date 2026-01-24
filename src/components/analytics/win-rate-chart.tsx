"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { PieChartIcon } from "lucide-react";
import { formatPercentage } from "@/lib/calculations/formatters";

interface WinRateData {
  wins: number;
  losses: number;
  breakeven: number;
}

interface WinRateChartProps {
  data?: WinRateData;
}

const COLORS = {
  wins: "hsl(142, 76%, 36%)",
  losses: "hsl(0, 84%, 60%)",
  breakeven: "hsl(220, 14%, 50%)",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium capitalize">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} trades ({(data.payload.percent * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
}

export function WinRateChart({ data }: WinRateChartProps) {
  // Empty state
  if (!data || (data.wins === 0 && data.losses === 0 && data.breakeven === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win Rate</CardTitle>
          <CardDescription>Trade outcome distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] text-center">
            <PieChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trade data yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTrades = data.wins + data.losses + data.breakeven;
  const winRate = totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (data.losses / totalTrades) * 100 : 0;
  const breakevenRate = totalTrades > 0 ? (data.breakeven / totalTrades) * 100 : 0;

  const chartData = [
    { name: "Wins", value: data.wins, percent: data.wins / totalTrades },
    { name: "Losses", value: data.losses, percent: data.losses / totalTrades },
    { name: "Breakeven", value: data.breakeven, percent: data.breakeven / totalTrades },
  ].filter(d => d.value > 0);

  const colorMap: Record<string, string> = {
    Wins: COLORS.wins,
    Losses: COLORS.losses,
    Breakeven: COLORS.breakeven,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win Rate</CardTitle>
        <CardDescription>
          Trade outcome distribution across {totalTrades} trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Chart */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={colorMap[entry.name]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          <div className="flex flex-col justify-center space-y-2">
            <div className="flex items-center justify-between rounded-md bg-green-500/10 px-3 py-2">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Wins</span>
              <div className="text-right">
                <span className="font-semibold text-green-600 dark:text-green-400">{data.wins}</span>
                <span className="ml-1.5 text-xs text-green-600/70 dark:text-green-400/70">
                  {formatPercentage(winRate)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-red-500/10 px-3 py-2">
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Losses</span>
              <div className="text-right">
                <span className="font-semibold text-red-600 dark:text-red-400">{data.losses}</span>
                <span className="ml-1.5 text-xs text-red-600/70 dark:text-red-400/70">
                  {formatPercentage(lossRate)}
                </span>
              </div>
            </div>
            {data.breakeven > 0 && (
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">Breakeven</span>
                <div className="text-right">
                  <span className="font-semibold">{data.breakeven}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {formatPercentage(breakevenRate)}
                  </span>
                </div>
              </div>
            )}
            <div className="mt-2 rounded-md border bg-card px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Win Rate</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPercentage(winRate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
