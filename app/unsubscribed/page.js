"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const params = useSearchParams();
  const ok = params.get("ok") === "1";
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F6EEDA" }}>
      <div className="text-center max-w-sm">
        <h1 className="font-display text-2xl mb-2" style={{ color: ok ? "#204A3B" : "#8A2C2C" }}>
          {ok ? "You've been unsubscribed" : "Link expired or invalid"}
        </h1>
        <p style={{ color: "#5B4B3E" }}>
          {ok
            ? "You won't receive the monthly contribution summary anymore. You're welcome to resubscribe anytime from the donate page."
            : "This unsubscribe link didn't check out. If you still want to stop receiving emails, contact the trust directly."}
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribedPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
