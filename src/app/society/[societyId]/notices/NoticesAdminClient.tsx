"use client";

import React, { useState } from "react";
import {
  Bell,
  Plus,
  Clock,
  User,
  Archive,
  AlertCircle,
  Loader2,
  Tag,
  Flame,
} from "lucide-react";

interface NoticesAdminClientProps {
  initialNotices: any[];
  societyId: string;
}

export function NoticesAdminClient({
  initialNotices,
  societyId,
}: NoticesAdminClientProps) {
  const [notices, setNotices] = useState<any[]>(initialNotices);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
    expires_at: "",
    attachment_url: "",
  });

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish notice.");

      setNotices([data.notice, ...notices]);
      setIsNewModalOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "GENERAL",
        priority: "MEDIUM",
        expires_at: "",
        attachment_url: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveNotice = async (noticeId: string) => {
    setArchivingId(noticeId);
    try {
      const res = await fetch(`/api/society/${societyId}/notices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noticeId,
          status: "ARCHIVED",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive notice.");

      setNotices(notices.map((n) => (n.id === noticeId ? data.notice : n)));
    } catch (err: any) {
      alert(err.message || "Error archiving notice.");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Official Notices & Circulars</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast society circulars, water shutdown alerts, billing notices, and general announcements.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Notice</span>
        </button>
      </div>

      {/* Notices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {notices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No notices published yet in this society.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Title & Notice</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notices.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{n.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal line-clamp-2 mt-0.5 pl-6">
                        {n.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {n.category}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          n.priority === "EMERGENCY"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : n.priority === "HIGH"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {n.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          n.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(n.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {n.status === "PUBLISHED" && (
                        <button
                          onClick={() => handleArchiveNotice(n.id)}
                          disabled={archivingId === n.id}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{archivingId === n.id ? "..." : "Archive"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Notice Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Publish Society Notice</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Supply Interruption for Overhead Tank Cleaning"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="GENERAL">General</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="URGENT">Urgent / Emergency</option>
                    <option value="BILLING">Billing & Dues</option>
                    <option value="EVENT">Event Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency (Red Alert)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Announcement Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide full context, affected wings/floors, timings, and contact personnel..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attachment Link (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://storage.dwellsync.com/notices/water-schedule.pdf"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Broadcast Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
