
GROW UP — Full App + Smart Email Engine

Included:
- Full frontend app
- Luxury theme
- Wealth Timeline V2
- Insights system
- Onboarding tips
- Notification system
- Email reminder settings UI
- Supabase smart email engine
- Welcome email flow

Backend setup:
1. In Supabase SQL Editor run:
   email_engine_upgrade.sql

2. In Supabase Edge Functions:
   Replace/create:
   - send-reminders
   - send-welcome-email

3. Add secrets:
   - RESEND_API_KEY
   - FROM_EMAIL

4. Deploy functions

5. Ensure pg_cron is enabled

6. Schedule cron for send-reminders

Frontend deploy:
- Upload project to GitHub
- Deploy to Cloudflare Pages
