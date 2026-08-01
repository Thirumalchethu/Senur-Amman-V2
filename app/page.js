"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Dashboard from "../components/Dashboard";

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);

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
        .then(({ data, error }) => {
          if (error) {
            setProfileError(
              "We couldn't load your account profile. If you just signed up, ask a trustee to check the profiles table in Supabase. (" +
                error.message +
                ")"
            );
          }
          setProfile(data);
          setProfileChecked(true);
        });
    }
  }, [session, router]);

  if (session && profileChecked && !profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 text-center"
        style={{ background: "#F6EEDA", color: "#5B4B3E" }}
      >
        <div>
          <p className="mb-4">{profileError || "No profile found for this account."}</p>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="text-sm underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (session === undefined || (session && !profileChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6EEDA", color: "#5B4B3E" }}>
        Loading…
      </div>
    );
  }
  if (!session) return null; // redirecting to /login

  return <Dashboard user={session.user} role={profile?.role || "viewer"} />;
}
