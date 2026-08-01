"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's reset-password email links back here with a recovery
    // session already attached — this event confirms it's ready to use.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Fallback: if the session is already present by the time this loads.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1800);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #4E141C 0%, #6E1F2A 100%)" }}
    >
      <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: "#FFFDF7" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#B8892B", color: "#4E141C" }}>
            <Landmark size={18} />
          </div>
          <h1 className="font-display text-xl" style={{ color: "#6E1F2A" }}>Set a new password</h1>
        </div>

        {done ? (
          <p className="text-sm" style={{ color: "#204A3B" }}>Password updated — taking you to the dashboard…</p>
        ) : !ready ? (
          <p className="text-sm" style={{ color: "#5B4B3E" }}>
            Verifying your reset link… If this doesn't update in a few seconds, the link may have expired — request a new one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              required type="password" minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="px-3 py-2.5 rounded-lg outline-none text-sm border"
              style={{ borderColor: "#D8C9A3" }}
            />
            <input
              required type="password" minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="px-3 py-2.5 rounded-lg outline-none text-sm border"
              style={{ borderColor: "#D8C9A3" }}
            />
            {error && <p className="text-sm" style={{ color: "#8A2C2C" }}>{error}</p>}
            <button
              type="submit" disabled={loading}
              className="py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
              style={{ background: "#6E1F2A", color: "#F6EEDA" }}
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
