"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";
import { TrendingUp } from "lucide-react";

interface EquityDataPoint {
  date: string;
  equity: number;
}

interface EquityChartProps {
  data?: EquityDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length && label) {
    // Parse YYYY-MM-DD format correctly without timezone issues
    const [year, month, day] = label.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const value = payload[0].value;
    const isPositive = value >= 0;
    return (
      <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-md">
        <p className="text-sm font-medium">{formattedDate}</p>
        <p className={`text-lg font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? "+" : ""}{formatCurrency(value)}
        </p>
      </div>
    );
  }
  return null;
}

export function EquityChart({ data = [] }: EquityChartProps) {
  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Track your cumulative P&L over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No data yet. Import or add trades to see your equity curve.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startEquity = data[0]?.equity ?? 0;
  const endEquity = data[data.length - 1]?.equity ?? 0;
  const change = endEquity - startEquity;
  const changePercent = startEquity !== 0 ? (change / Math.abs(startEquity)) * 100 : (endEquity > 0 ? 100 : 0);
  const isPositive = change >= 0;

  // Calculate tight Y-axis domain
  const equityValues = data.map(d => d.equity);
  const minEquity = Math.min(...equityValues);
  const maxEquity = Math.max(...equityValues);
  const padding = (maxEquity - minEquity) * 0.1 || 50; // 10% padding or 50 if flat
  const yMin = minEquity - padding;
  const yMax = maxEquity + padding;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle>Equity Curve</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <span
            className={`font-medium ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(endEquity)}
          </span>
          <span>cumulative P&L</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-0 px-2 sm:px-6">
        <div className="h-[160px] sm:h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 5,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  // Parse YYYY-MM-DD format correctly without timezone issues
                  const [, month, day] = value.split('-').map(Number);
                  return `${month}/${day}`;
                }}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickMargin={4}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : Math.round(value)}`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                width={45}
                domain={[yMin, yMax]}
                tickCount={4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="equity"
                stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 6,
                  className: isPositive ? "fill-green-500" : "fill-red-500",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
