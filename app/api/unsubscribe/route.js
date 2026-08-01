import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  if (!email || !token || !process.env.UNSUBSCRIBE_SECRET) {
    return NextResponse.redirect(`${siteUrl}/unsubscribed?ok=0`);
  }

  const expected = crypto.createHmac("sha256", process.env.UNSUBSCRIBE_SECRET).update(email).digest("hex");
  if (expected !== token) {
    return NextResponse.redirect(`${siteUrl}/unsubscribed?ok=0`);
  }

  await supabaseAdmin.from("subscribers").delete().eq("email", email);
  return NextResponse.redirect(`${siteUrl}/unsubscribed?ok=1`);
}
