import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { buildMonthlyReport } from "../../../lib/monthlyReport";
import { buildReportEmailHtml } from "../../../lib/reportEmailTemplate";

function unsubscribeUrlFor(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !siteUrl) return null;
  const token = crypto.createHmac("sha256", secret).update(email).digest("hex");
  return `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.REPORT_FROM_EMAIL || "onboarding@resend.dev",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error for ${to}: ${res.status} ${text}`);
  }
}

// This runs on a schedule (see supabase/schedule-monthly-report.sql), not
// on a page visit — it's protected by a shared secret instead of a login.
export async function POST(req) {
  try {
    const secretHeader = req.headers.get("x-cron-secret");
    if (!process.env.CRON_SECRET || secretHeader !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const [{ data: txns, error: txErr }, { data: settings }, { data: subscribers, error: subErr }] = await Promise.all([
      supabaseAdmin.from("transactions").select("type, amount, purpose, txn_date"),
      supabaseAdmin.from("settings").select("*").eq("id", 1).single(),
      supabaseAdmin.from("subscribers").select("email"),
    ]);
    if (txErr) throw txErr;
    if (subErr) throw subErr;

    const report = buildMonthlyReport(txns || []);
    const templeName = settings?.name || "Temple Trust";
    const tagline = settings?.tagline || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    let sent = 0;
    const failures = [];
    for (const { email } of subscribers || []) {
      try {
        const html = buildReportEmailHtml({
          templeName, tagline, report, siteUrl,
          unsubscribeUrl: unsubscribeUrlFor(email),
        });
        await sendEmail({
          to: email,
          subject: `${templeName} — ${report.monthLabel} Contribution Summary`,
          html,
        });
        sent++;
      } catch (err) {
        failures.push({ email, error: err.message });
      }
    }

    return NextResponse.json({ success: true, monthLabel: report.monthLabel, sent, failed: failures.length, failures });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to send monthly report" }, { status: 500 });
  }
}
