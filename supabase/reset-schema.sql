-- Reset and recreate schema (USE WITH CAUTION - this drops all data!)
-- Only run this if you want to start fresh

-- Drop all existing policies first
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Drop all tables
DROP TABLE IF EXISTS import_history CASCADE;
DROP TABLE IF EXISTS daily_risk_snapshots CASCADE;
DROP TABLE IF EXISTS daily_journals CASCADE;
DROP TABLE IF EXISTS trade_screenshots CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS setups CASCADE;
DROP TABLE IF EXISTS instruments CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Now run the main schema.sql
