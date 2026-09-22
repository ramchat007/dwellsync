"use client";

import React, { useEffect, useState } from "react";

export interface TimeDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  date?: string | Date | number | null;
  fallback?: string;
  prefix?: string;
  suffix?: string;
  format?: "time" | "date" | "datetime";
  options?: Intl.DateTimeFormatOptions;
}

/**
 * SSR-safe date/time renderer that prevents Next.js / React 19 hydration mismatches.
 * Renders fallback during SSR and initial client hydration, then formats according
 * to user's browser locale and timezone once mounted.
 */
export function TimeDisplay({
  date,
  fallback = "—",
  prefix = "",
  suffix = "",
  format = "time",
  options,
  className,
  ...props
}: TimeDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) {
    return (
      <span className={className} {...props}>
        {fallback}
      </span>
    );
  }

  let formattedText = fallback;

  if (mounted) {
    try {
      const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
      if (!isNaN(d.getTime())) {
        if (options) {
          formattedText = d.toLocaleString([], options);
        } else if (format === "time") {
          formattedText = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (format === "date") {
          formattedText = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        } else {
          formattedText = d.toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
    } catch {
      formattedText = fallback;
    }
  }

  return (
    <span suppressHydrationWarning className={className} {...props}>
      {mounted ? `${prefix}${formattedText}${suffix}` : fallback}
    </span>
  );
}

