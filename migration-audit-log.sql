-- Migration: Create Audit Log Table for Acquisition Changes
-- Run this in Supabase SQL Editor to create the audit logging table

-- Create acquisition_audit_log table
CREATE TABLE acquisition_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  date DATE NOT NULL,
  product_key TEXT NOT NULL,
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX idx_audit_log_member ON acquisition_audit_log(member_id);
CREATE INDEX idx_audit_log_date ON acquisition_audit_log(date);
CREATE INDEX idx_audit_log_changed_at ON acquisition_audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_member_date ON acquisition_audit_log(member_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE acquisition_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write (adjust for production with proper auth)
CREATE POLICY "Allow full access to acquisition_audit_log" ON acquisition_audit_log FOR ALL USING (true) WITH CHECK (true);

-- Optional: Create a view for easy querying of recent changes
CREATE OR REPLACE VIEW recent_audit_logs AS
SELECT 
  l.id,
  l.member_id,
  l.member_name,
  l.date,
  l.product_key,
  p.product_name,
  l.old_quantity,
  l.new_quantity,
  l.changed_at,
  CASE 
    WHEN l.new_quantity > l.old_quantity THEN 'increase'
    WHEN l.new_quantity < l.old_quantity THEN 'decrease'
    ELSE 'unchanged'
  END as change_type
FROM acquisition_audit_log l
LEFT JOIN products p ON l.product_key = p.product_key
ORDER BY l.changed_at DESC
LIMIT 100;

-- Note: This table stores audit logs locally in the database
-- The UI also stores logs in localStorage for faster access
-- Periodic sync between localStorage and DB can be implemented later
