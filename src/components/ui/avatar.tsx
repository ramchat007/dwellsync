import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-900 text-white items-center justify-center font-bold text-xs",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || "Avatar"} className="aspect-square h-full w-full object-cover" />
      ) : (
        <span>{fallback.toUpperCase().slice(0, 2)}</span>
      )}
    </div>
  );
}

