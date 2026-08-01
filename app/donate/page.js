"use client";

import { useEffect, useState } from "react";
import { Landmark, QrCode, CreditCard, Crown } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PATRON_TIERS } from "../../lib/patronTiers";

const PRESETS = [101, 200, 501, 1001, 5001];

export default function DonatePage() {
  const [settings, setSettings] = useState({ name: "Temple Trust", tagline: "", upi_id: "9787912157@ybl" });
  const [amount, setAmount] = useState(101);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [wantsRecognition, setWantsRecognition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [honorRoll, setHonorRoll] = useState([]);
  const gatewayEnabled = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => { if (data) setSettings(data); });

    supabase
      .from("wall_of_honor")
      .select("*")
      .then(({ data }) => { if (data) setHonorRoll(data); });

    if (!gatewayEnabled) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [gatewayEnabled]);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const upiLink = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.name)}&cu=INR${effectiveAmount ? `&am=${effectiveAmount}` : ""}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}`;

  async function handlePayOnline() {
    if (!effectiveAmount || effectiveAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!window.Razorpay) {
      setError("Payment gateway is still loading — try again in a moment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount, donorName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        name: settings.name,
        description: "Temple contribution",
        order_id: data.order.id,
        prefill: { name: donorName, contact: donorPhone },
        theme: { color: "#6E1F2A" },
        handler: async function (response) {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              donorName, donorPhone, amount: effectiveAmount,
              publicRecognition: wantsRecognition,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setPaidAmount(effectiveAmount);
            setSuccess(true);
          } else {
            setError("Payment went through but recording it failed — please note your payment ID and contact the trust.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F6EEDA" }}>
        <div className="fade-in text-center max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(160deg, #D9AD52, #6E1F2A)" }}>
            <Landmark size={24} color="#F6EEDA" />
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: "#204A3B" }}>Thank you 🙏</h1>
          <p style={{ color: "#5B4B3E" }}>
            Your contribution of ₹{paidAmount.toLocaleString("en-IN")} has been received and recorded.
            {wantsRecognition && " You'll appear on our Wall of Honor shortly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#F6EEDA", color: "#241712" }}>
      <div className="max-w-md mx-auto">
        <div className="fade-in text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 hero-arch" style={{ background: "linear-gradient(160deg, #D9AD52, #6E1F2A)", boxShadow: "0 8px 20px -6px rgba(110,31,42,0.35)" }}>
            <Landmark size={24} color="#F6EEDA" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "#6E1F2A" }}>{settings.name}</h1>
          <p className="text-sm" style={{ color: "#5B4B3E" }}>{settings.tagline}</p>
          <div className="w-16 h-px mx-auto mt-3" style={{ background: "linear-gradient(90deg, transparent, #B8892B, transparent)" }} />
        </div>

        <div className="fade-in panel-card rounded-2xl p-5 mb-4" style={{ animationDelay: "60ms", background: "#FFFDF7", border: "1px solid #D8C9A3" }}>
          <p className="text-sm font-medium mb-2">Choose an amount</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setAmount(p); setCustomAmount(""); }}
                className="py-2 rounded-lg text-sm font-medium border"
                style={amount === p && !customAmount
                  ? { background: "#6E1F2A", color: "#F6EEDA", borderColor: "transparent" }
                  : { borderColor: "#D8C9A3", color: "#5B4B3E" }}
              >
                ₹{p}
              </button>
            ))}
          </div>
          <input
            type="number" min="1" value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Or enter a custom amount"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ borderColor: "#D8C9A3" }}
          />
        </div>

        <div className="fade-in panel-card rounded-2xl p-5 mb-4 text-center" style={{ animationDelay: "120ms", background: "#FFFDF7", border: "1px solid #D8C9A3" }}>
          <p className="text-sm font-medium mb-3 flex items-center justify-center gap-1.5">
            <QrCode size={15} /> Scan to pay with any UPI app
          </p>
          <img src={qrSrc} alt="UPI QR code" className="mx-auto rounded-lg" width={220} height={220} />
          <p className="text-xs mt-2" style={{ color: "#5B4B3E" }}>{settings.upi_id}</p>
        </div>

        {gatewayEnabled ? (
          <div className="fade-in panel-card rounded-2xl p-5" style={{ animationDelay: "180ms", background: "#FFFDF7", border: "1px solid #D8C9A3" }}>
            <p className="text-sm font-medium mb-3">Or pay online (Card / UPI / Netbanking)</p>
            <input
              value={donorName} onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-2"
              style={{ borderColor: "#D8C9A3" }}
            />
            <input
              value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-3"
              style={{ borderColor: "#D8C9A3" }}
            />
            {donorName.trim() && (
              <label className="flex items-start gap-2 mb-3 text-xs cursor-pointer" style={{ color: "#5B4B3E" }}>
                <input
                  type="checkbox"
                  checked={wantsRecognition}
                  onChange={(e) => setWantsRecognition(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I'd like to be recognized on our Wall of Honor (name and patron tier only — the exact amount is never shown publicly)</span>
              </label>
            )}
            {error && <p className="text-sm mb-2" style={{ color: "#8A2C2C" }}>{error}</p>}
            <button
              onClick={handlePayOnline}
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: "#204A3B", color: "#F6EEDA" }}
            >
              <CreditCard size={16} /> {loading ? "Please wait…" : `Pay ₹${effectiveAmount || 0} Online`}
            </button>
          </div>
        ) : (
          <p className="text-center text-xs" style={{ color: "#5B4B3E" }}>
            Card / UPI / Netbanking checkout will appear here once online payments are set up.
          </p>
        )}

        {honorRoll.length > 0 && (
          <div className="fade-in panel-card rounded-2xl p-5 mt-4" style={{ animationDelay: "240ms", background: "linear-gradient(160deg, #FFFDF7, #F6EEDA)", border: "1px solid #D9AD52" }}>
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <Crown size={16} style={{ color: "#B8892B" }} />
              <h2 className="font-display text-lg" style={{ color: "#6E1F2A" }}>Wall of Honor</h2>
            </div>
            <div className="flex flex-col gap-2">
              {honorRoll
                .sort((a, b) => {
                  const order = { "Platinum Patron": 0, "Gold Patron": 1, "Silver Patron": 2, "Bronze Patron": 3, "Patron": 4 };
                  return (order[a.tier] ?? 5) - (order[b.tier] ?? 5);
                })
                .map((p) => {
                  const tierInfo = PATRON_TIERS.find((t) => t.name === p.tier);
                  return (
                    <div key={p.donor_name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "#FFFDF7CC" }}>
                      <span className="text-sm font-medium">{p.donor_name}</span>
                      <span
                        className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: tierInfo?.accent || "#D8C9A3", color: tierInfo?.color || "#5B4B3E" }}
                      >
                        {p.tier}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <SubscribeBox />
      </div>
    </div>
  );
}

function SubscribeBox() {
  const [subEmail, setSubEmail] = useState("");
  const [subName, setSubName] = useState("");
  const [subState, setSubState] = useState("idle"); // idle | saving | done | error

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubState("saving");
    const { error } = await supabase.from("subscribers").insert({
      email: subEmail.trim().toLowerCase(),
      name: subName.trim() || null,
    });
    setSubState(error ? "error" : "done");
  }

  if (subState === "done") {
    return (
      <p className="text-center text-xs mt-6" style={{ color: "#204A3B" }}>
        You're subscribed — you'll get a summary email on the 1st of every month. 🙏
      </p>
    );
  }

  return (
    <div className="rounded-2xl p-5 mt-4" style={{ background: "#FFFDF7", border: "1px solid #D8C9A3" }}>
      <p className="text-sm font-medium mb-1">Get the monthly contribution summary</p>
      <p className="text-xs mb-3" style={{ color: "#5B4B3E" }}>
        A short email on the 1st of every month showing deposits, withdrawals, and fund balance — full transparency on how the trust is doing.
      </p>
      <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
        <input
          value={subName} onChange={(e) => setSubName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
          style={{ borderColor: "#D8C9A3" }}
        />
        <input
          required type="email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
          style={{ borderColor: "#D8C9A3" }}
        />
        {subState === "error" && <p className="text-xs" style={{ color: "#8A2C2C" }}>Couldn't subscribe — try again.</p>}
        <button
          type="submit" disabled={subState === "saving"}
          className="py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ background: "#B8892B", color: "#4E141C" }}
        >
          {subState === "saving" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
    </div>
  );
}
