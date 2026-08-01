# Senur Amman Kovil Trust — Contributions Dashboard

A private, login-only, live dashboard for tracking temple deposits and
withdrawals. Only accounts marked **admin** can record transactions;
everyone else can view and leave feedback. Nobody can access it without
signing in — there is no public page.

Runs on two free services:
- **Supabase** — database, authentication, and realtime sync
- **Vercel** (or Netlify) — hosting

---

## 1. Create your free Supabase project

1. Go to https://supabase.com → sign up free → **New project**.
2. Once it's created, open the **SQL Editor** (left sidebar).
3. Paste the entire contents of `supabase/schema.sql` (in this folder) and click **Run**.
   This creates all tables, security rules, the `bills` storage bucket for withdrawal receipts, and makes sure only admins can insert transactions.
   **If you already ran an older version of this file**, just run it again — every statement is written to be safely re-run (`if not exists`, `drop policy if exists`, etc.) and will add the new bill-tracking columns and storage bucket without touching your existing data.
4. Go to **Settings → API**. Copy the **Project URL** and the **anon public** key — you'll need both next.

## 2. Configure the app

1. Copy `.env.local.example` to `.env.local`.
2. Paste in your Project URL and anon key from step 1.4.

```bash
cp .env.local.example .env.local
# then edit .env.local with your values
```

## 3. Run it locally (optional, to check it works)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it should redirect you to `/login`.

## 4. Deploy free — Vercel (recommended for Next.js)

**Prefer Cloudflare instead?** See `CLOUDFLARE.md` in this folder for a full walkthrough — it has more generous free limits and no cold-start delays, at the cost of a few terminal commands instead of a pure dashboard flow.


1. Push this folder to a new GitHub repository.
2. Go to https://vercel.com → sign up free → **Add New Project** → import your repo.
3. Under **Environment Variables**, add the same two values from your `.env.local`.
4. Click **Deploy**. You'll get a live `https://your-project.vercel.app` URL.

### Or deploy free — Netlify

1. Push this folder to GitHub.
2. Go to https://netlify.com → **Add new site → Import an existing project**.
3. Netlify auto-detects Next.js (it installs the Next.js runtime automatically).
4. Under **Site settings → Environment variables**, add the same two values.
5. Deploy — you'll get a `https://your-site.netlify.app` URL.

Either way, the link is free, permanent, and entirely under your control — no Claude account needed by you or your volunteers to use it, only their own login for this app.

## 5. Create your first account and make it admin

1. Open your deployed URL, click **Sign up**, create an account with your email.
2. Check your email and confirm it (Supabase sends a confirmation link by default).
3. In Supabase, go to **Table Editor → profiles**. Find your row and change `role` from `viewer` to `admin`.
4. Log back in — you'll now see the **Record transaction** button.

## 6. Set up online payments (UPI QR + Razorpay)

There's now a **public donation page** at `/donate` — no login needed, since donors won't have accounts. It shows a scannable UPI QR code and an online payment button (card/UPI/netbanking via Razorpay). Successful Razorpay payments are recorded automatically as deposits — no manual entry needed.

**UPI QR code (works immediately, no setup):**
The QR is set to `9787912157@ybl` — the PhonePe UPI ID for that number. Still worth scanning it yourself once after deploying to double-check it opens correctly and shows the right payee name in your UPI app. If you ever need to change it (new bank, new number), edit it here:
1. Supabase → **Table Editor → settings** → edit the `upi_id` column → save.

**Razorpay (for card/netbanking/UPI checkout on the website):**
1. Sign up free at https://razorpay.com — no monthly fee, you're charged a small % only when a payment succeeds.
2. Go to **Settings → API Keys** and generate a key pair. Start with **Test Mode** keys.
3. Add three new environment variables in Vercel/Netlify (see `.env.local.example`):
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same value as `RAZORPAY_KEY_ID`)
4. Also add `SUPABASE_SERVICE_ROLE_KEY` — from Supabase **Settings → API → service_role** (the "secret" key, not the anon one). This lets the server auto-record a deposit the instant a payment is verified, without needing the donor to be logged in. **Never** put this key in a `NEXT_PUBLIC_` variable or in the browser.
5. Redeploy. Test a payment on `/donate` using Razorpay's test card numbers (listed in their dashboard) — confirm it shows up in your dashboard's transaction feed.
6. Once you've tested it end-to-end, switch to **Live Mode** keys in Razorpay and update the same three environment variables — that's what actually goes live and charges real money.

I wasn't able to test-run the live payment flow myself (I don't have your Supabase/Razorpay credentials), so please run at least one test-mode payment before switching to live keys.

## 7. Adding volunteers / trustees

**Option A — self-signup (simplest):** Share the site link. Anyone can sign up, but they start as `viewer` (read-only + feedback). Promote trusted people to `admin` the same way you did for yourself, in the `profiles` table.

**Option B — invite-only (fully closed, no public signup):**
1. In Supabase, go to **Authentication → Settings** and turn **off** "Allow new users to sign up".
2. Instead, go to **Authentication → Users → Invite user** and enter each person's email — they'll get an email to set their password.
3. This way nobody can create an account except people you've personally invited.

## 8. Password reset

