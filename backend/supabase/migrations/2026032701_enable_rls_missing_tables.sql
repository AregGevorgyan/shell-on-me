-- Enable Row Level Security on tables that were missing it.
-- Sensitive admin/backend tables get no client-facing policies (service role only).
-- User-owned tables get policies allowing users to read their own rows.
-- Public reference tables get a public read policy.

-- ── dashboard_follows ──────────────────────────────────────────────────────
alter table dashboard_follows enable row level security;

drop policy if exists "public read" on dashboard_follows;
create policy "public read" on dashboard_follows
  for select using (true);

-- ── mod_reports ────────────────────────────────────────────────────────────
-- Moderator data: no client-facing SELECT; backend uses service role.
alter table mod_reports enable row level security;

-- ── reports ────────────────────────────────────────────────────────────────
-- User reports: users can insert; reads handled by backend service role.
alter table reports enable row level security;

drop policy if exists "user insert own" on reports;
create policy "user insert own" on reports
  for insert with check (firebase_uid() = user_id);

-- ── shop_orders ────────────────────────────────────────────────────────────
-- Orders: users can read their own orders only.
alter table shop_orders enable row level security;

drop policy if exists "user read own" on shop_orders;
create policy "user read own" on shop_orders
  for select using (firebase_uid() = user_id);

-- ── user_bans ──────────────────────────────────────────────────────────────
-- Ban data: admin/backend only, no client-facing policies.
alter table user_bans enable row level security;

-- ── user_entitlements ──────────────────────────────────────────────────────
-- Entitlements: users can read their own.
alter table user_entitlements enable row level security;

drop policy if exists "user read own" on user_entitlements;
create policy "user read own" on user_entitlements
  for select using (firebase_uid() = user_id);

-- ── predictle_daily ────────────────────────────────────────────────────────
-- Daily puzzle data: public read (no PII).
alter table predictle_daily enable row level security;

drop policy if exists "public read" on predictle_daily;
create policy "public read" on predictle_daily
  for select using (true);

-- ── predictle_results ──────────────────────────────────────────────────────
-- User puzzle results: users read their own.
alter table predictle_results enable row level security;

drop policy if exists "user read own" on predictle_results;
create policy "user read own" on predictle_results
  for select using (firebase_uid() = user_id);

-- ── stonk_images ───────────────────────────────────────────────────────────
-- Image URLs: public read (no PII).
alter table stonk_images enable row level security;

drop policy if exists "public read" on stonk_images;
create policy "public read" on stonk_images
  for select using (true);
