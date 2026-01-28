"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, X, CalendarDays, Loader2, HelpCircle, ExternalLink, Wallet } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Progress,
  Alert,
  AlertDescription,
  AlertTitle,
  Checkbox,
  cn,
  toast,
} from "@/components/ui";
import { SUPPORTED_BROKERS, DEFAULT_FUTURES_INSTRUMENTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { TradeInsert, Account } from "@/types/database";
import Papa from "papaparse";
import { useAccount } from "@/components/providers/account-provider";

// Types
interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  appField: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ValidatedTrade {
  isValid: boolean;
  errors: string[];
  data: ParsedRow;
  rowIndex: number;
}

// App fields that can be mapped
// For Tradovate Performance exports: buyPrice=entry, sellPrice=exit, boughtTimestamp=entry_date, soldTimestamp=exit_date
const APP_FIELDS = [
  { value: "symbol", label: "Symbol/Contract", required: true },
  { value: "side", label: "Side (Buy/Sell)", required: false }, // Not required - can be inferred from prices
  { value: "entry_date", label: "Entry Date/Time", required: false }, // boughtTimestamp
  { value: "entry_time", label: "Entry Time (if separate)", required: false },
  { value: "entry_price", label: "Entry/Buy Price", required: false }, // buyPrice
  { value: "entry_contracts", label: "Quantity/Contracts", required: true },
  { value: "exit_date", label: "Exit Date/Time", required: false }, // soldTimestamp
  { value: "exit_time", label: "Exit Time (if separate)", required: false },
  { value: "exit_price", label: "Exit/Sell Price", required: false }, // sellPrice
  { value: "exit_contracts", label: "Exit Contracts", required: false },
  { value: "stop_loss", label: "Stop Loss", required: false },
  { value: "take_profit", label: "Take Profit/Limit", required: false },
  { value: "commission", label: "Commission", required: false },
  { value: "fees", label: "Fees", required: false },
  { value: "pnl", label: "P&L (Realized)", required: false },
  { value: "order_id", label: "Order ID", required: false },
  { value: "account", label: "Account", required: false },
  { value: "status", label: "Status", required: false },
  { value: "notes", label: "Notes/Text", required: false },
  { value: "ignore", label: "-- Ignore --", required: false },
];

// Common column name mappings for auto-detection
// Includes mappings for Tradovate Performance exports and other common brokers
const COLUMN_NAME_MAPPINGS: Record<string, string[]> = {
  symbol: ["symbol", "instrument", "ticker", "contract", "product", "productdescription", "product description"],
  side: ["side", "direction", "action", "buy/sell", "b/s", "buysell"],
  // Tradovate Performance: boughtTimestamp = entry date
  entry_date: ["entry date", "date", "trade date", "entry_date", "entrydate", "open date", "boughttimestamp", "bought timestamp", "filltime", "fill time", "timestamp", "time", "entrytime"],
  entry_time: ["entry time", "entry_time", "entrytime", "open time"],
  // Tradovate Performance: buyPrice = entry price
  entry_price: ["entry price", "entry", "entry_price", "entryprice", "open price", "avg entry", "buyprice", "buy price", "avgprice", "avg fill price", "avgfillprice", "avg price", "fillprice", "fill price"],
  entry_contracts: ["quantity", "qty", "contracts", "size", "lots", "entry_contracts", "volume", "filledqty", "filled qty", "filledquantity"],
  // Tradovate Performance: soldTimestamp = exit date
  exit_date: ["exit date", "close date", "exit_date", "exitdate", "soldtimestamp", "sold timestamp", "closetime", "close time"],
  exit_time: ["exit time", "close time", "exit_time", "exittime"],
  // Tradovate Performance: sellPrice = exit price
  exit_price: ["exit price", "exit", "exit_price", "exitprice", "close price", "avg exit", "sellprice", "sell price", "closeprice"],
  exit_contracts: ["exit qty", "close qty", "exit_contracts", "exit quantity"],
  stop_loss: ["stop loss", "stop", "sl", "stop_loss", "stoploss", "stopprice", "stop price"],
  take_profit: ["take profit", "target", "tp", "take_profit", "takeprofit", "profit target", "limitprice", "limit price"],
  commission: ["commission", "comm", "trading fees"],
  fees: ["fees", "fee"],
  pnl: ["pnl", "p&l", "profit", "profit/loss", "net p&l", "gross p&l", "realized p&l", "realizedpnl", "realized pnl", "netpnl"],
  order_id: ["orderid", "order id", "ordernumber", "order number", "buyfillid", "sellfillid"],
  account: ["account", "accountid", "account id", "accountnumber", "account number"],
  status: ["status", "orderstatus", "order status", "state"],
  notes: ["notes", "comments", "memo", "description", "text"],
};

// Auto-detect mapping for a column
function autoDetectMapping(columnName: string): string {
  const normalized = columnName.toLowerCase().trim();

  // Skip internal/metadata columns that start with underscore
  if (normalized.startsWith("_")) {
    return "ignore";
  }

  // Skip columns that are clearly not trade data
  const ignorePatterns = ["priceformat", "ticksize", "formattype", "version", "spreaddef"];
  if (ignorePatterns.some(pattern => normalized.includes(pattern))) {
    return "ignore";
  }

  // Check for specific Tradovate patterns FIRST (before generic matching)
  // This prevents "soldtimestamp" from matching "timestamp" in entry_date
  // Handle various formats: "soldTimestamp", "SoldTimestamp", "sold timestamp", "Sold Timestamp"
  if (normalized.includes("sold") && normalized.includes("timestamp")) {
    return "exit_date";
  }
  if (normalized.includes("bought") && normalized.includes("timestamp")) {
    return "entry_date";
  }
  if (normalized === "sellprice" || normalized === "sell price" || (normalized.includes("sell") && normalized.includes("price"))) {
    return "exit_price";
  }
  if (normalized === "buyprice" || normalized === "buy price" || (normalized.includes("buy") && normalized.includes("price"))) {
    return "entry_price";
  }

  for (const [field, aliases] of Object.entries(COLUMN_NAME_MAPPINGS)) {
    if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
      return field;
    }
  }
  return "ignore";
}

