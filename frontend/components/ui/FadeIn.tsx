"use client";

import { useEffect, useRef, useState } from "react";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before starting the animation */
  delay?: number;
  /** Animation direction: "up" slides in from below, "none" fades in place */
  direction?: "up" | "none";
}

export default function FadeIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: FadeInProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  const baseStyles: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform:
      direction === "up"
        ? visible
          ? "translateY(0)"
          : "translateY(8px)"
        : undefined,
    transition: `opacity 300ms ease-out${direction === "up" ? ", transform 300ms ease-out" : ""}`,
  };

  return (
    <div ref={ref} style={baseStyles} className={className}>
      {children}
    </div>
  );
}
