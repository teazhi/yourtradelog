/**
 * Formatting Utilities for Trading Data
 *
 * This module provides functions for formatting numbers, currencies,
 * percentages, dates, and other trading-specific values for display.
 *
 * @module formatters
 */

/**
 * Formats a number as US currency
 *
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * formatCurrency(1234.56); // Returns "$1,234.56"
 * formatCurrency(-500); // Returns "-$500.00"
 * formatCurrency(0); // Returns "$0.00"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as a percentage
 *
 * @param value - The number to format (e.g., 12.34 for 12.34%)
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted percentage string (e.g., "12.34%")
 *
 * @example
 * formatPercentage(12.345); // Returns "12.35%"
 * formatPercentage(0); // Returns "0.00%"
 * formatPercentage(-5.5); // Returns "-5.50%"
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00%";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Formats a number with specified decimal places and thousands separators
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted number string (e.g., "1,234.56")
 *
 * @example
 * formatNumber(1234.5678, 2); // Returns "1,234.57"
 * formatNumber(1000000, 0); // Returns "1,000,000"
 * formatNumber(0.123, 3); // Returns "0.123"
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Supported date format patterns
 */
export type DateFormat =
  | "short" // MM/DD/YYYY
  | "medium" // Jan 15, 2024
  | "long" // January 15, 2024
  | "iso" // 2024-01-15
  | "full"; // Monday, January 15, 2024

/**
 * Formats a date according to the specified format
 *
 * @param date - The date to format (Date object or string)
 * @param format - The format pattern to use (default "short")
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2024-01-15'), 'short'); // Returns "01/15/2024"
 * formatDate('2024-01-15', 'medium'); // Returns "Jan 15, 2024"
 * formatDate('2024-01-15', 'iso'); // Returns "2024-01-15"
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: DateFormat = "short"
): string {
  if (date === null || date === undefined) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  switch (format) {
    case "short":
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }).format(dateObj);

    case "medium":
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dateObj);

    case "long":
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(dateObj);

    case "full":
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(dateObj);

    case "iso":
      return dateObj.toISOString().split("T")[0];

    default:
      return dateObj.toLocaleDateString("en-US");
  }
}

/**
 * Formats a date as time only (HH:MM:SS)
 *
 * @param date - The date to format (Date object or string)
 * @param includeSeconds - Whether to include seconds (default true)
 * @returns Formatted time string (e.g., "14:30:45" or "2:30 PM")
 *
 * @example
 * formatTime(new Date('2024-01-15T14:30:45')); // Returns "02:30:45 PM"
 * formatTime('2024-01-15T14:30:45', false); // Returns "02:30 PM"
 */
export function formatTime(
  date: Date | string | null | undefined,
  includeSeconds: boolean = true
): string {
  if (date === null || date === undefined) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(dateObj);
}

/**
 * Formats a date and time together
 *
 * @param date - The date to format (Date object or string)
 * @param options - Formatting options
 * @returns Formatted date/time string
 *
 * @example
 * formatDateTime(new Date('2024-01-15T14:30:45'));
 * // Returns "01/15/2024, 02:30:45 PM"
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  options?: {
    dateFormat?: DateFormat;
    includeSeconds?: boolean;
  }
): string {
  if (date === null || date === undefined) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  const datePart = formatDate(dateObj, options?.dateFormat ?? "short");
  const timePart = formatTime(dateObj, options?.includeSeconds ?? true);

  return `${datePart}, ${timePart}`;
}

/**
 * Formats a duration in milliseconds as a human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Human-readable duration string
 *
 * @example
 * formatDuration(1000); // Returns "1s"
 * formatDuration(65000); // Returns "1m 5s"
 * formatDuration(3665000); // Returns "1h 1m 5s"
 * formatDuration(90061000); // Returns "1d 1h 1m 1s"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) {
    return "0s";
  }

  if (ms < 1000) {
    return "< 1s";
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }

  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }

  if (seconds % 60 > 0 && days === 0) {
    parts.push(`${seconds % 60}s`);
  }

  return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Formats an R-multiple value with a +/- prefix
 *
 * @param value - The R-multiple value
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted R-multiple string (e.g., "+2.50R" or "-1.20R")
 *
 * @example
 * formatRMultiple(2.5); // Returns "+2.50R"
 * formatRMultiple(-1.2); // Returns "-1.20R"
 * formatRMultiple(0); // Returns "0.00R"
 */
export function formatRMultiple(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00R";
  }

  const prefix = value > 0 ? "+" : "";
  const formatted = value.toFixed(decimals);

  return `${prefix}${formatted}R`;
}

/**
 * Formats a number with a +/- prefix for P&L display
 *
 * @param value - The P&L value
 * @param asCurrency - Whether to format as currency (default true)
 * @returns Formatted P&L string with sign
 *
 * @example
 * formatPnL(1234.56); // Returns "+$1,234.56"
 * formatPnL(-500); // Returns "-$500.00"
 * formatPnL(100, false); // Returns "+100.00"
 */
export function formatPnL(
  value: number | null | undefined,
  asCurrency: boolean = true
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return asCurrency ? "$0.00" : "0.00";
  }

  if (asCurrency) {
    const formatted = formatCurrency(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted.replace("-", "")}`;
    return formatted;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, 2)}`;
}

/**
 * Formats a trade direction for display
 *
 * @param direction - The trade direction ("long" or "short")
 * @returns Formatted direction string with proper capitalization
 *
 * @example
 * formatDirection('long'); // Returns "Long"
 * formatDirection('short'); // Returns "Short"
 */
export function formatDirection(
  direction: "long" | "short" | null | undefined
): string {
  if (!direction) {
    return "";
  }

  return direction.charAt(0).toUpperCase() + direction.slice(1);
}

/**
 * Formats a trade status for display
 *
 * @param status - The trade status
 * @returns Formatted status string with proper capitalization
 *
 * @example
 * formatStatus('open'); // Returns "Open"
 * formatStatus('closed'); // Returns "Closed"
 */
export function formatStatus(
  status: "open" | "closed" | "cancelled" | null | undefined
): string {
  if (!status) {
    return "";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Truncates a string to a maximum length with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default 50)
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * truncateText('This is a very long string', 10); // Returns "This is a..."
 * truncateText('Short', 10); // Returns "Short"
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number = 50
): string {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Formats a ratio as "X:1" format
 *
 * @param value - The ratio value
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted ratio string (e.g., "2.50:1")
 *
 * @example
 * formatRatio(2.5); // Returns "2.50:1"
 * formatRatio(0.5); // Returns "0.50:1"
 */
export function formatRatio(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0:1";
  }

  if (!isFinite(value)) {
    return "Infinity";
  }

  return `${value.toFixed(decimals)}:1`;
}
