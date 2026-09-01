"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full"
      aria-label="Notifications"
    >
      <Bell className="w-4 h-4" />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
    </Button>
  );
}

