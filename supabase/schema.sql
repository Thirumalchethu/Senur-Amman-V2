-- Run this once in your Supabase project's SQL Editor.
-- Creates tables, auto-profile-on-signup, and row-level security
-- so only accounts with role = 'admin' can record transactions.

create extension if not exists "pgcrypto";

-- One row per signed-up user, tracks their access level.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now()
);

-- Auto-create a profile (default role: viewer) whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Single-row table holding the temple name shown at the top of the dashboard.
create table if not exists public.settings (
  id int primary key default 1,
  name text not null default 'My Temple Trust',
  tagline text not null default 'Hundi & Seva Contributions',
  upi_id text not null default '9787912157@ybl'
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
alter table public.settings add column if not exists upi_id text not null default '9787912157@ybl';

-- Deposits and withdrawals.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Deposit', 'Withdrawal')),
  donor_name text not null,
  donor_phone text,
  amount numeric not null check (amount > 0),
  mode text not null,
  purpose text,
  recorded_by text,
  txn_date date not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  bill_url text,
  bill_closed boolean not null default false
);
alter table public.transactions add column if not exists bill_url text;
alter table public.transactions add column if not exists bill_closed boolean not null default false;
alter table public.transactions add column if not exists public_recognition boolean not null default false;

-- Feedback & suggestions box.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  message text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- People who've opted in to receive the monthly contribution summary email.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.transactions enable row level security;
alter table public.feedback enable row level security;

-- profiles: everyone can read their own row; admins can read everyone's.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- settings: any signed-in user can read; only admins can update.
drop policy if exists "auth read settings" on public.settings;
create policy "auth read settings" on public.settings
  for select using (auth.role() = 'authenticated');

-- The public /donate page has no logged-in user, so it also needs read access
-- to the temple name and UPI ID. Nothing in this table is sensitive.
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings
  for select using (true);

drop policy if exists "admin update settings" on public.settings;
create policy "admin update settings" on public.settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- transactions: any signed-in user can read; ONLY admins can insert.
drop policy if exists "auth read transactions" on public.transactions;
create policy "auth read transactions" on public.transactions
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin insert transactions" on public.transactions;
create policy "admin insert transactions" on public.transactions
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admins can update a transaction — used for attaching a bill_url after
-- uploading proof of a withdrawal, or marking one closed without a bill.
drop policy if exists "admin update transactions" on public.transactions;
create policy "admin update transactions" on public.transactions
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- feedback: any signed-in user can read and submit.
drop policy if exists "auth read feedback" on public.feedback;
create policy "auth read feedback" on public.feedback
  for select using (auth.role() = 'authenticated');

drop policy if exists "auth insert feedback" on public.feedback;
create policy "auth insert feedback" on public.feedback
  for insert with check (auth.role() = 'authenticated');

-- subscribers: anyone (including anonymous donors on /donate) can sign up.
-- Only admins can list the raw email addresses through the app; the
-- monthly report job reads this table via the service role key instead,
-- which bypasses RLS entirely.
alter table public.subscribers enable row level security;

drop policy if exists "public can subscribe" on public.subscribers;
create policy "public can subscribe" on public.subscribers
  for insert with check (true);

drop policy if exists "admin read subscribers" on public.subscribers;
create policy "admin read subscribers" on public.subscribers
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Enable realtime updates for the live feed.
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.feedback;

-- Public "Wall of Honor" — only donors who explicitly opted in
-- (public_recognition = true) appear here, and only their name and tier
-- badge are exposed — never the exact amount, to keep this dignified
-- rather than a public rich-list. This view runs with the privileges of
-- its owner, so it can read the (RLS-protected) transactions table and
-- expose just this safe, aggregated slice to anonymous visitors.
create or replace view public.wall_of_honor as
select
  donor_name,
  case
    when sum(amount) >= 100000 then 'Platinum Patron'
    when sum(amount) >= 50000 then 'Gold Patron'
    when sum(amount) >= 20000 then 'Silver Patron'
    when sum(amount) >= 5000 then 'Bronze Patron'
    else 'Patron'
  end as tier,
  min(txn_date) as since
from public.transactions
where type = 'Deposit' and public_recognition = true
group by donor_name;

grant select on public.wall_of_honor to anon, authenticated;

-- Storage bucket for withdrawal bill/receipt uploads. Public so uploaded
-- bill images can be viewed via a plain URL from the dashboard.
insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

drop policy if exists "admin upload bills" on storage.objects;
create policy "admin upload bills" on storage.objects
  for insert with check (
    bucket_id = 'bills' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "authenticated read bills" on storage.objects;
create policy "authenticated read bills" on storage.objects
  for select using (
    bucket_id = 'bills' and auth.role() = 'authenticated'
  );
