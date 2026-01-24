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
  if (active && payload && payload.length) {
    const date = new Date(label || "");
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-medium">{formattedDate}</p>
        <p className="text-lg font-bold text-primary">
          {formatCurrency(payload[0].value)}
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

  return (
    <Card>
      <CardHeader>
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
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
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
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                width={50}
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
