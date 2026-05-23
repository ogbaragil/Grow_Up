
GROW UP — Smart Email Engine V2 Setup

This full app package includes:
- Full Grow UP frontend app
- Email Reminder Settings UI
- Smart reminder Edge Function
- Welcome email Edge Function
- SQL migration for existing/new users

WHAT THE NEW EMAIL ENGINE DOES

1. Welcome emails
- Existing signed-up users are backfilled into growup_email_preferences.
- Any user with welcome_email_sent = false receives the founder welcome email.
- New signups automatically get a growup_email_preferences row via DB trigger.
- The daily send-reminders function sends pending welcome emails.

2. Smart reminders
When email reminders are enabled for a user, the daily function checks:
- recurring transactions due within the user’s selected reminder window
- missing current-month asset/debt snapshot on monthly reminder day
- goals that appear off-track
- milestones crossed, such as $100k / $250k / $500k / $1M net worth
- recurring expenses unusually high versus income

SUPABASE STEPS

1. Run SQL:
   smart_email_engine_v2.sql

2. Replace/deploy Edge Function:
   supabase/functions/send-reminders/index.ts

3. Optional separate function:
   supabase/functions/send-welcome-email/index.ts

4. Make sure Supabase secrets exist:
   RESEND_API_KEY
   FROM_EMAIL
   APP_URL optional, defaults to https://growupapp.app

5. Keep your existing cron job pointing to:
   /functions/v1/send-reminders

IMPORTANT
If you exposed your service_role key anywhere, rotate it in Supabase Settings → API.


INSTANT WELCOME EMAIL SETUP

To make welcome emails send immediately after signup:

1. Deploy the send-welcome-email Edge Function.

2. Open:
   instant_welcome_email_trigger.sql

3. Replace:
   YOUR_PROJECT_REF
   YOUR_SERVICE_ROLE_KEY

4. Run it in Supabase SQL Editor.

What happens after this:
- New signup creates email preference row
- Supabase trigger immediately calls send-welcome-email
- User gets founder welcome email right away
- Daily send-reminders cron still acts as backup for any welcome_email_sent = false users

Security reminder:
If you pasted your service_role key anywhere public, rotate it in Supabase Settings → API.


GOAL EMAIL PROGRESS FIX
- send-reminders now uses selected-month snapshots and linked accounts, matching the app UI goal percentages.
- This fixes emails incorrectly reporting goals as 0% when the app shows real progress.
