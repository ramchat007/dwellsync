"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="p-1.5 text-slate-600"
        aria-label="Open Mobile Menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900 pt-5 pb-4 z-50">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <Sidebar className="w-full flex border-none" />
          </div>
        </div>
      )}
    </div>
  );
}

