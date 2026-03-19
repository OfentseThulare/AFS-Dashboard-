-- Run this in your Supabase SQL Editor to create the required tables

-- Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "teamName" text NOT NULL,
  "managerName" text NOT NULL,
  "managerEmail" text NOT NULL,
  "managerPhone" text,
  "numPlayers" text,
  "homeGround" text,
  "notes" text,
  "status" text DEFAULT 'Pending Payment',
  "pf_payment_id" text,
  "date" timestamp with time zone DEFAULT now()
);

-- Migration for existing tables: ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS "pf_payment_id" text;

-- Note: The frontend uses camelCase for properties, so we maintain quotes in SQL creation to prevent Postgres from lowercasing them automatically.

-- Players Table
CREATE TABLE IF NOT EXISTS public.players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "dob" text,
  "age" integer,
  "gender" text,
  "nationality" text,
  "idNumber" text,
  "email" text NOT NULL,
  "phone" text,
  "emergencyName" text,
  "emergencyPhone" text,
  "team" text,
  "offPos" text,
  "defPos" text,
  "medical" text,
  "photo" text,
  "status" text DEFAULT 'Registered',
  "date" timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- PUBLIC POLICIES: Allow anonymous users to register (insert only, no read)
-- Public users can submit registrations but cannot view other registrations
CREATE POLICY "Allow public insert to teams"
  ON public.teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public insert to players"
  ON public.players FOR INSERT
  WITH CHECK (true);

-- AUTHENTICATED POLICIES: Only signed-in admin users can read/update/delete
CREATE POLICY "Allow authenticated read on teams"
  ON public.teams FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on teams"
  ON public.teams FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on teams"
  ON public.teams FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on players"
  ON public.players FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on players"
  ON public.players FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on players"
  ON public.players FOR DELETE
  USING (auth.role() = 'authenticated');

-- IMPORTANT: After running this schema, create an admin user in Supabase Dashboard:
-- Go to Authentication > Users > Add User
-- Set email (e.g. admin@ffsa.co.za) and a strong password
-- This user will be the only one who can access the admin dashboard and view registrations

-- ========================================
-- Storage Bucket for Player Photos
-- ========================================
-- Run this in Supabase SQL Editor to create the storage bucket and policies.
-- Player photos are uploaded to 'player-uploads' bucket instead of being stored as base64 in rows.

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-uploads', 'player-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous users to upload player photos
CREATE POLICY "Allow public upload to player-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-uploads');

-- Allow public read access to player photos
CREATE POLICY "Allow public read on player-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-uploads');

-- Allow authenticated users to delete photos
CREATE POLICY "Allow authenticated delete on player-uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'player-uploads' AND auth.role() = 'authenticated');

