-- Add trading settings to accounts table for multi-account support
-- These settings are per-account instead of being global at the profile level

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS prop_firm VARCHAR(50) DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS commission_per_contract DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_per_trade DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_risk_per_trade DECIMAL(5, 2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_loss_limit DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weekly_loss_limit DECIMAL(12, 2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN accounts.prop_firm IS 'Selected prop firm ID for pre-configured commission rates (e.g., topstep, apex, custom)';
COMMENT ON COLUMN accounts.commission_per_contract IS 'Commission per contract per side for fee calculation during import';
COMMENT ON COLUMN accounts.commission_per_trade IS 'Flat fee per trade per side for fee calculation during import';
COMMENT ON COLUMN accounts.default_risk_per_trade IS 'Default risk percentage per trade for this account';
COMMENT ON COLUMN accounts.daily_loss_limit IS 'Maximum allowed daily loss for this account';
COMMENT ON COLUMN accounts.weekly_loss_limit IS 'Maximum allowed weekly loss for this account';