// Normalize futures symbol by removing contract month/year codes
// E.g., "MESZ4" -> "MES", "ESH25" -> "ES", "NQM2024" -> "NQ"
function normalizeSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().trim();

  // Common futures contract month codes: F,G,H,J,K,M,N,Q,U,V,X,Z
  // Patterns like: MESZ4, ESH25, NQM2024, MESH5, etc.

  // First, check if the symbol matches any known instrument directly
  const knownSymbols = DEFAULT_FUTURES_INSTRUMENTS.map(i => i.symbol);
  if (knownSymbols.includes(upperSymbol)) {
    return upperSymbol;
  }

  // Try to extract base symbol by removing trailing month code + year
  // Pattern: base symbol + month letter + year digits
  const contractPattern = /^([A-Z]+[A-Z0-9]*?)([FGHJKMNQUVXZ])(\d{1,4})$/;
  const match = upperSymbol.match(contractPattern);

  if (match) {
    const baseSymbol = match[1];
    // Check if extracted base matches a known symbol
    if (knownSymbols.includes(baseSymbol)) {
      return baseSymbol;
    }
  }

  // If no pattern match, try removing last 2-5 characters if they look like contract codes
  // This handles formats like "ESZ4", "MESH25", "NQM2024"
  for (let i = 2; i <= 5; i++) {
    if (upperSymbol.length > i) {
      const potentialBase = upperSymbol.slice(0, -i);
      if (knownSymbols.includes(potentialBase)) {
        return potentialBase;
      }
    }
  }

  // Return original symbol if no normalization possible
  return upperSymbol;
}

