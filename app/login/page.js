"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Account created. Check your email to confirm, then sign in below.");
        setMode("signin");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link has been sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #4E141C 0%, #6E1F2A 100%)" }}
    >
      <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: "#FFFDF7" }}>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "#B8892B", color: "#4E141C" }}
          >
            <Landmark size={18} />
          </div>
          <h1 className="font-display text-xl" style={{ color: "#6E1F2A" }}>
            Welcome to Senur Amman Kovil
          </h1>
        </div>
        <p className="text-sm mb-5" style={{ color: "#5B4B3E" }}>
          Private access for trustees and volunteers only.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="px-3 py-2.5 rounded-lg outline-none text-sm border"
            style={{ borderColor: "#D8C9A3" }}
          />
          {mode !== "forgot" && (
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="px-3 py-2.5 rounded-lg outline-none text-sm border"
              style={{ borderColor: "#D8C9A3" }}
            />
          )}
          {error && <p className="text-sm" style={{ color: "#8A2C2C" }}>{error}</p>}
          {notice && <p className="text-sm" style={{ color: "#204A3B" }}>{notice}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
            style={{ background: "#6E1F2A", color: "#F6EEDA" }}
          >
            {loading
              ? "Please wait…"
              : mode === "signin" ? "Sign in"
              : mode === "signup" ? "Create account"
              : "Send reset link"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}
            className="text-xs underline"
            style={{ color: "#5B4B3E" }}
          >
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
          {mode !== "forgot" ? (
            <button
              onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}
              className="text-xs underline"
              style={{ color: "#5B4B3E" }}
            >
              Forgot password?
            </button>
          ) : (
            <button
              onClick={() => { setMode("signin"); setError(""); setNotice(""); }}
              className="text-xs underline"
              style={{ color: "#5B4B3E" }}
            >
              Back to sign in
            </button>
          )}
        </div>

        <p className="text-[11px] mt-5 text-center" style={{ color: "#5B4B3E" }}>
          New accounts start as view-only. A trustee can grant recording access from the Supabase dashboard.
        </p>
      </div>
    </div>
  );
}
