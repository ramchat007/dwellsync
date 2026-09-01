"use client";

import React, { useState } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import { ProfilePrivacySettings } from "@/lib/types/database";

interface PrivacySettingsClientProps {
  initialPrivacy: ProfilePrivacySettings;
}

export function PrivacySettingsClient({
  initialPrivacy,
}: PrivacySettingsClientProps) {
  const [profileVisible, setProfileVisible] = useState(
    initialPrivacy.profile_visible_in_directory
  );
  const [phoneVisible, setPhoneVisible] = useState(
    initialPrivacy.phone_visible_in_directory
  );
  const [emailVisible, setEmailVisible] = useState(
    initialPrivacy.email_visible_in_directory
  );
  const [allowChat, setAllowChat] = useState(
    initialPrivacy.allow_neighbor_chat
  );

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/resident/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_visible_in_directory: profileVisible,
          phone_visible_in_directory: phoneVisible,
          email_visible_in_directory: emailVisible,
          allow_neighbor_chat: allowChat,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update privacy preferences.");
        return;
      }

      setSuccess("Your directory privacy preferences have been updated.");
    } catch (err) {
      setError("Network error while saving settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Directory Privacy Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Control what information is visible to other residents in the community directory.
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

      {/* Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Profile Visibility */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5 pr-4">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Show profile in Community Directory
              </label>
              <p className="text-xs text-slate-500">
                Allows neighbors to see your name and assigned flat number in the society directory.
              </p>
            </div>
            <input
              type="checkbox"
              checked={profileVisible}
              onChange={(e) => setProfileVisible(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Phone Visibility */}
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 pr-4">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                Show Mobile Number in Directory
              </label>
              <p className="text-xs text-slate-500">
                Disabled by default. If enabled, verified neighbors can view your contact number for emergencies.
              </p>
            </div>
            <input
              type="checkbox"
              checked={phoneVisible}
              onChange={(e) => setPhoneVisible(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Email Visibility */}
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 pr-4">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Show Email Address in Directory
              </label>
              <p className="text-xs text-slate-500">
                Disabled by default. Allows residents to see your email address on the directory card.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailVisible}
              onChange={(e) => setEmailVisible(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Neighbor Chat */}
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 pr-4">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-600" />
                Allow Neighbor Direct Messaging
              </label>
              <p className="text-xs text-slate-500">
                Permits other residents in your wing or society to start direct peer messages.
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowChat}
              onChange={(e) => setAllowChat(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-md shadow-blue-500/20"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Privacy Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

