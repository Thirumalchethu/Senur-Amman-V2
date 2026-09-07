"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Dashboard from "../components/Dashboard";

// React Three Fiber touches window/document at module scope, so it must never
// be part of the server-rendered HTML — load it client-only.
const CorridorScene = dynamic(() => import("../components/three/CorridorScene"), {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [introDone, setIntroDone] = useState(false);

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

  return (
    <div className="min-h-screen relative" style={{ background: "#0d0405" }}>
      <CorridorScene
        variant="sanctum"
        deityImage="/images/senur-amman.jpg"
        onIntroDone={() => setIntroDone(true)}
      />

      {/*
        During the sanctum arrival (a couple of seconds) only the 3D scene is
        visible. Once the camera settles, the real dashboard rises and fades
        in as its own full page — it keeps its own solid background so every
        number and table stays flat, high-contrast and fully readable. The 3D
        layer is the arrival moment, not a permanent frame around live data.
      */}
      <div
        className="relative transition-all duration-[900ms] ease-out"
        style={{
          zIndex: 10,
          opacity: introDone ? 1 : 0,
          transform: introDone ? "translateY(0)" : "translateY(28px)",
        }}
      >
        <Dashboard user={session.user} role={profile?.role || "viewer"} />
      </div>
    </div>
  );
}
