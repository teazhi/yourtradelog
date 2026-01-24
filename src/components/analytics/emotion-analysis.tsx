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
  PieChart,
  Pie,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Brain } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface EmotionData {
  emotion: string;
  pnl: number;
  trades: number;
  winRate: number;
  avgPnL: number;
}

interface EmotionAnalysisProps {
  data?: EmotionData[];
}

// Emotion colors mapping
const emotionColors: Record<string, string> = {
  confident: "#22c55e",
  calm: "#3b82f6",
  focused: "#8b5cf6",
  patient: "#06b6d4",
  disciplined: "#10b981",
  neutral: "#6b7280",
  uncertain: "#9ca3af",
  fearful: "#f97316",
  greedy: "#eab308",
  anxious: "#f59e0b",
  impatient: "#ef4444",
  frustrated: "#dc2626",
  overconfident: "#f43f5e",
  fomo: "#e11d48",
  revenge: "#be123c",
  hopeful: "#84cc16",
  hesitant: "#a3a3a3",
};

function getEmotionColor(emotion: string): string {
  return emotionColors[emotion.toLowerCase()] || "#6b7280";
}

function formatEmotionLabel(emotion: string): string {
  return emotion.charAt(0).toUpperCase() + emotion.slice(1).replace(/_/g, " ");
}

interface PnLTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EmotionData }>;
  label?: string;
}

function PnLTooltip({ active, payload, label }: PnLTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium capitalize">{formatEmotionLabel(label || "")}</p>
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

interface FrequencyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { emotion: string; trades: number; percentage: number } }>;
}

function FrequencyTooltip({ active, payload }: FrequencyTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium capitalize">{formatEmotionLabel(data.emotion)}</p>
        <p className="text-sm text-muted-foreground">
          {data.trades} trades ({formatPercentage(data.percentage)})
        </p>
      </div>
    );
  }
  return null;
}

export function EmotionAnalysis({ data }: EmotionAnalysisProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotion Analysis</CardTitle>
          <CardDescription>Cost of emotions and psychological patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No emotion data yet. Tag your trades with emotions to see psychological analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by P&L for the cost chart
  const sortedByPnL = [...data].sort((a, b) => b.pnl - a.pnl);

  // Calculate totals
  const totalPnL = data.reduce((sum, d) => sum + d.pnl, 0);
  const totalTrades = data.reduce((sum, d) => sum + d.trades, 0);
  const negativeEmotions = data.filter(d => d.pnl < 0);
  const costOfNegativeEmotions = Math.abs(negativeEmotions.reduce((sum, d) => sum + d.pnl, 0));

  const bestEmotion = sortedByPnL[0];
  const worstEmotion = sortedByPnL[sortedByPnL.length - 1];

  // Prepare frequency data for pie chart
  const frequencyData = data.map(d => ({
    emotion: d.emotion,
    trades: d.trades,
    percentage: totalTrades > 0 ? (d.trades / totalTrades) * 100 : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Emotion Analysis</CardTitle>
            <CardDescription>
              Cost of emotions and psychological patterns
            </CardDescription>
          </div>
          {costOfNegativeEmotions > 0 && (
            <div className="text-right text-sm">
              <div className="text-red-500">
                Cost of Negative Emotions: {formatCurrency(costOfNegativeEmotions)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pnl" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pnl">P&L by Emotion</TabsTrigger>
            <TabsTrigger value="frequency">Emotion Frequency</TabsTrigger>
          </TabsList>

          <TabsContent value="pnl" className="space-y-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedByPnL}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
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
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="emotion"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => formatEmotionLabel(value)}
                    width={75}
                  />
                  <Tooltip content={<PnLTooltip />} />
                  <Bar
                    dataKey="pnl"
                    radius={[0, 4, 4, 0]}
                  >
                    {sortedByPnL.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getEmotionColor(entry.emotion)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Best Emotion</div>
                <div className="font-medium text-green-500 capitalize">
                  {formatEmotionLabel(bestEmotion?.emotion || "")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(bestEmotion?.pnl || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Worst Emotion</div>
                <div className="font-medium text-red-500 capitalize">
                  {formatEmotionLabel(worstEmotion?.emotion || "")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(worstEmotion?.pnl || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Net Impact</div>
                <div className={`font-medium ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="frequency" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={frequencyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="trades"
                    >
                      {frequencyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getEmotionColor(entry.emotion)}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<FrequencyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-col justify-center space-y-1.5 overflow-y-auto max-h-[280px]">
                {frequencyData.sort((a, b) => b.trades - a.trades).map((emotion) => (
                  <div
                    key={emotion.emotion}
                    className="flex items-center justify-between text-sm rounded-md px-2.5 py-1.5"
                    style={{ backgroundColor: `${getEmotionColor(emotion.emotion)}15` }}
                  >
                    <span
                      className="font-medium capitalize"
                      style={{ color: getEmotionColor(emotion.emotion) }}
                    >
                      {formatEmotionLabel(emotion.emotion)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{emotion.trades}</span>
                      <span className="w-12 text-right font-medium text-muted-foreground">
                        {formatPercentage(emotion.percentage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
