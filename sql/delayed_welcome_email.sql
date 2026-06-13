-- Grow UP — Delayed Welcome Email
-- Sends the founder welcome ~5 minutes AFTER signup, so it doesn't collide with
-- (or get mistaken for) the email-verification message.
--
-- Run this AFTER smart_email_engine_v2.sql.
-- It SUPERSEDES instant_welcome_email_trigger.sql — run this one instead.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1) On signup: ONLY create the preferences row. Do not email immediately.
create or replace function public.handle_new_growup_user_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.growup_email_preferences (
    user_id, email, enabled, transaction_reminder_days, monthly_balance_day,
    goal_reminders, milestone_emails, welcome_email_sent, created_at, updated_at
  )
  values (
    new.id, new.email, false, 1, 28, true, true, false, now(), now()
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

-- 2) Every 2 minutes: email anyone who signed up at least 5 minutes ago and
--    hasn't been welcomed yet. send-welcome-email sets welcome_email_sent = true,
--    so each user is emailed exactly once. Net effect: a 5–7 minute delay.
select cron.unschedule('growup-delayed-welcome')
where exists (select 1 from cron.job where jobname = 'growup-delayed-welcome');

select cron.schedule(
  'growup-delayed-welcome',
  '*/2 * * * *',
  $cron$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('user_id', p.user_id, 'email', p.email)
  )
  from public.growup_email_preferences p
  where coalesce(p.welcome_email_sent, false) = false
    and p.email is not null
    and p.created_at <= now() - interval '5 minutes';
  $cron$
);
