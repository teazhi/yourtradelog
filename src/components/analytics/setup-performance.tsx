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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Badge } from "@/components/ui";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface SetupData {
  id: string;
  name: string;
  totalPnL: number;
  trades: number;
  winRate: number;
  avgPnL: number;
}

interface SetupPerformanceProps {
  data?: SetupData[];
}

function getPnLIcon(pnl: number) {
  if (pnl > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (pnl < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return "text-green-500";
  if (winRate >= 50) return "text-yellow-500";
  return "text-red-500";
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SetupData }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium mb-2">{data.name}</p>
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={data.totalPnL >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.totalPnL >= 0 ? "+" : ""}{formatCurrency(data.totalPnL)}
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
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg P&L:</span>
            <span className={data.avgPnL >= 0 ? "text-green-500" : "text-red-500"}>
              {data.avgPnL >= 0 ? "+" : ""}{formatCurrency(data.avgPnL)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Color palette for setups
const SETUP_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#84cc16", // lime
];

export function SetupPerformance({ data }: SetupPerformanceProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup Performance</CardTitle>
          <CardDescription>Performance breakdown by trading setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No setup data yet. Tag your trades with setups to see performance analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTrades = data.reduce((sum, d) => sum + d.trades, 0);
  const bestSetup = data.reduce((prev, current) =>
    (prev.totalPnL > current.totalPnL) ? prev : current
  );
  const worstSetup = data.reduce((prev, current) =>
    (prev.totalPnL < current.totalPnL) ? prev : current
  );

  // Sort by total P&L descending
  const sortedData = [...data].sort((a, b) => b.totalPnL - a.totalPnL);

  // Assign colors to setups
  const dataWithColors = sortedData.map((setup, index) => ({
    ...setup,
    color: SETUP_COLORS[index % SETUP_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Setup Performance</CardTitle>
            <CardDescription>
              Performance breakdown by trading setup ({totalTrades} total trades)
            </CardDescription>
          </div>
          <div className="text-right text-sm">
            <div className="text-green-500">Best: {bestSetup.name}</div>
            <div className="text-red-500">Worst: {worstSetup.name}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          {/* Chart View */}
          <TabsContent value="chart" className="mt-4 space-y-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataWithColors}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
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
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]}>
                    {dataWithColors.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.color}
                        fillOpacity={entry.totalPnL >= 0 ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Win Rate Bar Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Win Rate by Setup</h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dataWithColors}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      width={40}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, "Win Rate"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {dataWithColors.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.winRate >= 50 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setup</TableHead>
                    <TableHead className="text-center">Trades</TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                    <TableHead className="text-right">Total P&L</TableHead>
                    <TableHead className="text-right">Avg P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataWithColors.map((setup) => (
                    <TableRow key={setup.id}>
                      <TableCell>
                        <div
                          className="flex items-center pl-2 border-l-2"
                          style={{ borderColor: setup.color }}
                        >
                          <span className="font-medium">{setup.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{setup.trades}</Badge>
                      </TableCell>
                      <TableCell className={`text-center font-medium ${getWinRateColor(setup.winRate)}`}>
                        {formatPercentage(setup.winRate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getPnLIcon(setup.totalPnL)}
                          <span className={setup.totalPnL >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                            {setup.totalPnL >= 0 ? "+" : ""}{formatCurrency(setup.totalPnL)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={setup.avgPnL >= 0 ? "text-green-500" : "text-red-500"}>
                          {setup.avgPnL >= 0 ? "+" : ""}{formatCurrency(setup.avgPnL)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
