"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Mail, MessageSquare, Bell, AlertCircle, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreferenceRow {
  category: "SECURITY" | "BILLING" | "COMPLAINTS" | "NOTICES" | "AMENITIES" | "EVENTS" | "GENERAL";
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
}

const CATEGORY_META: Record<string, { label: string; desc: string; mandatoryInApp?: boolean }> = {
  SECURITY: {
    label: "Security & Visitor Alerts",
    desc: "Gate arrivals, pre-approved pass-codes, emergency announcements. In-app alerts are strictly mandatory.",
    mandatoryInApp: true,
  },
  BILLING: {
    label: "Maintenance & Financial",
    desc: "Invoices, payment receipts, balance reminders, and billing cycle announcements.",
  },
  COMPLAINTS: {
    label: "Helpdesk & Complaints",
    desc: "Ticket assignments, engineer notes, and status updates on your maintenance requests.",
  },
  NOTICES: {
    label: "Official Notices & Circulars",
    desc: "Society board circulars, policy changes, and official announcements.",
  },
  AMENITIES: {
    label: "Amenity Bookings",
    desc: "Booking confirmations, slot updates, and facility schedule notices.",
  },
  EVENTS: {
    label: "Community Events",
    desc: "Society festival celebrations, community workshops, and sports tournaments.",
  },
  GENERAL: {
    label: "General Announcements",
    desc: "Routine society broadcasts, meetings, and general communications.",
  },
};

export default function ResidentNotificationSettingsPage() {
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/resident/notifications/preferences");
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const toggleChannel = (cat: string, channel: keyof PreferenceRow) => {
    setPreferences((prev) =>
      prev.map((row) => {
        if (row.category !== cat) return row;
        // Never allow disabling in_app for SECURITY
        if (cat === "SECURITY" && channel === "in_app_enabled") return row;
        return {
          ...row,
          [channel]: !row[channel],
        };
      })
    );
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      setStatusMsg(null);
      const res = await fetch("/api/resident/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      if (res.ok) {
        setStatusMsg({ type: "success", text: "Notification preferences updated successfully." });
      } else {
        const data = await res.json();
        setStatusMsg({ type: "error", text: data.error || "Failed to update preferences." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs">Loading notification preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Notification Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize how you receive alerts across in-app notifications, email, and mobile channels.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center space-x-3 text-sm ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Preferences Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {preferences.map((pref) => {
            const meta = CATEGORY_META[pref.category] || {
              label: pref.category,
              desc: "Notifications for this category",
            };

            return (
              <div
                key={pref.category}
                className="p-5 sm:flex sm:items-center sm:justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
              >
                <div className="max-w-md mb-4 sm:mb-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {meta.label}
                    </span>
                    {meta.mandatoryInApp && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Mandatory In-App</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {meta.desc}
                  </p>
                </div>

                {/* Channel Toggles */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4 shrink-0">
                  {/* In-App */}
                  <button
                    type="button"
                    onClick={() => toggleChannel(pref.category, "in_app_enabled")}
                    disabled={meta.mandatoryInApp}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[11px] font-medium transition ${
                      pref.in_app_enabled
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                        : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                    } ${meta.mandatoryInApp ? "cursor-not-allowed opacity-80" : "hover:scale-105"}`}
                    title={meta.mandatoryInApp ? "Mandatory for campus safety" : "Toggle In-App"}
                  >
                    <Bell className="w-4 h-4 mb-1" />
                    <span>In-App</span>
                  </button>

                  {/* Email */}
                  <button
                    type="button"
                    onClick={() => toggleChannel(pref.category, "email_enabled")}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[11px] font-medium transition hover:scale-105 ${
                      pref.email_enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                        : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <Mail className="w-4 h-4 mb-1" />
                    <span>Email</span>
                  </button>

                  {/* SMS */}
                  <button
                    type="button"
                    onClick={() => toggleChannel(pref.category, "sms_enabled")}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[11px] font-medium transition hover:scale-105 ${
                      pref.sms_enabled
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                        : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 mb-1" />
                    <span>SMS</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => toggleChannel(pref.category, "whatsapp_enabled")}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[11px] font-medium transition hover:scale-105 ${
                      pref.whatsapp_enabled
                        ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300"
                        : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 mb-1" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-semibold shadow-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
