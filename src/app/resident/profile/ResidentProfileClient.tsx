"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  Loader2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Profile, Society, SocietyMembership } from "@/lib/types/database";

interface ResidentProfileClientProps {
  profile: Profile;
  society: Society | null;
  role: string;
  memberships: (SocietyMembership & { society?: Society })[];
}

export function ResidentProfileClient({
  profile,
  society,
  role,
  memberships,
}: ResidentProfileClientProps) {
  const [displayName, setDisplayName] = useState(
    profile.display_name || profile.full_name || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/resident/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update profile.");
        return;
      }

      setSuccess("Profile display name updated successfully.");
    } catch (err) {
      setError("Network error while updating profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Resident Profile & Account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Your verified resident identity, active society memberships, and account settings.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {success}
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {displayName.charAt(0) || "R"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {profile.full_name || displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {role.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-500">
                {society?.name || "Community Member"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Display Name (Editable)
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Verified Mobile (Identity Guarded)
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.phone || "Not linked"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Verified Email (Identity Guarded)
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-mono truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{profile.email || "Not linked"}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-md shadow-blue-500/20"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Society Memberships Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Active Society Memberships
        </h3>

        <div className="space-y-3">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {m.society?.name || "Housing Society"}
                </span>
                <span className="text-slate-500">
                  Role: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{m.role_id}</strong>
                  {m.unit_number && ` • Unit: ${m.unit_number}`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-900/40"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of DwellSyncHub
        </button>
      </div>
    </div>
  );
}

