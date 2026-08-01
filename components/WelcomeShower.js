"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

const PETAL_EMOJIS = ["🌸", "🌺", "🌼"];

function makePetals(count, seed) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${seed}-${i}-${Math.random().toString(36).slice(2)}`,
    left: Math.random() * 100,
    delay: Math.random() * 0.7,
    duration: 3 + Math.random() * 2,
    size: 14 + Math.random() * 12,
    emoji: PETAL_EMOJIS[Math.floor(Math.random() * PETAL_EMOJIS.length)],
  }));
}

export default function WelcomeShower({ imageSrc = "/amman.jpg", name = "Amman" }) {
  const [petals, setPetals] = useState([]);
  const [imgSrc, setImgSrc] = useState(imageSrc);
  const timers = useRef([]);

  useEffect(() => {
    // Three bursts of flowers, a beat apart — matches the three bell rings.
    [0, 1400, 2800].forEach((delay, i) => {
      const t = setTimeout(() => {
        const burst = makePetals(14, i);
        setPetals((p) => [...p, ...burst]);
        const cleanupIds = new Set(burst.map((b) => b.id));
        const cleanup = setTimeout(() => {
          setPetals((p) => p.filter((pt) => !cleanupIds.has(pt.id)));
        }, 6000);
        timers.current.push(cleanup);
      }, delay);
      timers.current.push(t);
    });
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto max-w-xs sm:max-w-sm mt-2 mb-1 select-none">
      <div className="relative flex items-center justify-center gap-3">
        <span style={{ transform: "scaleX(-1)", display: "inline-block" }}>
          <Bell size={28} className="ring-bell" style={{ color: "#D9AD52" }} />
        </span>

        <div className="relative rounded-full p-1.5" style={{ background: "linear-gradient(160deg, #D9AD52, #6E1F2A)" }}>
          <img
            src={imgSrc}
            onError={() => setImgSrc("/deity-placeholder.svg")}
            alt={name}
            width={132}
            height={132}
            className="rounded-full object-cover"
            style={{ width: 132, height: 132, border: "3px solid #F6EEDA" }}
          />
        </div>

        <Bell size={28} className="ring-bell" style={{ color: "#D9AD52" }} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 -top-4 bottom-0 overflow-visible">
        {petals.map((p) => (
          <span
            key={p.id}
            className="petal"
            style={{ left: `${p.left}%`, fontSize: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