// Validate a single trade row
function validateTrade(row: ParsedRow, mappings: ColumnMapping[], rowIndex: number): ValidatedTrade {
  const errors: string[] = [];
  const mappedData: Record<string, string> = {};

  // Map the data
  for (const mapping of mappings) {
    if (mapping.appField !== "ignore") {
      mappedData[mapping.appField] = row[mapping.csvColumn] || "";
    }
  }

  // Check for minimum required data
  // We need at least: symbol and (quantity or contracts)
  if (!mappedData.symbol || mappedData.symbol.trim() === "") {
    errors.push("Missing required field: Symbol/Contract");
  }

  if (!mappedData.entry_contracts || mappedData.entry_contracts.trim() === "") {
    errors.push("Missing required field: Quantity/Contracts");
  }

  // We need at least one price (entry or exit) or a P&L
  const hasEntryPrice = mappedData.entry_price && mappedData.entry_price.trim() !== "";
  const hasExitPrice = mappedData.exit_price && mappedData.exit_price.trim() !== "";
  const hasPnL = mappedData.pnl && mappedData.pnl.trim() !== "";

  if (!hasEntryPrice && !hasExitPrice && !hasPnL) {
    errors.push("Need at least one price (entry or exit) or P&L");
  }

  // We need at least one date
  const hasEntryDate = mappedData.entry_date && mappedData.entry_date.trim() !== "";
  const hasExitDate = mappedData.exit_date && mappedData.exit_date.trim() !== "";

  if (!hasEntryDate && !hasExitDate) {
    errors.push("Need at least one date (entry or exit)");
  }

  // Numeric validation - handles formats like: 123.45, $123.45, $(123.45), (123.45), -123.45
  const numericFields = ["entry_price", "exit_price", "entry_contracts", "exit_contracts", "stop_loss", "take_profit", "commission", "fees", "pnl"];
  for (const field of numericFields) {
    if (mappedData[field] && mappedData[field].trim() !== "") {
      // Remove $, commas, parentheses for parsing
      const cleaned = mappedData[field].replace(/[$,()]/g, "").trim();
      const value = parseFloat(cleaned);
      if (isNaN(value)) {
        errors.push(`Invalid number for ${field}: ${mappedData[field]}`);
      }
    }
  }

  // Side validation - only validate if a side column is explicitly mapped
  if (mappedData.side && mappedData.side.trim() !== "") {
    const side = mappedData.side.toLowerCase().trim();
    if (!["long", "short", "buy", "sell", "b", "s", "1", "-1"].includes(side)) {
      // Don't error, just ignore invalid side values - we can infer from prices
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: row,
    rowIndex,
  };
}

interface CommissionSettings {
  commission_per_contract: number;
  commission_per_trade: number;
}

function ImportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD format from journal
  const { selectedAccount, accounts, isLoading: accountsLoading } = useAccount();
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Set initial account when accounts load
  React.useEffect(() => {
    if (!accountsLoading && accounts.length > 0 && !selectedAccountId) {
      // Use the globally selected account, or find default, or use first account
      const defaultAccount = selectedAccount || accounts.find(a => a.is_default) || accounts[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [accountsLoading, accounts, selectedAccount, selectedAccountId]);
  const [broker, setBroker] = React.useState<string>("");
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedRow[]>([]);
  const [csvColumns, setCsvColumns] = React.useState<string[]>([]);
  const [mappings, setMappings] = React.useState<ColumnMapping[]>([]);
  const [validatedTrades, setValidatedTrades] = React.useState<ValidatedTrade[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [commissionSettings, setCommissionSettings] = React.useState<CommissionSettings>({
    commission_per_contract: 0,
    commission_per_trade: 0,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update commission settings when selected account changes
  React.useEffect(() => {
    // Get commission settings from the selected account
    if (selectedAccountId && accounts.length > 0) {
      const account = accounts.find(a => a.id === selectedAccountId);
      if (account) {
        setCommissionSettings({
          commission_per_contract: account.commission_per_contract || 0,
          commission_per_trade: account.commission_per_trade || 0,
        });
      }
    }
  }, [selectedAccountId, accounts]);

  // Parse the date filter for comparison
  const filterDate = React.useMemo(() => {
    if (!dateFilter) return null;
    try {
      return parseISO(dateFilter);
    } catch {
      return null;
    }
  }, [dateFilter]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx"))) {
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  };

  // Parse the CSV file
  const parseFile = (fileToparse: File) => {
    Papa.parse(fileToparse, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Trim whitespace from headers
      complete: (results) => {
        const data = results.data as ParsedRow[];
        const columns = results.meta.fields || [];

        if (columns.length === 0) {
          toast("No columns found in CSV. Please check the file format.");
          return;
        }

        if (data.length === 0) {
          toast("No data rows found in CSV. Please check the file format.");
          return;
        }

        setParsedData(data);
        setCsvColumns(columns);

        // Auto-detect mappings
        const autoMappings: ColumnMapping[] = columns.map(col => {
          const detected = autoDetectMapping(col);
          return {
            csvColumn: col,
            appField: detected,
          };
        });
        setMappings(autoMappings);

        // Move to next step
        setStep(2);

        toast(`Loaded ${data.length} rows from ${fileToparse.name}`);
      },
      error: (error) => {
        console.error("Parse error:", error);
        toast(`Error parsing file: ${error.message}`);
      },
    });
  };

  // Update a single mapping
  const updateMapping = (csvColumn: string, appField: string) => {
    setMappings(prev =>
      prev.map(m => m.csvColumn === csvColumn ? { ...m, appField } : m)
    );
  };

  // Helper to check if a trade matches the date filter
  const tradeMatchesDateFilter = (row: ParsedRow): boolean => {
    if (!filterDate) return true; // No filter, all trades match

    // Get the entry_date mapping
    const dateMapping = mappings.find(m => m.appField === "entry_date");
    if (!dateMapping) return false;

    const dateValue = row[dateMapping.csvColumn];
    if (!dateValue) return false;

    try {
      // Parse the date from the CSV
      const trimmed = dateValue.trim();
      let tradeDate: Date | null = null;

      // Try to parse MM/DD/YYYY HH:mm:ss format (Tradovate Performance)
      const tradovateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (tradovateMatch) {
        const [, month, day, year] = tradovateMatch;
        tradeDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Try ISO format
      if (!tradeDate) {
        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, year, month, day] = isoMatch;
          tradeDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }

      // Fallback to native parsing
      if (!tradeDate) {
        tradeDate = new Date(trimmed);
      }

      if (tradeDate && !isNaN(tradeDate.getTime())) {
        return isSameDay(tradeDate, filterDate);
      }
    } catch {
      return false;
    }

    return false;
  };

  // Validate all trades
  const validateAllTrades = () => {
    let validated = parsedData.map((row, index) => validateTrade(row, mappings, index));

    // If there's a date filter, mark trades that don't match as invalid
    if (filterDate) {
      validated = validated.map(trade => {
        if (!tradeMatchesDateFilter(trade.data)) {
          return {
            ...trade,
            isValid: false,
            errors: [...trade.errors, `Trade date does not match ${format(filterDate, "MMMM d, yyyy")}`],
          };
        }
        return trade;
      });
    }

    setValidatedTrades(validated);

    // Select all valid trades by default
    const validIndices = new Set(validated.filter(t => t.isValid).map(t => t.rowIndex));
    setSelectedRows(validIndices);

    setStep(3);
  };

  // Toggle row selection
  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Select all valid trades
  const selectAllValid = () => {
    const validIndices = new Set(validatedTrades.filter(t => t.isValid).map(t => t.rowIndex));
    setSelectedRows(validIndices);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  // Helper to get mapped value from a row
  const getMappedValue = (row: ParsedRow, fieldName: string): string => {
    const mapping = mappings.find(m => m.appField === fieldName);
    if (!mapping) return "";
    return row[mapping.csvColumn] || "";
  };

  // Helper to parse numeric value
  // Handles formats like: 123.45, $123.45, $(123.45) (negative), (123.45) (negative), -123.45
  const parseNumber = (value: string): number | null => {
    if (!value || value.trim() === "") return null;

    // Check if value is negative (wrapped in parentheses)
    const isNegative = value.includes("(") && value.includes(")");

    // Remove $, commas, parentheses, and whitespace
    const cleaned = value.replace(/[$,()]/g, "").trim();

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;

    // Apply negative sign if parentheses were present
    return isNegative ? -Math.abs(parsed) : parsed;
  };

  // Helper to parse date
  // Handles multiple formats including Tradovate's MM/DD/YYYY HH:mm:ss
  const parseDate = (value: string): string | null => {
    if (!value || value.trim() === "") return null;
    try {
      const trimmed = value.trim();

      // Try to parse MM/DD/YYYY HH:mm:ss format (Tradovate Performance)
      // Example: "01/22/2026 09:25:18"
      const tradovateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
      if (tradovateMatch) {
        const [, month, day, year, hours, minutes, seconds] = tradovateMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1, // months are 0-indexed
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Try to parse MM/DD/YYYY HH:mm format (without seconds)
      const noSecondsMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
      if (noSecondsMatch) {
        const [, month, day, year, hours, minutes] = noSecondsMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          0
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Try to parse YYYY-MM-DD HH:mm:ss format (ISO-like with space)
      const isoLikeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (isoLikeMatch) {
        const [, year, month, day, hours, minutes, seconds] = isoLikeMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Try to parse YYYY-MM-DDTHH:mm:ss format (ISO 8601)
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (isoMatch) {
        const [, year, month, day, hours, minutes, seconds] = isoMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Try MM/DD/YYYY only (date without time) - set time to market open (9:30 AM)
      const dateOnlyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dateOnlyMatch) {
        const [, month, day, year] = dateOnlyMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          9, 30, 0 // Default to market open
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Fallback to native Date parsing for ISO strings and other formats
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  };

  // Determine trade side from prices (for Tradovate Performance format)
  const determineSide = (row: ParsedRow): "long" | "short" => {
    // If we have explicit side mapped, use it
    const sideValue = getMappedValue(row, "side").toLowerCase().trim();
    if (["long", "buy", "b", "1"].includes(sideValue)) return "long";
    if (["short", "sell", "s", "-1"].includes(sideValue)) return "short";

    // For Tradovate Performance: if buyPrice < sellPrice, it was a long trade
    const buyPrice = parseNumber(getMappedValue(row, "entry_price"));
    const sellPrice = parseNumber(getMappedValue(row, "exit_price"));

    if (buyPrice !== null && sellPrice !== null) {
      return buyPrice < sellPrice ? "long" : "short";
    }

    // Default to long if we can't determine
    return "long";
  };

  // Perform the import
  const performImport = async () => {
    setIsImporting(true);
    setStep(4);

    const supabase = createClient();
    const tradesToImport = validatedTrades.filter(t => selectedRows.has(t.rowIndex));

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast("Please log in to import trades");
      setIsImporting(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < tradesToImport.length; i++) {
      const trade = tradesToImport[i];
      const row = trade.data;

      try {
        // Build the trade object
        // For Tradovate Performance exports:
        // - boughtTimestamp = when bought, soldTimestamp = when sold
        // - For LONG trades: bought first (entry), sold later (exit)
        // - For SHORT trades: sold first (entry), bought later (exit)
        // The side determination uses price comparison, then we swap dates accordingly

        let entryDate = parseDate(getMappedValue(row, "entry_date"));
        let exitDate = parseDate(getMappedValue(row, "exit_date"));
        const pnlValue = parseNumber(getMappedValue(row, "pnl"));

        let entryPrice = parseNumber(getMappedValue(row, "entry_price")) || 0;
        let exitPrice = parseNumber(getMappedValue(row, "exit_price"));
        const contracts = parseNumber(getMappedValue(row, "entry_contracts")) || 0;
        const stopLoss = parseNumber(getMappedValue(row, "stop_loss"));
        const side = determineSide(row);

        // For Tradovate Performance exports with short trades:
        // boughtTimestamp maps to entry_date and soldTimestamp maps to exit_date by default
        // But for shorts, we need to swap them because:
        // - Short entry = sell (soldTimestamp should be entry)
        // - Short exit = buy (boughtTimestamp should be exit)
        if (side === "short" && entryDate && exitDate) {
          // Swap the dates for short trades
          const tempDate = entryDate;
          entryDate = exitDate;
          exitDate = tempDate;

          // Also swap the prices - for shorts, sellPrice is entry, buyPrice is exit
          const tempPrice = entryPrice;
          entryPrice = exitPrice || 0;
          exitPrice = tempPrice;
        }

        // Calculate commission and fees
        // First check if the CSV has these values, otherwise use settings
        let csvCommission = parseNumber(getMappedValue(row, "commission"));
        let csvFees = parseNumber(getMappedValue(row, "fees"));

        // If no commission in CSV, calculate from settings
        // Round-trip: (per-contract * contracts * 2) + (per-trade * 2)
        // The *2 accounts for both entry and exit
        let commission: number;
        let fees: number;

        if (csvCommission !== null || csvFees !== null) {
          // Use CSV values if provided
          commission = csvCommission || 0;
          fees = csvFees || 0;
        } else {
          // Calculate from settings (round-trip costs)
          const perContractTotal = commissionSettings.commission_per_contract * contracts * 2;
          const perTradeTotal = commissionSettings.commission_per_trade * 2;
          commission = perContractTotal + perTradeTotal;
          fees = 0; // Fees calculated into commission
        }

        // Calculate net P&L (gross - fees)
        const grossPnl = pnlValue;
        const netPnl = grossPnl !== null ? grossPnl - commission - fees : null;

        // Calculate R-Multiple if we have stop loss
        let rMultiple: number | null = null;
        if (stopLoss && entryPrice && netPnl !== null && contracts > 0) {
          const riskPerContract = Math.abs(entryPrice - stopLoss);
          const totalRisk = riskPerContract * contracts;
          if (totalRisk > 0) {
            rMultiple = netPnl / totalRisk;
          }
        }

        const tradeData: TradeInsert = {
          user_id: user.id,
          account_id: selectedAccountId,
          symbol: normalizeSymbol(getMappedValue(row, "symbol")),
          side: side,
          status: "closed",
          entry_date: entryDate || exitDate || new Date().toISOString(),
          entry_price: entryPrice,
          entry_contracts: contracts,
          exit_date: exitDate,
          exit_price: exitPrice,
          exit_contracts: parseNumber(getMappedValue(row, "exit_contracts")),
          stop_loss: stopLoss,
          take_profit: parseNumber(getMappedValue(row, "take_profit")),
          commission: commission,
          fees: fees,
          gross_pnl: grossPnl,
          net_pnl: netPnl,
          r_multiple: rMultiple,
          notes: getMappedValue(row, "notes") || null,
          import_source: broker || "csv",
          external_id: getMappedValue(row, "order_id") || null,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("trades").insert(tradeData as any);

        if (error) {
          console.error("Error inserting trade:", error.message, error.code, error.details, error.hint);
          errorCount++;
          // Show first error to user
          if (errorCount === 1) {
            toast(`Error: ${error.message || "Failed to insert trade. Check if database tables exist."}`);
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error("Exception inserting trade:", err);
        errorCount++;
      }

      setImportProgress(Math.round(((i + 1) / tradesToImport.length) * 100));
    }

    setIsImporting(false);

    if (errorCount > 0) {
      toast(`Imported ${successCount} trades. ${errorCount} failed.`);
    } else {
      toast(`Successfully imported ${successCount} trades!`);
    }
  };

  // Get summary stats
  const validCount = validatedTrades.filter(t => t.isValid).length;
  const invalidCount = validatedTrades.filter(t => !t.isValid).length;
  const selectedCount = selectedRows.size;

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Trades</h1>
          <p className="text-muted-foreground mt-2">
            Import your trading history from a CSV file
          </p>
        </div>

      </div>

      {/* Date Filter Notice */}
      {filterDate && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <AlertTitle>Importing for {format(filterDate, "MMMM d, yyyy")}</AlertTitle>
          <AlertDescription>
            Only trades from this date will be available for import. Trades from other dates will be marked as invalid.
            <Button
              variant="link"
              className="p-0 h-auto ml-1 text-blue-500"
              onClick={() => router.push("/import")}
            >
              Remove filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold",
                    step >= s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                <span className={cn(
                  "ml-2 text-sm font-medium",
                  step >= s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === 1 && "Upload"}
                  {s === 2 && "Map Columns"}
                  {s === 3 && "Review"}
                  {s === 4 && "Import"}
                </span>
              </div>
              {s < 4 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-4",
                  step > s ? "bg-primary" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Trade File</CardTitle>
            <CardDescription>
              Select your broker and upload a CSV file with your trading history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Broker & Account Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Broker (Optional)</label>
                <Select value={broker} onValueChange={setBroker}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your broker" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_BROKERS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecting your broker helps us auto-detect column mappings
                </p>
              </div>

              {accounts.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Import to Account
                  </label>
                  <Select
                    value={selectedAccountId || ""}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.is_default && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    All imported trades will be assigned to this account
                  </p>
                </div>
              )}
            </div>

            {/* Tradovate Import Instructions */}
            {broker === "tradovate" && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium">How to Export from Tradovate</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Follow these steps to export your trade history from Tradovate:
                      </p>
                    </div>
                    <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                      <li>Log in to the <a href="https://trader.tradovate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Tradovate web platform <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Click on the <strong className="text-foreground">Performance</strong> tab in the top navigation</li>
                      <li>Select your desired date range using the date picker</li>
                      <li>Click <strong className="text-foreground">Download CSV</strong></li>
                      <li>Upload the downloaded CSV file here</li>
                    </ol>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Tip:</strong> The Performance export includes entry/exit prices, timestamps, P&L, and contract details which will be automatically mapped.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                "hover:border-primary hover:bg-muted/50",
                file && "border-primary bg-muted/30"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setParsedData([]);
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports CSV and XLSX files
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Your Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to the corresponding fields in the app.
              We&apos;ve auto-detected some mappings for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Preview of first few rows */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Data Preview (first 3 rows)</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvColumns.map((col) => (
                          <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {csvColumns.map((col) => (
                            <TableCell key={col} className="whitespace-nowrap">
                              {row[col]?.substring(0, 30) || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Column Mappings */}
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-4 font-medium text-sm">
                  <div>CSV Column</div>
                  <div>Map To</div>
                </div>
                {mappings.map((mapping) => (
                  <div key={mapping.csvColumn} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-mono bg-muted px-3 py-2 rounded">
                      {mapping.csvColumn}
                    </div>
                    <Select
                      value={mapping.appField}
                      onValueChange={(value) => updateMapping(mapping.csvColumn, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Required fields note */}
              <p className="text-sm text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={validateAllTrades}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Select Trades</CardTitle>
            <CardDescription>
              Review the validated trades and select which ones to import
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{parsedData.length}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
            </div>

            {/* Selection controls */}
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" onClick={selectAllValid}>
                Select All Valid ({validCount})
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                {selectedCount} trades selected for import
              </div>
            </div>

            {/* Trades Table */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry Date</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedTrades.map((trade) => {
                    const symbolMapping = mappings.find(m => m.appField === "symbol");
                    const sideMapping = mappings.find(m => m.appField === "side");
                    const dateMapping = mappings.find(m => m.appField === "entry_date");
                    const priceMapping = mappings.find(m => m.appField === "entry_price");
                    const contractsMapping = mappings.find(m => m.appField === "entry_contracts");

                    return (
                      <TableRow
                        key={trade.rowIndex}
                        className={cn(!trade.isValid && "bg-red-500/5")}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(trade.rowIndex)}
                            onCheckedChange={() => toggleRowSelection(trade.rowIndex)}
                            disabled={!trade.isValid}
                          />
                        </TableCell>
                        <TableCell>
                          {trade.isValid ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{symbolMapping ? trade.data[symbolMapping.csvColumn] : "-"}</TableCell>
                        <TableCell>{sideMapping ? trade.data[sideMapping.csvColumn] : "-"}</TableCell>
                        <TableCell>{dateMapping ? trade.data[dateMapping.csvColumn] : "-"}</TableCell>
                        <TableCell>{priceMapping ? trade.data[priceMapping.csvColumn] : "-"}</TableCell>
                        <TableCell>{contractsMapping ? trade.data[contractsMapping.csvColumn] : "-"}</TableCell>
                        <TableCell>
                          {trade.errors.length > 0 && (
                            <span className="text-sm text-destructive">
                              {trade.errors[0]}
                              {trade.errors.length > 1 && ` (+${trade.errors.length - 1})`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={performImport}
                disabled={selectedCount === 0}
              >
                Import {selectedCount} Trades
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Progress */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isImporting ? "Importing Trades..." : "Import Complete!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={importProgress} className="h-3" />
            <p className="text-center text-lg">
              {isImporting
                ? `Importing... ${importProgress}%`
                : `Successfully imported ${selectedCount} trades!`
              }
            </p>

            {!isImporting && (
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => {
                  setStep(1);
                  setFile(null);
                  setParsedData([]);
                  setMappings([]);
                  setValidatedTrades([]);
                  setSelectedRows(new Set());
                  setImportProgress(0);
                }}>
                  Import More
                </Button>
                <Button onClick={() => router.push(dateFilter ? `/journal?date=${dateFilter}` : "/trades")}>
                  {dateFilter ? "Back to Journal" : "View Trades"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-6xl py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading import...</p>
          </div>
        </div>
      </div>
    }>
      <ImportPageContent />
    </Suspense>
  );
}
