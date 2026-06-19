-- Adds App Store (StoreKit) support alongside the existing Stripe columns.
-- Run this once in the Supabase SQL editor.

alter table growup_subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists apple_original_transaction_id text;

-- Original transaction id is Apple's stable per-user subscription key.
create unique index if not exists growup_subscriptions_apple_otx
  on growup_subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

-- Entitlement rows are written ONLY by the service role (edge functions),
-- never by the client. The existing select policy lets users read their row.
