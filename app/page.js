"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Dashboard from "../components/Dashboard";

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) {
      router.push("/login");
    }
    if (session) {
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [session, router]);

  if (session === undefined || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6EEDA", color: "#5B4B3E" }}>
        Loading…
      </div>
    );
  }
  if (!session) return null; // redirecting to /login

  return <Dashboard user={session.user} role={profile?.role || "viewer"} />;
}
