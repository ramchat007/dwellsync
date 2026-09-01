import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center gap-1 text-xs", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="h-8 gap-1 px-2.5"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span>Previous</span>
      </Button>

      <div className="flex items-center gap-1 font-mono text-xs px-2 text-slate-600">
        Page {currentPage} of {totalPages}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="h-8 gap-1 px-2.5"
      >
        <span>Next</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </nav>
  );
}

