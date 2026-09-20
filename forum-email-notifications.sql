-- Forum email subscriptions and duplicate-send protection.
-- Safe to run repeatedly in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists forum_email_notifications boolean not null default true;

create table if not exists public.forum_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('topic','reply')),
  event_id uuid not null,
  created_at timestamptz not null default now(),
  unique(event_type, event_id)
);

alter table public.forum_notification_events enable row level security;

