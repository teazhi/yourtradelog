"use client";

import * as React from "react";
import { Twitter } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui";

interface ShareToXProps {
  // Daily stats
  dailyPnL?: number;
  winRate?: number;
  winCount?: number;
  lossCount?: number;
  tradeCount?: number;
  // Weekly stats (for weekend reviews)
  weeklyPnL?: number;
  weeklyWinRate?: number;
  weeklyTradeCount?: number;
  // Journal data
  date: string;
  isWeekendReview?: boolean;
  lessonsLearned?: string;
  whatWentWell?: string[];
  // Custom text option
  customText?: string;
}

export function ShareToX({
  dailyPnL = 0,
  winRate = 0,
  winCount = 0,
  lossCount = 0,
  tradeCount = 0,
  weeklyPnL = 0,
  weeklyWinRate = 0,
  weeklyTradeCount = 0,
  date,
  isWeekendReview = false,
  lessonsLearned,
  whatWentWell = [],
}: ShareToXProps) {
  // Format currency
  const formatPnL = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Generate share URL with Twitter Web Intent
  const shareToX = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  // Preset share templates
  const generateDailyRecap = () => {
    const emoji = dailyPnL >= 0 ? "📈" : "📉";
    const resultEmoji = dailyPnL >= 0 ? "✅" : "🔴";

    let text = `${emoji} Trading Day Recap - ${date}\n\n`;
    text += `${resultEmoji} P&L: ${formatPnL(dailyPnL)}\n`;
    text += `📊 Win Rate: ${winRate.toFixed(0)}%\n`;
    text += `🎯 Trades: ${tradeCount} (${winCount}W/${lossCount}L)`;

    return text;
  };

  const generateWeeklyRecap = () => {
    const emoji = weeklyPnL >= 0 ? "🏆" : "📊";

    let text = `${emoji} Weekly Trading Recap\n\n`;
    text += `💰 P&L: ${formatPnL(weeklyPnL)}\n`;
    text += `📈 Win Rate: ${weeklyWinRate.toFixed(0)}%\n`;
    text += `🎯 Total Trades: ${weeklyTradeCount}`;

    return text;
  };

  const generateGreenDayPost = () => {
    let text = `✅ Green day in the books!\n\n`;
    text += `💰 ${formatPnL(dailyPnL)}\n`;
    text += `📊 ${winCount}/${tradeCount} winners\n`;

    if (whatWentWell.length > 0) {
      text += `\n✨ ${whatWentWell[0]}`;
    }

    return text;
  };

  const generateRedDayPost = () => {
    let text = `🔴 Red day - part of the game\n\n`;
    text += `📉 ${formatPnL(dailyPnL)}\n`;

    if (lessonsLearned) {
      const lesson = lessonsLearned.slice(0, 100);
      text += `\n📝 Lesson: ${lesson}${lessonsLearned.length > 100 ? "..." : ""}\n`;
    }

    text += `\nStaying disciplined. Tomorrow's a new day.`;

    return text;
  };

  const generateLessonPost = () => {
    if (!lessonsLearned) return null;

    const lesson = lessonsLearned.slice(0, 200);
    let text = `💡 Today's Trading Lesson:\n\n`;
    text += `"${lesson}${lessonsLearned.length > 200 ? "..." : ""}"`;

    return text;
  };

  const generateWinStreakPost = () => {
    let text = `🔥 ${winCount} for ${winCount} today!\n\n`;
    text += `Perfect execution:\n`;
    text += `✅ ${winCount} winners\n`;
    text += `💰 ${formatPnL(dailyPnL)}\n`;

    if (whatWentWell.length > 0) {
      text += `\n✨ Key: ${whatWentWell[0]}`;
    }

    return text;
  };

  const generateMinimalPost = () => {
    const emoji = dailyPnL >= 0 ? "✅" : "🔴";
    return `${emoji} ${formatPnL(dailyPnL)} | ${winRate.toFixed(0)}% WR | ${tradeCount} trades`;
  };

  // Determine which options to show
  const isGreenDay = dailyPnL > 0;
  const isRedDay = dailyPnL < 0;
  const isPerfectDay = winCount > 0 && lossCount === 0;
  const hasLesson = lessonsLearned && lessonsLearned.trim().length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Twitter className="h-4 w-4" />
          Share to X
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Share Template</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Always available */}
        <DropdownMenuItem onClick={() => shareToX(generateMinimalPost())}>
          📝 Minimal Stats
        </DropdownMenuItem>

        {/* Context-aware options */}
        {isWeekendReview ? (
          <DropdownMenuItem onClick={() => shareToX(generateWeeklyRecap())}>
            🏆 Weekly Recap
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => shareToX(generateDailyRecap())}>
            📊 Daily Recap
          </DropdownMenuItem>
        )}

        {isGreenDay && !isWeekendReview && (
          <DropdownMenuItem onClick={() => shareToX(generateGreenDayPost())}>
            ✅ Green Day Post
          </DropdownMenuItem>
        )}

        {isRedDay && !isWeekendReview && (
          <DropdownMenuItem onClick={() => shareToX(generateRedDayPost())}>
            🔴 Red Day Reflection
          </DropdownMenuItem>
        )}

        {isPerfectDay && winCount >= 2 && !isWeekendReview && (
          <DropdownMenuItem onClick={() => shareToX(generateWinStreakPost())}>
            🔥 Win Streak
          </DropdownMenuItem>
        )}

        {hasLesson && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => shareToX(generateLessonPost()!)}>
              💡 Share Lesson
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
