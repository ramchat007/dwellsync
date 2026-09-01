"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex min-h-[calc(100vh-2.5rem)] bg-slate-100 text-slate-900">
      <Sidebar className="hidden md:flex" />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

