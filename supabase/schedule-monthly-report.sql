-- Run this in the Supabase SQL Editor AFTER you've deployed the site and
-- know your live URL. Replace the two placeholders below first.
--
-- This schedules a Postgres job that fires at 9:00 AM IST (3:30 UTC) on the
-- 1st of every month, and calls your /api/monthly-report endpoint, which
-- computes the report and emails every subscriber.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'monthly-donor-report',
  '30 3 1 * *',
  $$
  select net.http_post(
    url := 'https://REPLACE-WITH-YOUR-LIVE-URL/api/monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'REPLACE-WITH-YOUR-CRON_SECRET-VALUE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's registered:
--   select * from cron.job;
-- To remove it later:
--   select cron.unschedule('monthly-donor-report');
