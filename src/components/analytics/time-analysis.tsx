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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";
import type { DayOfWeekStats, HourlyStats, SessionStats } from "@/types/analytics";
import { Session } from "@/types/trade";

interface TimeAnalysisProps {
  dayOfWeekData?: DayOfWeekStats[];
  hourlyData?: HourlyStats[];
  sessionData?: SessionStats[];
}

// Mock data for day of week
const mockDayOfWeekData: DayOfWeekStats[] = [
  { day: 1, day_name: "Monday", total_trades: 28, win_rate: 64.3, total_pnl: 2340, average_pnl: 83.6, average_r_multiple: 1.2 },
  { day: 2, day_name: "Tuesday", total_trades: 32, win_rate: 56.3, total_pnl: 1890, average_pnl: 59.1, average_r_multiple: 0.9 },
  { day: 3, day_name: "Wednesday", total_trades: 25, win_rate: 52.0, total_pnl: -450, average_pnl: -18.0, average_r_multiple: -0.3 },
  { day: 4, day_name: "Thursday", total_trades: 30, win_rate: 60.0, total_pnl: 1650, average_pnl: 55.0, average_r_multiple: 0.8 },
  { day: 5, day_name: "Friday", total_trades: 22, win_rate: 45.5, total_pnl: -280, average_pnl: -12.7, average_r_multiple: -0.2 },
];

// Mock data for hourly performance
const mockHourlyData: HourlyStats[] = [
  { hour: 6, total_trades: 8, win_rate: 50.0, total_pnl: 120, average_pnl: 15.0, average_r_multiple: 0.2 },
  { hour: 7, total_trades: 12, win_rate: 58.3, total_pnl: 450, average_pnl: 37.5, average_r_multiple: 0.5 },
  { hour: 8, total_trades: 18, win_rate: 61.1, total_pnl: 890, average_pnl: 49.4, average_r_multiple: 0.7 },
  { hour: 9, total_trades: 25, win_rate: 64.0, total_pnl: 1650, average_pnl: 66.0, average_r_multiple: 1.0 },
  { hour: 10, total_trades: 22, win_rate: 59.1, total_pnl: 980, average_pnl: 44.5, average_r_multiple: 0.7 },
  { hour: 11, total_trades: 15, win_rate: 46.7, total_pnl: -220, average_pnl: -14.7, average_r_multiple: -0.2 },
  { hour: 12, total_trades: 10, win_rate: 40.0, total_pnl: -380, average_pnl: -38.0, average_r_multiple: -0.5 },
  { hour: 13, total_trades: 14, win_rate: 57.1, total_pnl: 340, average_pnl: 24.3, average_r_multiple: 0.4 },
  { hour: 14, total_trades: 16, win_rate: 62.5, total_pnl: 720, average_pnl: 45.0, average_r_multiple: 0.6 },
  { hour: 15, total_trades: 12, win_rate: 41.7, total_pnl: -280, average_pnl: -23.3, average_r_multiple: -0.3 },
];

// Mock data for session performance
const mockSessionData: SessionStats[] = [
  { session: Session.Asian, total_trades: 18, win_rate: 55.6, total_pnl: 620, average_pnl: 34.4, average_r_multiple: 0.5, average_hold_time: 35 },
  { session: Session.London, total_trades: 42, win_rate: 61.9, total_pnl: 2850, average_pnl: 67.9, average_r_multiple: 1.0, average_hold_time: 42 },
  { session: Session.NewYork, total_trades: 55, win_rate: 56.4, total_pnl: 1680, average_pnl: 30.5, average_r_multiple: 0.5, average_hold_time: 52 },
  { session: Session.PreMarket, total_trades: 22, win_rate: 68.2, total_pnl: 1450, average_pnl: 65.9, average_r_multiple: 1.1, average_hold_time: 38 },
];

