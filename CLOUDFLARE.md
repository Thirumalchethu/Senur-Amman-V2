# Deploying to Cloudflare (free) — step by step

This gets you a live, shareable URL on Cloudflare's free Workers plan —
generous limits (100,000 requests/day), no sleep/cold-start delays, and
no code changes were needed: Cloudflare's `nodejs_compat` mode runs the
Razorpay signature-check code exactly as written.

## What you need first

- A free Cloudflare account: sign up at https://dash.cloudflare.com/sign-up
- Node.js installed on your computer (18 or newer) — check with `node -v` in a terminal
- This project folder unzipped somewhere on your computer
- Your Supabase project already set up (Step 1 in the main README), so you have your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` ready

## 1. Install dependencies

Open a terminal in this project folder and run:

```bash
npm install
```

## 2. Add your environment variables locally (for the build step)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your real Supabase values (and Razorpay values later, once you have them).

## 3. Log in to Cloudflare from your terminal

```bash
npx wrangler login
```

This opens your browser to connect your free Cloudflare account. Approve it, then return to the terminal.

## 4. Build the app for Cloudflare

```bash
npm run cf:build
```

This runs the OpenNext adapter, which converts the Next.js build into something Cloudflare Workers can run.

## 5. Deploy and get your live URL

```bash
npm run cf:deploy
```

Wrangler will upload everything and print a live URL, something like:

```
https://senur-amman-kovil-trust.<your-subdomain>.workers.dev
```

**That's the link you share with your donors and trustees.** It's live immediately.

## 6. Add your real environment variables to the deployed Worker

The `.env.local` file only applies locally — for the live site, set the same variables in Cloudflare's dashboard:

1. Go to **Workers & Pages** in the Cloudflare dashboard → click your Worker (e.g. `senur-amman-kovil-trust`).
2. Go to **Settings → Variables and Secrets**.
3. Add each one from your `.env.local.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — mark this one as **Secret**, not plain text
   - Later, when ready: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Secret), `NEXT_PUBLIC_RAZORPAY_KEY_ID`
4. Click **Save and deploy** — Cloudflare redeploys automatically with the new values.

## 7. Updating the site later

Whenever you make changes, just repeat steps 4 and 5:

```bash
npm run cf:build
npm run cf:deploy
```

## Optional: auto-deploy from GitHub (like Vercel/Netlify)

If you'd rather push to GitHub and have it deploy automatically instead of running commands each time:

1. Push this project to a GitHub repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Workers → Connect to Git**.
3. Select your repository, set the build command to `npm run cf:build` and the deploy command to `npx wrangler deploy`.
4. Add your environment variables the same way as step 6 above.

Either way — CLI or Git-connected — you end up with the same free `.workers.dev` URL, with the option to attach your own domain name later for free under **Custom Domains** in the same Worker's settings.
