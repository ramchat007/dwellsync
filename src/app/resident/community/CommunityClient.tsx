"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Building2,
  Shield,
  Phone,
  Mail,
  Lock,
  Settings,
  Sparkles,
} from "lucide-react";
import { Society } from "@/lib/types/database";

interface CommunityClientProps {
  members: {
    id: string;
    userId: string;
    name: string;
    role: string;
    unitNumber: string;
    avatarUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    allowChat?: boolean;
    isSelf?: boolean;
  }[];
  society: Society | null;
}

export function CommunityClient({ members, society }: CommunityClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Community & Resident Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verified neighbors and residents of {society?.name || "your community"}.
          </p>
        </div>

        <Link
          href="/resident/settings/privacy"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
        >
          <Settings className="w-4 h-4" />
          Directory Privacy Settings
        </Link>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
        <Lock className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Privacy Protected:</strong> Phone numbers and emails are hidden by default and only visible if a resident has explicitly enabled community visibility in their privacy settings.
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by neighbor name, flat number, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Directory Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Neighbors Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery
              ? `No residents matched "${searchQuery}".`
              : "No community members found in this society."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm space-y-3 transition ${
                member.isSelf
                  ? "border-blue-300 dark:border-blue-700 ring-1 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      {member.isSelf && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {member.role.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {member.unitNumber}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                {member.phone ? (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{member.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                    <Lock className="w-3 h-3" />
                    <span>Phone hidden by resident</span>
                  </div>
                )}

                {member.email ? (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium truncate">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    <span className="truncate">{member.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                    <Lock className="w-3 h-3" />
                    <span>Email hidden by resident</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

