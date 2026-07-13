-- =========================================================
-- Skikda Road Reports — Supabase backend schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =========================================================

-- 1. Create the reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  issue_type text not null,
  location text not null,
  description text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS)
-- Supabase blocks ALL access by default until policies are added.
alter table public.reports enable row level security;

-- 3. Allow anyone (anon/public key) to INSERT a new report
create policy "Public can insert reports"
on public.reports
for insert
to anon
with check (true);

-- 4. Allow anyone (anon/public key) to READ reports
-- (Needed for the "latest reports" table + stats on your site)
create policy "Public can read reports"
on public.reports
for select
to anon
using (true);

-- NOTE: There is intentionally NO update/delete policy for "anon".
-- This means visitors can submit and view reports, but cannot edit
-- or delete anything — only you can do that from the Supabase
-- dashboard (or by adding an authenticated admin policy later).

-- 5. Helpful index for sorting by newest first (matches your frontend query)
create index if not exists reports_created_at_idx
on public.reports (created_at desc);
