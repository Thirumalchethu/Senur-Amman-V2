import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this file from a "use client" component —
// the service role key must never reach the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY — Razorpay payments won't be able to auto-record."
  );
}

// Fallback placeholders prevent createClient() from throwing during build
// (e.g. Preview deployments, or CI, where env vars may not be set yet).
// Real requests will still fail clearly at runtime if these aren't set properly.
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder-service-role-key",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
