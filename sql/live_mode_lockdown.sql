-- Live-mode lockdown: subscription rows may only be WRITTEN by the
-- stripe-webhook / verify-subscription edge functions (service role, which
-- bypasses RLS). Browser clients keep read-only access to their own row.
-- Run this in the Supabase SQL editor BEFORE pointing live traffic at the app.

drop policy if exists "Users can insert own subscription" on growup_subscriptions;
drop policy if exists "Users can update own subscription" on growup_subscriptions;

-- Read policy stays as-is:
--   "Users can read own subscription" (select, auth.uid() = user_id)
