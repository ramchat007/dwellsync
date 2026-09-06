"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Megaphone, Send, Clock, Users, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BroadcastLog {
  id: string;
  title: string;
  body: string;
  category: string;
  type: string;
  created_at: string;
  actor?: { full_name?: string } | null;
}

export default function SocietyBroadcastPage() {
  const params = useParams();
  const societyId = params.societyId as string;

  const [broadcasts, setBroadcasts] = useState<BroadcastLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [targetRole, setTargetRole] = useState("ALL");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBroadcasts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/society/${societyId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    if (societyId) fetchBroadcasts();
  }, [societyId, fetchBroadcasts]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    try {
      setIsSending(true);
      setStatusMsg(null);
      const res = await fetch(`/api/society/${societyId}/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          category,
          target_role: targetRole === "ALL" ? null : targetRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMsg({
          type: "success",
          text: `Broadcast sent successfully to ${data.recipientCount} recipients!`,
        });
        setTitle("");
        setBody("");
        fetchBroadcasts();
      } else {
        const data = await res.json();
        setStatusMsg({
          type: "error",
          text: data.error || "Failed to dispatch broadcast.",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <Megaphone className="w-6 h-6 text-blue-600" />
          <span>Society Broadcast Console</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Send high-priority society announcements and notifications directly to all campus residents.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            New Broadcast
          </h2>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GENERAL">General Notice</option>
                <option value="SECURITY">Emergency / Security Alert</option>
                <option value="BILLING">Maintenance Billing Alert</option>
                <option value="COMPLAINTS">Operational Maintenance</option>
                <option value="EVENTS">Community Event</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Audience
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Residents (Owners & Tenants)</option>
                <option value="OWNER">Owners Only</option>
                <option value="TENANT">Tenants Only</option>
                <option value="COMMITTEE_MEMBER">Managing Committee</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Broadcast Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Scheduled Water Tank Cleaning"
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter the detailed message for all residents..."
                rows={4}
                required
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-xs"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Dispatch Broadcast
                </>
              )}
            </Button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Broadcast History</span>
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading history...
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No broadcasts dispatched yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {broadcasts.map((b) => (
                <div key={b.id} className="py-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {b.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {b.body}
                  </p>
                  <div className="flex items-center space-x-3 pt-1 text-[10px] text-slate-400 font-medium">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {b.category}
                    </span>
                    {b.actor?.full_name && <span>Sent by {b.actor.full_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
