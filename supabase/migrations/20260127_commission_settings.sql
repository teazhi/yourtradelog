-- Add commission settings to profiles table
-- These are used to automatically calculate fees when importing trades

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS prop_firm VARCHAR(50) DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS commission_per_contract DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_per_trade DECIMAL(10, 4) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN profiles.prop_firm IS 'Selected prop firm ID for pre-configured commission rates (e.g., topstep, apex, custom)';
COMMENT ON COLUMN profiles.commission_per_contract IS 'Commission per contract per side for fee calculation during import (e.g., $2.52 for Topstep)';
COMMENT ON COLUMN profiles.commission_per_trade IS 'Flat fee per trade per side for fee calculation during import';
