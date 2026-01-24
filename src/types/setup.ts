/**
 * Setup/strategy types for the futures trading journal app.
 */

import { Timeframe } from './trade';

// ============================================================================
// Setup Types
// ============================================================================

export interface SetupConfig {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: SetupRules | null;
  timeframes: Timeframe[];
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetupRules {
  entry_rules: string[];
  exit_rules: string[];
  stop_loss_rules: string[];
  take_profit_rules: string[];
  additional_notes: string | null;
}

export interface SetupFormData {
  name: string;
  description: string | null;
  rules: SetupRules | null;
  timeframes: Timeframe[];
  color: string | null;
  is_active: boolean;
}

// ============================================================================
// Setup Display Types
// ============================================================================

export interface SetupWithStats {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  timeframes: Timeframe[];
  is_active: boolean;
  // Statistics
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  profit_factor: number;
  average_r_multiple: number;
  last_used: string | null;
}

export interface SetupSummary {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
}

// ============================================================================
// Setup Categories
// ============================================================================

export enum SetupCategory {
  Trend = 'trend',
  Reversal = 'reversal',
  Breakout = 'breakout',
  RangeTrading = 'range_trading',
  Momentum = 'momentum',
  MeanReversion = 'mean_reversion',
  Scalping = 'scalping',
  Swing = 'swing',
  News = 'news',
  Custom = 'custom',
}

export interface SetupTemplate {
  name: string;
  category: SetupCategory;
  description: string;
  default_rules: SetupRules;
  recommended_timeframes: Timeframe[];
  recommended_instruments: string[];
}

// ============================================================================
// Setup Presets
// ============================================================================

export const SETUP_TEMPLATES: SetupTemplate[] = [
  {
    name: 'Opening Range Breakout',
    category: SetupCategory.Breakout,
    description: 'Trade breakouts from the opening range (first 15-30 minutes)',
    default_rules: {
      entry_rules: [
        'Wait for opening range to form (first 15-30 minutes)',
        'Enter on break above/below the range with volume confirmation',
        'Confirm direction aligns with pre-market bias',
      ],
      exit_rules: [
        'Exit at predetermined target (1.5-2x range size)',
        'Exit if price reverses back into range',
        'Trail stop once in profit',
      ],
      stop_loss_rules: [
        'Initial stop at opposite side of range',
        'Move to breakeven after 1R profit',
      ],
      take_profit_rules: [
        'First target: 1x range size',
        'Second target: 2x range size',
        'Runner with trailing stop',
      ],
      additional_notes:
        'Best used on trending days. Avoid on FOMC and major news days.',
    },
    recommended_timeframes: [Timeframe.M5, Timeframe.M15],
    recommended_instruments: ['ES', 'NQ'],
  },
  {
    name: 'VWAP Bounce',
    category: SetupCategory.MeanReversion,
    description: 'Trade bounces off the Volume Weighted Average Price',
    default_rules: {
      entry_rules: [
        'Wait for price to touch VWAP',
        'Look for rejection candle (hammer, doji)',
        'Enter on confirmation candle in direction of bounce',
      ],
      exit_rules: [
        'Exit at previous swing high/low',
        'Exit if price closes through VWAP',
      ],
      stop_loss_rules: [
        'Stop 2-4 ticks beyond VWAP',
        'Adjust based on recent volatility',
      ],
      take_profit_rules: [
        'Target previous swing level',
        'Partial at 1:1, remainder at 2:1',
      ],
      additional_notes: 'Works best in ranging/choppy markets.',
    },
    recommended_timeframes: [Timeframe.M1, Timeframe.M5],
    recommended_instruments: ['ES', 'NQ', 'RTY'],
  },
  {
    name: 'Trend Pullback',
    category: SetupCategory.Trend,
    description: 'Enter on pullbacks in the direction of the trend',
    default_rules: {
      entry_rules: [
        'Identify clear trend on higher timeframe',
        'Wait for pullback to key level (EMA, previous support/resistance)',
        'Enter on reversal pattern at pullback level',
      ],
      exit_rules: [
        'Exit at previous swing high/low',
        'Exit if trend structure breaks',
      ],
      stop_loss_rules: [
        'Stop beyond pullback low/high',
        'Use ATR-based stop for volatility adjustment',
      ],
      take_profit_rules: [
        'First target: Previous swing',
        'Second target: Extension of prior move',
      ],
      additional_notes: 'Patience is key - wait for quality pullbacks.',
    },
    recommended_timeframes: [Timeframe.M5, Timeframe.M15, Timeframe.H1],
    recommended_instruments: ['ES', 'NQ', 'CL'],
  },
  {
    name: 'Gap Fill',
    category: SetupCategory.MeanReversion,
    description: 'Trade the filling of overnight gaps',
    default_rules: {
      entry_rules: [
        'Identify significant overnight gap (> 0.5%)',
        'Wait for market open and initial move',
        'Enter on reversal signal toward gap fill',
      ],
      exit_rules: [
        'Exit at gap fill level',
        'Exit if momentum continues away from gap',
      ],
      stop_loss_rules: ['Stop beyond opening range or gap extension'],
      take_profit_rules: [
        'Primary target: Full gap fill',
        'Secondary target: Halfway fill for partial',
      ],
      additional_notes:
        'Not all gaps fill same day. Use with overall market context.',
    },
    recommended_timeframes: [Timeframe.M5, Timeframe.M15],
    recommended_instruments: ['ES', 'NQ'],
  },
  {
    name: 'Failed Breakout',
    category: SetupCategory.Reversal,
    description: 'Trade the reversal after a failed breakout attempt',
    default_rules: {
      entry_rules: [
        'Identify key support/resistance level',
        'Wait for breakout attempt that fails (quick reversal)',
        'Enter on confirmation of failure (close back inside range)',
      ],
      exit_rules: [
        'Exit at opposite side of range',
        'Exit if breakout resumes with conviction',
      ],
      stop_loss_rules: ['Stop beyond failed breakout high/low'],
      take_profit_rules: [
        'Target opposite side of range',
        'Trail stop once in profit',
      ],
      additional_notes: 'Look for volume divergence on the failed breakout.',
    },
    recommended_timeframes: [Timeframe.M5, Timeframe.M15],
    recommended_instruments: ['ES', 'NQ', 'RTY'],
  },
];

// ============================================================================
// Setup Colors
// ============================================================================

export const SETUP_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Cyan', value: '#06B6D4' },
];

// ============================================================================
// Setup Validation
// ============================================================================

export interface SetupValidation {
  isValid: boolean;
  errors: SetupValidationError[];
}

export interface SetupValidationError {
  field: keyof SetupFormData | 'rules';
  message: string;
}

export function validateSetup(data: SetupFormData): SetupValidation {
  const errors: SetupValidationError[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Setup name is required' });
  }

  if (data.name && data.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Setup name must be 100 characters or less',
    });
  }

  if (data.description && data.description.length > 1000) {
    errors.push({
      field: 'description',
      message: 'Description must be 1000 characters or less',
    });
  }

  if (data.timeframes.length === 0) {
    errors.push({
      field: 'timeframes',
      message: 'At least one timeframe is required',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
