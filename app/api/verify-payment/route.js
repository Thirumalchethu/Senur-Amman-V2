import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      donorName,
      donorPhone,
      amount,
      purpose,
      publicRecognition,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
    }

    // Recompute the signature ourselves — this is what proves the payment is real
    // and wasn't spoofed by a browser request.
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("transactions").insert({
      type: "Deposit",
      donor_name: (donorName || "").trim() || "Anonymous (Online)",
      donor_phone: (donorPhone || "").trim() || null,
      amount: Number(amount),
      mode: "Online (Razorpay)",
      purpose: purpose || "General",
      recorded_by: "Razorpay (auto)",
      txn_date: new Date().toISOString().slice(0, 10),
      note: `Razorpay payment ID: ${razorpay_payment_id}`,
      public_recognition: Boolean(publicRecognition) && Boolean((donorName || "").trim()),
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Verification failed." }, { status: 500 });
  }
}
