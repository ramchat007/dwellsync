"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-slate-900 flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const formatted = segment.replace(/-/g, " ");

        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize truncate max-w-[150px]">
                {formatted}
              </span>
            ) : (
              <Link href={path} className="hover:text-slate-900 capitalize truncate max-w-[120px]">
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