// Utility functions
function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${suffix}`;
}

function getBarColor(value: number): string {
  if (value > 0) return "hsl(142, 76%, 36%)";
  if (value < 0) return "hsl(0, 84%, 60%)";
  return "hsl(220, 14%, 50%)";
}

// Tooltip components
interface DayTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DayOfWeekStats }>;
  label?: string;
}

function DayTooltip({ active, payload, label }: DayTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{label}</p>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={data.total_pnl >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.total_pnl >= 0 ? "+" : ""}{formatCurrency(data.total_pnl)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Win Rate:</span>
            <span>{formatPercentage(data.win_rate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span>{data.total_trades}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg R:</span>
            <span className={data.average_r_multiple >= 0 ? "text-green-500" : "text-red-500"}>
              {data.average_r_multiple >= 0 ? "+" : ""}{data.average_r_multiple.toFixed(2)}R
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface HourTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HourlyStats }>;
}

function HourTooltip({ active, payload }: HourTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{formatHour(data.hour)}</p>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={data.total_pnl >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.total_pnl >= 0 ? "+" : ""}{formatCurrency(data.total_pnl)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Win Rate:</span>
            <span>{formatPercentage(data.win_rate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span>{data.total_trades}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface SessionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SessionStats & { sessionLabel: string } }>;
}

function SessionTooltip({ active, payload }: SessionTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{data.sessionLabel}</p>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={data.total_pnl >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.total_pnl >= 0 ? "+" : ""}{formatCurrency(data.total_pnl)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Win Rate:</span>
            <span>{formatPercentage(data.win_rate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span>{data.total_trades}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg Hold:</span>
            <span>{data.average_hold_time}m</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Heatmap component for hourly data
function HourlyHeatmap({ data }: { data: HourlyStats[] }) {
  const maxAbsPnl = Math.max(...data.map(d => Math.abs(d.total_pnl)));

  const getHeatmapColor = (pnl: number): string => {
    if (pnl === 0) return "bg-muted";
    const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
    if (pnl > 0) {
      if (intensity > 0.7) return "bg-green-500";
      if (intensity > 0.4) return "bg-green-400";
      return "bg-green-300";
    } else {
      if (intensity > 0.7) return "bg-red-500";
      if (intensity > 0.4) return "bg-red-400";
      return "bg-red-300";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {data.map((hour) => (
          <div
            key={hour.hour}
            className={`p-3 rounded-lg ${getHeatmapColor(hour.total_pnl)} transition-colors`}
            title={`${formatHour(hour.hour)}: ${formatCurrency(hour.total_pnl)} (${hour.total_trades} trades)`}
          >
            <div className="text-xs font-medium text-center">
              {hour.hour > 12 ? hour.hour - 12 : hour.hour}{hour.hour >= 12 ? "p" : "a"}
            </div>
            <div className="text-sm font-bold text-center mt-1">
              {hour.total_pnl >= 0 ? "+" : ""}{formatCurrency(hour.total_pnl)}
            </div>
            <div className="text-xs text-center opacity-75">
              {hour.total_trades} trades
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span>Strong Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-muted" />
          <span>Breakeven</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Strong Profit</span>
        </div>
      </div>
    </div>
  );
}

const sessionLabels: Record<Session, string> = {
  [Session.Asian]: "Asian",
  [Session.London]: "London",
  [Session.NewYork]: "New York",
  [Session.Overnight]: "Overnight",
  [Session.PreMarket]: "Pre-Market",
  [Session.RegularHours]: "Regular Hours",
  [Session.AfterHours]: "After Hours",
};

export function TimeAnalysis({
  dayOfWeekData = mockDayOfWeekData,
  hourlyData = mockHourlyData,
  sessionData = mockSessionData,
}: TimeAnalysisProps) {
  const bestDay = dayOfWeekData.reduce((prev, current) =>
    (prev.total_pnl > current.total_pnl) ? prev : current
  );
  const worstDay = dayOfWeekData.reduce((prev, current) =>
    (prev.total_pnl < current.total_pnl) ? prev : current
  );

  const bestHour = hourlyData.reduce((prev, current) =>
    (prev.total_pnl > current.total_pnl) ? prev : current
  );
  const worstHour = hourlyData.reduce((prev, current) =>
    (prev.total_pnl < current.total_pnl) ? prev : current
  );

  const bestSession = sessionData.reduce((prev, current) =>
    (prev.total_pnl > current.total_pnl) ? prev : current
  );

  // Prepare session data with labels
  const sessionChartData = sessionData.map(s => ({
    ...s,
    sessionLabel: sessionLabels[s.session],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Analysis</CardTitle>
        <CardDescription>
          Performance breakdown by time periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Day of Week</TabsTrigger>
            <TabsTrigger value="hour">By Hour</TabsTrigger>
            <TabsTrigger value="session">Sessions</TabsTrigger>
          </TabsList>

          {/* Day of Week Tab */}
          <TabsContent value="day" className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-green-500">Best: {bestDay.day_name}</div>
              <div className="text-red-500">Worst: {worstDay.day_name}</div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayOfWeekData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day_name"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value >= 0 ? "" : "-"}${Math.abs(value / 1000).toFixed(1)}k`}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    width={55}
                  />
                  <Tooltip content={<DayTooltip />} />
                  <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.total_pnl)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Hour Tab */}
          <TabsContent value="hour" className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-green-500">Best: {formatHour(bestHour.hour)}</div>
              <div className="text-red-500">Worst: {formatHour(worstHour.hour)}</div>
            </div>
            <HourlyHeatmap data={hourlyData} />
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyData}
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
                    tickFormatter={(hour) => `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "p" : "a"}`}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value >= 0 ? "" : "-"}${Math.abs(value / 1000).toFixed(1)}k`}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    width={55}
                  />
                  <Tooltip content={<HourTooltip />} />
                  <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.total_pnl)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Session Tab */}
          <TabsContent value="session" className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-green-500">Best: {sessionLabels[bestSession.session]}</div>
              <div className="text-muted-foreground">
                {sessionData.reduce((sum, s) => sum + s.total_trades, 0)} total trades
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sessionChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="sessionLabel"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickMargin={8}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value >= 0 ? "" : "-"}${Math.abs(value / 1000).toFixed(1)}k`}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    width={55}
                  />
                  <Tooltip content={<SessionTooltip />} />
                  <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                    {sessionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.total_pnl)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Session Cards */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {sessionChartData.map((session) => (
                <div
                  key={session.session}
                  className="p-3 rounded-lg border bg-muted/50"
                >
                  <div className="font-medium">{session.sessionLabel}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">P&L: </span>
                      <span className={session.total_pnl >= 0 ? "text-green-500" : "text-red-500"}>
                        {session.total_pnl >= 0 ? "+" : ""}{formatCurrency(session.total_pnl)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win: </span>
                      <span>{formatPercentage(session.win_rate)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trades: </span>
                      <span>{session.total_trades}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg R: </span>
                      <span className={session.average_r_multiple >= 0 ? "text-green-500" : "text-red-500"}>
                        {session.average_r_multiple >= 0 ? "+" : ""}{session.average_r_multiple.toFixed(2)}R
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
