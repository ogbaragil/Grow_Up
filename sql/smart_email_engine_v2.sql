
-- Grow UP Smart Email Engine V2
-- Run this in Supabase SQL Editor.

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table growup_email_preferences
add column if not exists welcome_email_sent boolean default false;

alter table growup_email_preferences
add column if not exists last_welcome_sent_at timestamptz;

alter table growup_email_preferences
add column if not exists last_milestone_sent text;

-- Backfill existing signed-up users so they also receive the welcome email.
insert into growup_email_preferences (
  user_id,
  email,
  enabled,
  transaction_reminder_days,
  monthly_balance_day,
  goal_reminders,
  milestone_emails,
  welcome_email_sent,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  false,
  1,
  28,
  true,
  true,
  false,
  now(),
  now()
from auth.users u
where u.email is not null
on conflict (user_id) do update
set
  email = excluded.email,
  welcome_email_sent = coalesce(growup_email_preferences.welcome_email_sent, false),
  updated_at = now();

-- Automatically create preference rows for brand new signups.
create or replace function public.handle_new_growup_user_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.growup_email_preferences (
    user_id,
    email,
    enabled,
    transaction_reminder_days,
    monthly_balance_day,
    goal_reminders,
    milestone_emails,
    welcome_email_sent,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    false,
    1,
    28,
    true,
    true,
    false,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_growup_email_preferences on auth.users;

create trigger on_auth_user_created_growup_email_preferences
after insert on auth.users
for each row
execute function public.handle_new_growup_user_email_preferences();

-- Optional helper: see pending welcome emails.
create or replace view public.growup_pending_welcome_emails as
select user_id, email, created_at
from public.growup_email_preferences
where coalesce(welcome_email_sent, false) = false;
