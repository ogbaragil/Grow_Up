-- DEPRECATED: superseded by sql/delayed_welcome_email.sql (welcome now sent ~5 min after signup).
-- Do not run this file; run sql/delayed_welcome_email.sql instead.


-- Grow UP Instant Welcome Email Upgrade
-- Run this AFTER smart_email_engine_v2.sql.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

create extension if not exists pg_net;

create or replace function public.handle_new_growup_user_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  function_url text := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-welcome-email';
  service_key text := 'YOUR_SERVICE_ROLE_KEY';
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

  -- Send founder welcome email immediately on signup.
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', new.id,
      'email', new.email
    )
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_growup_email_preferences on auth.users;

create trigger on_auth_user_created_growup_email_preferences
after insert on auth.users
for each row
execute function public.handle_new_growup_user_email_preferences();
