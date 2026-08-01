import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { amount, donorName } = await req.json();
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment gateway isn't configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
        { status: 500 }
      );
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount: Math.round(Number(amount) * 100), // Razorpay expects paise
      currency: "INR",
      receipt: `donation_${Date.now()}`,
      notes: { donorName: donorName || "Anonymous" },
    });

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Couldn't create order." }, { status: 500 });
  }
}
