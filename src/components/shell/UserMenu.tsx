"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { LogOut, User, Shield, ChevronDown } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

export function UserMenu() {
  const { effectiveUser, currentRole } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
        {effectiveUser?.full_name?.[0]?.toUpperCase() || "U"}
      </div>
      <div className="hidden sm:block text-left">
        <div className="text-xs font-semibold text-slate-900 leading-tight">
          {effectiveUser?.full_name || "User"}
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          {currentRole || "MEMBER"}
        </div>
      </div>
    </div>
  );
}

