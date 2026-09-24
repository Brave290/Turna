"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Instant page enter — pure CSS opacity only (no transform, no filter).
 * Blur/filter force expensive compositing and made navigation feel laggy.
 * Also avoids creating a containing block for position:fixed dialogs.
 */
export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Kick animation on mount without blocking paint
    el.style.opacity = "1";
    return () => {
      /* nothing */
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        animation: "page-fade-in 120ms ease-out forwards",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
