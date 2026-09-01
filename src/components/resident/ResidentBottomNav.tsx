"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Bell,
  FileText,
  Users,
  User,
} from "lucide-react";

export function ResidentBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/resident/dashboard", icon: Home },
    { label: "My Unit", href: "/resident/home", icon: Building2 },
    { label: "Notices", href: "/resident/notices", icon: Bell },
    { label: "Documents", href: "/resident/documents", icon: FileText },
    { label: "Community", href: "/resident/community", icon: Users },
    { label: "Profile", href: "/resident/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/resident/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              <span className="text-[10px] tracking-tight truncate max-w-[54px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

