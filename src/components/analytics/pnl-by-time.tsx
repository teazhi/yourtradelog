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
import { Clock } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface PnLByTimeData {
  hour: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface PnLByTimeProps {
  data?: PnLByTimeData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PnLByTimeData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{data.hour}</p>
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

// Calculate intensity for heatmap-style coloring
function getBarColor(value: number, maxAbsValue: number): string {
  if (value === 0) return "hsl(220, 14%, 50%)";

  const intensity = Math.min(Math.abs(value) / maxAbsValue, 1);
  const opacity = 0.4 + (intensity * 0.6);

  if (value > 0) {
    return `hsla(142, 76%, 36%, ${opacity})`;
  } else {
    return `hsla(0, 84%, 60%, ${opacity})`;
  }
}

export function PnLByTime({ data }: PnLByTimeProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L by Time of Day</CardTitle>
          <CardDescription>Performance by trading hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trade data yet. Add trades to see hourly performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bestHour = data.reduce((prev, current) =>
    (prev.pnl > current.pnl) ? prev : current
  );
  const worstHour = data.reduce((prev, current) =>
    (prev.pnl < current.pnl) ? prev : current
  );
  const maxAbsValue = Math.max(...data.map(d => Math.abs(d.pnl)));
  const totalTrades = data.reduce((sum, d) => sum + d.trades, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>P&L by Time of Day</CardTitle>
            <CardDescription>
              {totalTrades} trades across trading hours
            </CardDescription>
          </div>
          <div className="text-right text-sm">
            <div className="text-green-500">Best: {bestHour.hour}</div>
            <div className="text-red-500">Worst: {worstHour.hour}</div>
          </div>
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
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickMargin={8}
                tickFormatter={(hour) => {
                  const h = parseInt(hour);
                  return `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}`;
                }}
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
                className="text-xs fill-muted-foreground"
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
                    fill={getBarColor(entry.pnl, maxAbsValue)}
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
