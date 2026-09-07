"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Shield,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building,
} from "lucide-react";
import { SocietyMeeting, Committee, RoleId, MeetingType } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MeetingsListClientProps {
  societyId: string;
  initialMeetings: SocietyMeeting[];
  committees: Committee[];
  eligibleMembers: any[];
  userRole: RoleId;
}

export function MeetingsListClient({
  societyId,
  initialMeetings,
  committees,
  eligibleMembers,
  userRole,
}: MeetingsListClientProps) {
  const [meetings, setMeetings] = useState<SocietyMeeting[]>(initialMeetings);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isManagement = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY"].includes(userRole);

  const [form, setForm] = useState({
    title: "",
    meeting_type: "MANAGING_COMMITTEE" as MeetingType,
    committee_id: committees.length > 0 ? committees[0].id : "",
    presiding_officer_id: "",
    scheduled_at: "",
    duration_minutes: 60,
    location_type: "PHYSICAL",
    location_details: "Society Clubhouse / Boardroom",
    meeting_link: "",
    quorum_required: 0,
    agenda: "",
  });

  const filteredMeetings = meetings.filter((m) => {
    if (filterType === "ALL") return true;
    if (filterType === "COMMITTEE") return m.meeting_type === "MANAGING_COMMITTEE" || m.meeting_type === "SUB_COMMITTEE";
    if (filterType === "GENERAL") return ["AGM", "EGM", "GENERAL"].includes(m.meeting_type);
    return m.meeting_type === filterType;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "IN_PROGRESS":
        return "warning";
      case "CANCELLED":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, any> = {
        title: form.title,
        meeting_type: form.meeting_type,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
        duration_minutes: Number(form.duration_minutes),
        location_type: form.location_type,
        location_details: form.location_details || null,
        meeting_link: form.meeting_link || null,
        quorum_required: Number(form.quorum_required),
        agenda: form.agenda || null,
      };

      if (form.committee_id && (form.meeting_type === "MANAGING_COMMITTEE" || form.meeting_type === "SUB_COMMITTEE")) {
        payload.committee_id = form.committee_id;
      }

      if (form.presiding_officer_id) {
        payload.presiding_officer_id = form.presiding_officer_id;
      }

      const res = await fetch(`/api/society/${societyId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to schedule meeting");
      }

      setMeetings([data.meeting, ...meetings]);
      setShowScheduleModal(false);
      setForm({
        title: "",
        meeting_type: "MANAGING_COMMITTEE",
        committee_id: committees.length > 0 ? committees[0].id : "",
        presiding_officer_id: "",
        scheduled_at: "",
        duration_minutes: 60,
        location_type: "PHYSICAL",
        location_details: "Society Clubhouse / Boardroom",
        meeting_link: "",
        quorum_required: 0,
        agenda: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Society & Committee Meetings
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Convening constitutional sessions, quorum tracking, official minutes, and action items.
          </p>
        </div>

        {isManagement && (
          <Button
            onClick={() => setShowScheduleModal(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: "ALL", label: "All Sessions" },
          { key: "COMMITTEE", label: "Committee Sessions" },
          { key: "GENERAL", label: "General Body (AGM/EGM)" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === tab.key
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMeetings.map((m) => {
          const scheduledDate = new Date(m.scheduled_at);
          const dateStr = scheduledDate.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const timeStr = scheduledDate.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <Card
              key={m.id}
              className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="purple" className="text-[10px] font-mono">
                    {m.meeting_type.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(m.status)} className="text-[10px]">
                    {m.status}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {m.title}
                </CardTitle>
                {m.committee && (
                  <CardDescription className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3" />
                    <span>{m.committee.name}</span>
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3 text-xs pt-0">
                <div className="space-y-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{dateStr} at {timeStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Duration: {m.duration_minutes} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.location_type === "ONLINE" ? (
                      <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">
                      {m.location_details || (m.location_type === "ONLINE" ? "Virtual Meeting" : "Society Boardroom")}
                    </span>
                  </div>
                </div>

                {/* Quorum & Officer Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Quorum: {(m.quorum_required ?? 0) > 0 ? `${m.quorum_required} required` : "Auto"}
                  </span>
                  {m.quorum_met ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Met
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">Pending / Quorum</span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <Link href={`/society/${societyId}/meetings/${m.id}`} className="block w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 justify-between font-semibold">
                      <span>Open Meeting Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredMeetings.length === 0 && (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">
              No meetings found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No meetings recorded matching the selected filter. Schedule a meeting to initiate formal committee proceedings.
            </p>
          </div>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Schedule Governance Meeting
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleScheduleMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q2 Managing Committee Executive Review"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Meeting Type *
                  </label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) => setForm({ ...form, meeting_type: e.target.value as MeetingType })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="MANAGING_COMMITTEE">Managing Committee</option>
                    <option value="SUB_COMMITTEE">Sub-Committee</option>
                    <option value="AGM">Annual General Meeting (AGM)</option>
                    <option value="EGM">Extraordinary General Meeting (EGM)</option>
                    <option value="GENERAL">General Body Meeting</option>
                    <option value="VENDOR">Vendor Review</option>
                  </select>
                </div>

                {(form.meeting_type === "MANAGING_COMMITTEE" || form.meeting_type === "SUB_COMMITTEE") && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Target Committee *
                    </label>
                    <select
                      value={form.committee_id}
                      onChange={(e) => setForm({ ...form, committee_id: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {committees.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Location Format
                  </label>
                  <select
                    value={form.location_type}
                    onChange={(e) => setForm({ ...form, location_type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="PHYSICAL">Physical Location</option>
                    <option value="ONLINE">Virtual Conference</option>
                    <option value="HYBRID">Hybrid (Physical + Virtual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Presiding Officer (Optional)
                  </label>
                  <select
                    value={form.presiding_officer_id}
                    onChange={(e) => setForm({ ...form, presiding_officer_id: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Society President / Secretary --</option>
                    {eligibleMembers.map((m: any) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.display_name || "Member"} ({m.role_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Location Details / Virtual Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Society Clubhouse, Floor 1 OR Google Meet URL"
                  value={form.location_details}
                  onChange={(e) => setForm({ ...form, location_details: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Quorum Required (0 = Automatic based on voting members)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.quorum_required}
                  onChange={(e) => setForm({ ...form, quorum_required: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Initial Agenda Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Topics for discussion..."
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {submitting ? "Scheduling..." : "Schedule Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
