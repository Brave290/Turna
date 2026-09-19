# Keep-Alive Setup

Supabase free tier pauses databases after 7 days of inactivity.
This script sets up two keep-alive mechanisms:

## 1. Vercel Cron (built-in)
- Runs daily at 12:00 UTC via `vercel.json` crons
- Pings `/api/health` which queries the database

## 2. External Cron (cron-job.org)
Since Vercel crons only work after deployment, we use cron-job.org as backup.

### Setup Steps:

1. Go to https://cron-job.org
2. Create a free account
3. Click "Create Cron Job"
4. Fill in:
   - **Title**: `Turna Keep-Alive`
   - **URL**: `https://your-project.vercel.app/api/health`
   - **Schedule**: `Every day at 12:00 UTC` (0 12 * * *)
   - **Request Method**: `GET`
5. Save

### Alternative: Use Supabase Edge Function
If you prefer not to use cron-job.org, you can deploy a Supabase Edge Function:

```bash
supabase functions deploy keep-alive
```

Then schedule it via Supabase Dashboard → Edge Functions → Cron.
