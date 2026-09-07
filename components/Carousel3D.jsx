"use client";

/**
 * Carousel3D
 * ----------
 * Wraps a set of <Slide title="..."> children and shows one at a time, with
 * a subtle 3D rotate/slide transition between them. Navigable by side arrows
 * (desktop), bottom Back/Next buttons (mobile), a row of section-name pills
 * you can jump to directly, or a swipe gesture on touch devices.
 *
 * This only controls *layout/navigation* — every slide's actual content
 * (numbers, tables, forms, buttons) is rendered completely untouched, so
 * none of the dashboard's real logic lives here.
 */

import { useState, useRef, useCallback, Children } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Slide({ children }) {
  return <>{children}</>;
}

export default function Carousel3D({ children, accent = "#6E1F2A", line = "#D8C9A3" }) {
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const touchX = useRef(null);

  const go = useCallback(
    (next) => {
      setDir(next > index ? 1 : -1);
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [index, slides.length]
  );
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
    touchX.current = null;
  }

  const titles = slides.map((s) => (s && s.props ? s.props.title : "Section") || "Section");

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {titles.map((t, i) => (
            <button
              key={t + i}
              type="button"
              onClick={() => go(i)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium"
              style={
                i === index
                  ? { background: accent, color: "#F6EEDA" }
                  : { background: "#FFFDF7", color: "#5B4B3E", border: `1px solid ${line}` }
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous section"
            className="w-8 h-8 rounded-full flex items-center justify-center border"
            style={{ borderColor: line, color: accent, background: "#FFFDF7" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next section"
            className="w-8 h-8 rounded-full flex items-center justify-center border"
            style={{ borderColor: line, color: accent, background: "#FFFDF7" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ perspective: "1400px" }}
        className="relative"
      >
        <div key={index} className="carousel3d-slide">
          {slides[index]}
        </div>
      </div>

      <div className="flex sm:hidden items-center justify-between mt-4">
        <button
          type="button"
          onClick={prev}
          className="px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-1"
          style={{ borderColor: line, color: accent, background: "#FFFDF7" }}
        >
          <ChevronLeft size={15} /> Back
        </button>
        <span className="text-xs" style={{ color: "#5B4B3E" }}>
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={next}
          className="px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-1"
          style={{ borderColor: line, color: accent, background: "#FFFDF7" }}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>

      <style jsx>{`
        @keyframes carousel3dInRight {
          from {
            opacity: 0;
            transform: rotateY(-16deg) translateX(50px);
          }
          to {
            opacity: 1;
            transform: rotateY(0deg) translateX(0);
          }
        }
        @keyframes carousel3dInLeft {
          from {
            opacity: 0;
            transform: rotateY(16deg) translateX(-50px);
          }
          to {
            opacity: 1;
            transform: rotateY(0deg) translateX(0);
          }
        }
        .carousel3d-slide {
          transform-style: preserve-3d;
          transform-origin: center;
          animation: ${dir > 0 ? "carousel3dInRight" : "carousel3dInLeft"} 0.45s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .carousel3d-slide {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