This is built in — on the sign-in page, "Forgot password?" sends a reset email via Supabase's default email service, and `/reset-password` handles setting the new one. No extra setup needed, but two things to check in Supabase:

1. **Authentication → URL Configuration → Redirect URLs** — add your deployed site's URL (e.g. `https://your-site.vercel.app/reset-password`) so Supabase allows redirecting there after the email link is clicked.
2. Supabase's free tier sends these emails from their own shared address by default, which can be slow or land in spam. For a production temple site, consider connecting your own SMTP under **Authentication → Settings → SMTP** later on.

## 9. Adding your temple's photo

The welcome banner (photo + ringing bells + flower shower) looks for an image at `public/amman.jpg`. Add your own photo:

1. Drop your photo into the `public/` folder of this project, named exactly `amman.jpg`.
2. Push and redeploy.

Until you add one, a simple placeholder graphic shows instead — nothing breaks either way.

## 10. Withdrawal bill uploads

Every withdrawal now needs a bill/receipt on file. Until one's uploaded, that row shows highlighted in red on the dashboard with a "Bill pending" tag — visible to everyone, but only admins see the upload button (view-only accounts can't act on it).

- Right after an admin records a withdrawal, a popup immediately asks them to upload the bill (or come back to it later).
- Any pending withdrawal in the feed has a **Submit bill** button (admin only) that reopens that same popup.
- If there's genuinely no bill for something (e.g. petty cash), an admin can click **"No bill available — close this item"** in the popup — this clears the red highlight without a file, but leaves a visible "Closed — no bill" tag so it's clear it was a deliberate call, not an oversight.
- Uploaded bills go to a Supabase Storage bucket called `bills` (created automatically by `schema.sql`) and are linked from the transaction feed as "View uploaded bill."

## 11. Monthly donor summary email

On the 1st of every month, an automated email goes out to everyone who's subscribed on `/donate`, summarizing: funds currently available, deposits and withdrawals for the month just finished, a category breakdown for both, and how it compares to last month and the same month last year.

**Setup:**

1. Sign up free at https://resend.com (3,000 emails/month free, no card needed). Verify a sending domain under **Domains** — or for quick testing, you can send from Resend's shared `onboarding@resend.dev` address, though a verified domain is recommended before relying on this for real.
2. Get your API key from Resend's dashboard.
3. Add these environment variables (in Vercel/Netlify/Cloudflare, wherever you deployed):
   - `RESEND_API_KEY`
   - `REPORT_FROM_EMAIL` (an address on your verified domain, e.g. `updates@yourtemple.org`)
   - `CRON_SECRET` — any long random string you make up, protects the report endpoint from being triggered by strangers
   - `UNSUBSCRIBE_SECRET` — a different long random string, used to sign unsubscribe links
   - `NEXT_PUBLIC_SITE_URL` — your live site URL (e.g. `https://your-site.vercel.app`), used to build links inside the email
4. Once deployed and those variables are set, open `supabase/schedule-monthly-report.sql`, fill in your live URL and `CRON_SECRET` value, and run it once in Supabase's SQL Editor. This registers the monthly schedule.
5. **Test it before relying on it:** you can trigger the report manually any time with:
   ```bash
   curl -X POST https://your-live-site-url/api/monthly-report \
     -H "x-cron-secret: YOUR_CRON_SECRET_VALUE"
   ```
   Subscribe your own email on `/donate` first so you have something to check.

Donors subscribe themselves from a box at the bottom of `/donate` — nobody's added automatically, and every email includes an unsubscribe link.

I wasn't able to test the actual sending or the monthly schedule myself, since both need your live Resend and Supabase credentials — please run the manual curl test above at least once before the 1st rolls around.

## 12. Donor recognition — Wall of Honor & patron tiers

For VIP and major donors, deposits are now grouped into tiers by lifetime giving:

| Tier | Cumulative giving |
|---|---|
| Platinum Patron | ₹1,00,000+ |
| Gold Patron | ₹50,000+ |
| Silver Patron | ₹20,000+ |
| Bronze Patron | ₹5,000+ |

These thresholds live in `lib/patronTiers.js` — edit that one file to change the amounts, and both the admin dashboard and the public Wall of Honor pick up the change automatically.

**Privacy is opt-in only, by design:**
- A donor only appears publicly if they (or an admin, on their behalf and with their permission) explicitly ticks the recognition checkbox at the time of that donation.
- The public Wall of Honor (on `/donate`) shows **name and tier badge only — never the exact amount**. This is enforced at the database level (a Postgres view that only exposes those two fields for consenting donors), not just hidden in the UI.
- Internally, the admin dashboard's Donor Summary table shows tier badges next to every donor's name (visible to admins only, alongside their real cumulative figures) so trustees can see at a glance who their major patrons are for stewardship purposes.

## What's enforced where

- **UI**: the "Record transaction" button and form only appear for admin accounts.
- **Database (the real protection)**: Row-Level Security policies mean even if someone tried to bypass the UI, the database itself rejects transaction inserts from non-admin accounts. Viewing data and posting feedback requires being signed in — nothing is public.

## Updating the dashboard later

Push changes to your GitHub repo — Vercel/Netlify redeploy automatically on every push. No republishing steps like a Claude artifact.
