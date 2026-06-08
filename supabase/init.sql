-- Supabase migration script for World Cup Predictor storage
-- Run this in Supabase SQL editor or via psql.

create table if not exists app_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_store_key on app_store(key);
