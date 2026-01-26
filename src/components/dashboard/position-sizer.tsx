"use client";

import * as React from "react";
import { Calculator, ChevronDown, ChevronUp, DollarSign, Percent, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  cn,
} from "@/components/ui";

interface PositionSizerProps {
  defaultAccountSize?: number;
}

export function PositionSizer({ defaultAccountSize = 10000 }: PositionSizerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [accountSize, setAccountSize] = React.useState(defaultAccountSize);
  const [riskPercent, setRiskPercent] = React.useState(1);
  const [entryPrice, setEntryPrice] = React.useState<number | "">("");
  const [stopLoss, setStopLoss] = React.useState<number | "">("");

  const riskAmount = accountSize * (riskPercent / 100);

  const calculatePosition = () => {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) return null;

    const riskPerShare = Math.abs(Number(entryPrice) - Number(stopLoss));
    const shares = Math.floor(riskAmount / riskPerShare);
    const positionValue = shares * Number(entryPrice);

    return {
      shares,
      positionValue,
      riskPerShare,
      totalRisk: shares * riskPerShare,
    };
  };

  const position = calculatePosition();

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Position Sizer</CardTitle>
              <CardDescription className="text-xs">
                Calculate position size based on risk
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Input Section */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="account" className="text-xs">Account Size</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="account"
                      type="number"
                      value={accountSize}
                      onChange={(e) => setAccountSize(Number(e.target.value) || 0)}
                      className="pl-7 h-8 text-sm"
                      placeholder="10000"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="risk" className="text-xs">Risk % <span className="text-muted-foreground">(${riskAmount.toFixed(0)})</span></Label>
                  <div className="relative">
                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="risk"
                      type="number"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
                      className="pl-7 h-8 text-sm"
                      placeholder="1"
                      step="0.5"
                      min="0.1"
                      max="10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="entry" className="text-xs">Entry Price</Label>
                  <Input
                    id="entry"
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0.00"
                    step="0.01"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stop" className="text-xs">Stop Loss</Label>
                  <Input
                    id="stop"
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0.00"
                    step="0.01"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Result
              </h4>

              {position ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Shares:</span>
                    <span className="font-semibold text-green-600">
                      {position.shares.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Position:</span>
                    <span className="font-medium text-sm">
                      ${position.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-1.5">
                    <span className="text-xs text-muted-foreground">Total Risk:</span>
                    <span className="font-medium text-red-600">
                      ${position.totalRisk.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-xs py-2">
                  Enter entry price and stop loss
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
