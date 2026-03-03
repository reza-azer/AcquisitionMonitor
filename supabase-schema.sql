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

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write (adjust for production with proper auth)
-- For now, allowing full access for development purposes

CREATE POLICY "Allow full access to teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to acquisitions" ON acquisitions FOR ALL USING (true) WITH CHECK (true);
