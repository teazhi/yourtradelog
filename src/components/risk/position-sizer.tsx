"use client";

import * as React from "react";
import { Calculator, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";

interface PositionSizerProps {
  defaultAccountSize?: number;
  defaultRiskPercent?: number;
  defaultTickValue?: number;
}

export function PositionSizer({
  defaultAccountSize = 50000,
  defaultRiskPercent = 1,
  defaultTickValue = 12.5,
}: PositionSizerProps) {
  const [accountSize, setAccountSize] = React.useState(defaultAccountSize);
  const [riskPercent, setRiskPercent] = React.useState(defaultRiskPercent);
  const [stopTicks, setStopTicks] = React.useState(8);
  const [tickValue, setTickValue] = React.useState(defaultTickValue);

  // Calculate position size
  const dollarRisk = (accountSize * riskPercent) / 100;
  const riskPerContract = stopTicks * tickValue;
  const contracts =
    riskPerContract > 0 ? Math.floor(dollarRisk / riskPerContract) : 0;
  const actualRisk = contracts * riskPerContract;
  const actualRiskPercent =
    accountSize > 0 ? (actualRisk / accountSize) * 100 : 0;

  const isOverRisk = actualRiskPercent > riskPercent;
  const hasNoPosition = contracts === 0 && dollarRisk > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Position Size Calculator
        </CardTitle>
        <CardDescription>
          Calculate the number of contracts based on your risk parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountSize">Account Size ($)</Label>
            <Input
              id="accountSize"
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
              min={0}
              step={1000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="riskPercent">Risk Per Trade (%)</Label>
            <Input
              id="riskPercent"
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              min={0}
              max={100}
              step={0.25}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stopTicks">Stop Distance (Ticks)</Label>
            <Input
              id="stopTicks"
              type="number"
              value={stopTicks}
              onChange={(e) => setStopTicks(Number(e.target.value))}
              min={1}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tickValue">Tick Value ($)</Label>
            <Input
              id="tickValue"
              type="number"
              value={tickValue}
              onChange={(e) => setTickValue(Number(e.target.value))}
              min={0}
              step={0.25}
            />
          </div>
        </div>

        {/* Results */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Contracts</p>
              <p className="text-3xl font-bold text-primary">{contracts}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Dollar Risk</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(actualRisk)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Actual Risk %</p>
              <p className="text-2xl font-semibold">
                {actualRiskPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Max Dollar Risk ({riskPercent}% of account)</span>
            <span className="font-medium">{formatCurrency(dollarRisk)}</span>
          </div>
          <div className="flex justify-between">
            <span>Risk Per Contract ({stopTicks} ticks x {formatCurrency(tickValue)})</span>
            <span className="font-medium">{formatCurrency(riskPerContract)}</span>
          </div>
          <div className="flex justify-between">
            <span>Potential Loss (if stopped out)</span>
            <span className="font-medium text-red-500">
              -{formatCurrency(actualRisk)}
            </span>
          </div>
        </div>

        {/* Warnings */}
        {hasNoPosition && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Risk per contract ({formatCurrency(riskPerContract)}) exceeds your
              max risk ({formatCurrency(dollarRisk)}). Consider reducing your
              stop distance or increasing your risk allocation.
            </AlertDescription>
          </Alert>
        )}

        {isOverRisk && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Actual risk ({actualRiskPercent.toFixed(2)}%) is slightly different
              from target ({riskPercent}%) due to contract rounding.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
