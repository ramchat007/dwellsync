import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={cn(
          "absolute bottom-full mb-1 hidden group-hover:block z-50 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white shadow-md animate-in fade-in-0",
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}

