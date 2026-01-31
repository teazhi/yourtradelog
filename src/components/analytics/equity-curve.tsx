"use client";

import {
  AreaChart,
  Area,
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
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/calculations/formatters";

interface EquityDataPoint {
  date: string;
  equity: number;
}

interface EquityCurveProps {
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

export function EquityCurve({ data = [] }: EquityCurveProps) {
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

  const endEquity = data[data.length - 1]?.equity ?? 0;
  const isPositive = endEquity >= 0;

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
      <CardContent className="pb-4">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  // Parse YYYY-MM-DD format correctly without timezone issues
                  const [year, month, day] = value.split('-').map(Number);
                  return `${month}/${day}`;
                }}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value) =>
                  `$${Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`
                }
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                strokeWidth={2}
                fill="url(#equityGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  className: isPositive ? "fill-green-500" : "fill-red-500",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
