
alter table growup_email_preferences
add column if not exists welcome_email_sent boolean default false;

create table if not exists growup_user_snapshots (
  user_id uuid,
  month_key text,
  net_worth numeric,
  updated_at timestamptz default now()
);
