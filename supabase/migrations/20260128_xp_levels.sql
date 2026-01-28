-- Add XP and Level tracking to profiles
-- This migration adds fields for the gamification/leveling system

-- Add total_xp column to track cumulative XP earned
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- Add current_level column to track the user's level
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Add trader_title column to store the display title
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trader_title TEXT DEFAULT 'Rookie';

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_level ON profiles(current_level DESC);
