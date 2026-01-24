"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, FilterX, Search } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Calendar,
  Badge,
  cn,
} from "@/components/ui";
import { DEFAULT_FUTURES_INSTRUMENTS, SESSION_LABELS } from "@/lib/constants";
import { Session } from "@/types/trade";

export interface TradeFiltersState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  symbol: string;
  side: string;
  setup: string;
  status: string;
  search: string;
}

interface TradeFiltersProps {
  filters: TradeFiltersState;
  onFiltersChange: (filters: TradeFiltersState) => void;
  setups?: { id: string; name: string }[];
}

export function TradeFilters({
  filters,
  onFiltersChange,
  setups = [],
}: TradeFiltersProps) {
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.symbol) count++;
    if (filters.side) count++;
    if (filters.setup) count++;
    if (filters.status) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const handleFilterChange = (key: keyof TradeFiltersState, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: undefined,
      dateTo: undefined,
      symbol: "",
      side: "",
      setup: "",
      status: "",
      search: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and quick filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trades..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <FilterX className="mr-2 h-4 w-4" />
            Clear filters
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-3">
        {/* Date From */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom
                  ? format(filters.dateFrom, "MMM d, yyyy")
                  : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => handleFilterChange("dateFrom", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo
                  ? format(filters.dateTo, "MMM d, yyyy")
                  : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => handleFilterChange("dateTo", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Symbol */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Symbol</Label>
          <Select
            value={filters.symbol}
            onValueChange={(value) =>
              handleFilterChange("symbol", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All symbols" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All symbols</SelectItem>
              {DEFAULT_FUTURES_INSTRUMENTS.map((instrument) => (
                <SelectItem key={instrument.symbol} value={instrument.symbol}>
                  {instrument.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Side */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Side</Label>
          <Select
            value={filters.side}
            onValueChange={(value) =>
              handleFilterChange("side", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="All sides" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sides</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Setup */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Setup</Label>
          <Select
            value={filters.setup}
            onValueChange={(value) =>
              handleFilterChange("setup", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All setups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All setups</SelectItem>
              {setups.map((setup) => (
                <SelectItem key={setup.id} value={setup.id}>
                  {setup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              handleFilterChange("status", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Export session labels for use in other components
export { SESSION_LABELS };
