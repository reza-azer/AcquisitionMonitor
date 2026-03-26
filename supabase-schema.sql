-- Supabase Database Schema for Acquisition Monitor
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  accent_color TEXT DEFAULT '#003d79',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Members table
CREATE TABLE members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Acquisitions table (stores weekly acquisition data)
CREATE TABLE acquisitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 4),
  product_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(member_id, week, product_key)
);

-- Create index for faster queries
CREATE INDEX idx_acquisitions_member_week ON acquisitions(member_id, week);
CREATE INDEX idx_acquisitions_week ON acquisitions(week);
CREATE INDEX idx_members_team ON members(team_id);

-- Attendances table (daily attendance records)
CREATE TABLE attendances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'leave', 'alpha')),
  leave_reason TEXT,  -- sick, family_affairs, annual_leave, others
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(member_id, date)
);

CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_member ON attendances(member_id);
CREATE INDEX idx_attendances_member_date ON attendances(member_id, date);

-- Products table (product configuration for acquisitions)
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_key TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('FUNDING', 'TRANSACTION', 'CREDIT')),
  unit TEXT NOT NULL,
  weekly_target INTEGER NOT NULL DEFAULT 0,
  is_tiered BOOLEAN NOT NULL DEFAULT false,
  tier_config JSONB,  -- [{limit: number, points: number}, ...] for tiered products
  flat_points INTEGER DEFAULT 0,  -- for non-tiered products
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- Backup History table (tracks backup/export operations)
CREATE TABLE backup_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'partial')),
  tables_included TEXT[] NOT NULL,
  record_count INTEGER NOT NULL,
  file_size_kb INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_backup_history_created ON backup_history(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write (adjust for production with proper auth)
-- For now, allowing full access for development purposes

CREATE POLICY "Allow full access to teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to acquisitions" ON acquisitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to attendances" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to backup_history" ON backup_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SUPABASE STORAGE SETUP
-- ============================================
-- Run the following in Supabase Dashboard > Storage
-- Or use the SQL editor to create the bucket

-- 1. Create Storage Bucket (run in SQL editor or create via Dashboard)
-- Note: Bucket creation via SQL requires superuser access
-- Alternative: Create via Dashboard > Storage > New bucket

-- Bucket name: avatars
-- Public: true
-- File size limit: 5242880 (5MB)

-- 2. Storage Policies (after creating the bucket)
-- These policies allow public read/write access to the avatars bucket

-- Allow public read access
CREATE POLICY "Public Access - Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow public upload
CREATE POLICY "Public Upload - Avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

-- Allow public update
CREATE POLICY "Public Update - Avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars');

-- Allow public delete
CREATE POLICY "Public Delete - Avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars');

-- 3. Optional: Create bucket via SQL (requires superuser)
-- Uncomment and run if you have superuser access:
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
*/

-- 4. Optional: Auto-cleanup trigger for orphaned files
-- This deletes storage files when team/member is deleted
/*
CREATE OR REPLACE FUNCTION delete_team_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.image_url IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
    AND (OLD.image_url LIKE '%' || name || '%');
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_team_delete
AFTER DELETE ON teams
FOR EACH ROW EXECUTE FUNCTION delete_team_avatar();

CREATE OR REPLACE FUNCTION delete_member_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
    AND (OLD.avatar_url LIKE '%' || name || '%');
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_member_delete
AFTER DELETE ON members
FOR EACH ROW EXECUTE FUNCTION delete_member_avatar();
*/
