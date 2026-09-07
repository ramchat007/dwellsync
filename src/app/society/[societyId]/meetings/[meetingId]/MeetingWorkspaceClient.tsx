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
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Play,
  CheckSquare,
  Ban,
  Plus,
  Lock,
  FileText,
  ListOrdered,
  UserCheck,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import {
  SocietyMeeting,
  MeetingStatus,
  MeetingAgenda,
  MeetingAttendee,
  MeetingMinutes,
  MeetingActionItem,
  AgendaStatus,
  ActionItemStatus,
  RoleId,
} from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MeetingWorkspaceClientProps {
  societyId: string;
  initialMeeting: SocietyMeeting;
  eligibleMembers: any[];
  userRole: RoleId;
  currentUserId: string;
}

export function MeetingWorkspaceClient({
  societyId,
  initialMeeting,
  eligibleMembers,
  userRole,
  currentUserId,
}: MeetingWorkspaceClientProps) {
  const [meeting, setMeeting] = useState<SocietyMeeting>(initialMeeting);
  const [activeTab, setActiveTab] = useState<"overview" | "agendas" | "attendance" | "minutes" | "action_items">("overview");

  // Lifecycle loading
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  // Agendas state
  const [agendas, setAgendas] = useState<MeetingAgenda[]>(initialMeeting.agendas || []);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [agendaForm, setAgendaForm] = useState({
    title: "",
    description: "",
    presenter: "",
    duration_minutes: 15,
  });
  const [submittingAgenda, setSubmittingAgenda] = useState(false);

  // Attendance state
  const [attendees, setAttendees] = useState<MeetingAttendee[]>(initialMeeting.attendees || []);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<{
    attendees: Array<{
      user_id?: string;
      attendee_type: "COMMITTEE_MEMBER" | "RESIDENT" | "INVITEE";
      status: "PRESENT" | "ABSENT" | "EXCUSED";
      notes?: string;
    }>;
  }>({
    attendees: [],
  });
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Minutes state
  const existingMinutes = Array.isArray(initialMeeting.minutes)
    ? initialMeeting.minutes[0]
    : (initialMeeting.minutes || null);
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(existingMinutes);
  const [minutesForm, setMinutesForm] = useState({
    content_summary: existingMinutes?.content_summary || "",
    decisions_summary: existingMinutes?.decisions_summary || "",
  });
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [publishingMinutes, setPublishingMinutes] = useState(false);
  const [minutesMsg, setMinutesMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Action Items state
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>(initialMeeting.action_items || []);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
  });
  const [submittingAction, setSubmittingAction] = useState(false);

  const isManagement = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "CHAIRMAN", "TREASURER"].includes(userRole);
  const isTerminal = meeting.status === "COMPLETED" || meeting.status === "CANCELLED";
  const isMinutesPublished = minutes?.status === "PUBLISHED";

  // --- Handlers: Lifecycle ---
  const handleUpdateStatus = async (newStatus: MeetingStatus) => {
    if (!confirm(`Are you sure you want to change the meeting status to ${newStatus}?`)) return;

    setLifecycleLoading(true);
    setLifecycleError(null);
    try {
      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Failed to transition meeting to ${newStatus}`);
      }

      setMeeting(json.data);
    } catch (err: any) {
      setLifecycleError(err.message || "Error updating meeting lifecycle");
    } finally {
      setLifecycleLoading(false);
    }
  };

  // --- Handlers: Agendas ---
  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAgenda(true);
    try {
      const payload = {
        title: agendaForm.title,
        description: agendaForm.description || null,
        presenter: agendaForm.presenter || null,
        duration_minutes: Number(agendaForm.duration_minutes) || null,
        item_order: agendas.length + 1,
      };

      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/agendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add agenda item");

      setAgendas((prev) => [...prev, json.data]);
      setShowAddAgendaModal(false);
      setAgendaForm({ title: "", description: "", presenter: "", duration_minutes: 15 });
    } catch (err: any) {
      alert(err.message || "Failed to add agenda");
    } finally {
      setSubmittingAgenda(false);
    }
  };

  const handleUpdateAgendaStatus = async (agendaId: string, newStatus: AgendaStatus) => {
    try {
      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/agendas/${agendaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update agenda status");

      setAgendas((prev) => prev.map((a) => (a.id === agendaId ? json.data : a)));
    } catch (err: any) {
      alert(err.message || "Failed to update agenda item");
    }
  };

  // --- Handlers: Attendance ---
  const openAttendanceModal = () => {
    // Populate form with existing attendance or initialize from eligible members
    const initialList = eligibleMembers.map((m) => {
      const existing = attendees.find((a) => a.user_id === m.user_id);
      return {
        user_id: m.user_id,
        name: m.profile?.full_name || m.profile?.display_name || "Unknown Member",
        role: m.role,
        attendee_type: (m.role?.includes("SECRETARY") || m.role?.includes("CHAIRMAN") || m.role?.includes("COMMITTEE")
          ? "COMMITTEE_MEMBER"
          : "RESIDENT") as "COMMITTEE_MEMBER" | "RESIDENT",
        status: (existing ? existing.status : "ABSENT") as "PRESENT" | "ABSENT" | "EXCUSED",
        notes: existing?.notes || "",
      };
    });
    setAttendanceForm({ attendees: initialList });
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    setSubmittingAttendance(true);
    try {
      const payload = {
        attendees: attendanceForm.attendees.map((a) => ({
          user_id: a.user_id,
          attendee_type: a.attendee_type,
          status: a.status,
          notes: a.notes || undefined,
        })),
      };

      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record attendance");

      setAttendees(json.data.attendees || []);
      setMeeting((prev) => ({
        ...prev,
        quorum_met: json.data.quorum_met,
      }));
      setShowAttendanceModal(false);
    } catch (err: any) {
      alert(err.message || "Error saving attendance");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // --- Handlers: Minutes ---
  const handleSaveDraftMinutes = async () => {
    if (isMinutesPublished) return;
    setSavingMinutes(true);
    setMinutesMsg(null);

    try {
      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minutesForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save draft minutes");

      setMinutes(json.data);
      setMinutesMsg({ type: "success", text: "Draft minutes saved successfully." });
    } catch (err: any) {
      setMinutesMsg({ type: "error", text: err.message || "Error saving draft minutes" });
    } finally {
      setSavingMinutes(false);
    }
  };

  const handlePublishMinutes = async () => {
    if (isMinutesPublished) return;
    const confirmPublish = confirm(
      "WARNING: Publishing official minutes will seal this record permanently. Published minutes become visible to society members and CANNOT be edited or returned to draft. Proceed?"
    );
    if (!confirmPublish) return;

    setPublishingMinutes(true);
    setMinutesMsg(null);

    try {
      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/minutes/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to publish minutes");

      setMinutes(json.data);
      setMinutesMsg({ type: "success", text: "Official minutes published and sealed successfully." });
    } catch (err: any) {
      setMinutesMsg({ type: "error", text: err.message || "Error publishing minutes" });
    } finally {
      setPublishingMinutes(false);
    }
  };

  // --- Handlers: Action Items ---
  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const payload = {
        title: actionForm.title,
        description: actionForm.description || null,
        assigned_to: actionForm.assigned_to || null,
        due_date: actionForm.due_date || null,
      };

      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create action item");

      setActionItems((prev) => [...prev, json.data]);
      setShowAddActionModal(false);
      setActionForm({ title: "", description: "", assigned_to: "", due_date: "" });
    } catch (err: any) {
      alert(err.message || "Failed to create action item");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateActionStatus = async (actionItemId: string, newStatus: ActionItemStatus) => {
    try {
      const res = await fetch(`/api/society/${societyId}/meetings/${meeting.id}/action-items/${actionItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update action item status");

      setActionItems((prev) => prev.map((a) => (a.id === actionItemId ? json.data : a)));
    } catch (err: any) {
      alert(err.message || "Failed to update action item");
    }
  };

  const presentCount = attendees.filter((a) => a.status === "PRESENT").length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Top Breadcrumb & Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/society/${societyId}/meetings`}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Meetings & Proceedings
        </Link>

        {/* Meeting Status & Lifecycle Transitions */}
        <div className="flex items-center gap-3">
          <Badge
            variant={
              meeting.status === "COMPLETED"
                ? "success"
                : meeting.status === "IN_PROGRESS"
                ? "warning"
                : meeting.status === "CANCELLED"
                ? "destructive"
                : "default"
            }
            className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1"
          >
            {meeting.status}
          </Badge>

          {isManagement && !isTerminal && (
            <div className="flex items-center gap-2">
              {meeting.status === "SCHEDULED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                  disabled={lifecycleLoading}
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                  Start Meeting
                </Button>
              )}

              {meeting.status === "IN_PROGRESS" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  disabled={lifecycleLoading}
                  onClick={() => handleUpdateStatus("COMPLETED")}
                >
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  Complete Meeting
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50"
                disabled={lifecycleLoading}
                onClick={() => handleUpdateStatus("CANCELLED")}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {lifecycleError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
          <span>{lifecycleError}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {meeting.meeting_type.replace(/_/g, " ")}
              </span>
              {meeting.committee && (
                <span className="text-xs font-medium text-slate-500">
                  • {meeting.committee.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 pt-1">
              <div className="flex items-center">
                <Calendar className="mr-1.5 h-4 w-4 text-slate-400" />
                {new Date(meeting.scheduled_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center">
                <Clock className="mr-1.5 h-4 w-4 text-slate-400" />
                {new Date(meeting.scheduled_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ({meeting.duration_minutes} mins)
              </div>
              <div className="flex items-center">
                {meeting.location_type === "ONLINE" ? (
                  <Video className="mr-1.5 h-4 w-4 text-slate-400" />
                ) : (
                  <MapPin className="mr-1.5 h-4 w-4 text-slate-400" />
                )}
                <span>{meeting.location_details || meeting.location_type}</span>
                {meeting.meeting_link && (
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 inline-flex items-center text-indigo-600 hover:underline"
                  >
                    Join <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quorum Summary Banner */}
          <div className="flex items-center gap-4 bg-slate-50 border p-4 rounded-xl shrink-0">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Quorum Status
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {presentCount} / {meeting.quorum_required}
                </span>
                {meeting.quorum_met ? (
                  <Badge variant="success" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" /> Quorum Met
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" /> Quorum Not Met
                  </Badge>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {meeting.quorum_required === 0
                  ? "No minimum quorum set"
                  : `${meeting.quorum_required} attendees required for formal decisions`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b mb-6 flex space-x-8 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("agendas")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "agendas"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
          Agenda ({agendas.length})
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "attendance"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Attendance & Quorum ({presentCount})
        </button>
        <button
          onClick={() => setActiveTab("minutes")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "minutes"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          Minutes & Decisions
          {isMinutesPublished && <Lock className="h-3.5 w-3.5 text-emerald-600" />}
        </button>
        <button
          onClick={() => setActiveTab("action_items")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "action_items"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Action Items ({actionItems.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Meeting Summary & Purpose</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {meeting.agenda ? (
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-lg border">
                      {meeting.agenda}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      No initial overview provided for this meeting.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border rounded-xl">
                  <div className="text-xs font-medium text-slate-500">Agendas Listed</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{agendas.length}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {agendas.filter((a) => a.status === "DISCUSSED").length} discussed
                  </div>
                </div>
                <div className="p-4 bg-white border rounded-xl">
                  <div className="text-xs font-medium text-slate-500">Recorded Attendees</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{presentCount}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {meeting.quorum_met ? "Formal Quorum Met" : "Quorum Pending"}
                  </div>
                </div>
                <div className="p-4 bg-white border rounded-xl">
                  <div className="text-xs font-medium text-slate-500">Action Items</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{actionItems.length}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {actionItems.filter((a) => a.status === "COMPLETED").length} completed
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Officers & Administration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Presiding Officer</span>
                    <span className="font-medium text-slate-800">
                      {meeting.presiding_officer?.full_name ||
                        meeting.presiding_officer?.display_name ||
                        "Not assigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Organized By</span>
                    <span className="font-medium text-slate-800">
                      {meeting.organizer?.full_name ||
                        meeting.organizer?.display_name ||
                        "Society Administration"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Committee</span>
                    <span className="font-medium text-slate-800">
                      {meeting.committee?.name || "General Society Meeting"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Official Minutes Status</span>
                    <span className="font-medium text-slate-800">
                      {isMinutesPublished ? "Published & Sealed" : "Draft / Pending"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: AGENDAS */}
        {activeTab === "agendas" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Meeting Agenda</h3>
                <p className="text-sm text-slate-500">
                  Ordered sequence of topics scheduled for discussion.
                </p>
              </div>
              {isManagement && !isTerminal && (
                <Button onClick={() => setShowAddAgendaModal(true)} size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add Agenda Topic
                </Button>
              )}
            </div>

            {agendas.length === 0 ? (
              <div className="p-8 text-center bg-white border rounded-xl text-slate-500">
                <ListOrdered className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No agenda topics added yet.</p>
                {isManagement && !isTerminal && (
                  <Button
                    onClick={() => setShowAddAgendaModal(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Add First Agenda Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {agendas.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 mt-0.5">
                        {item.item_order || idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                          {item.presenter && <span>Presenter: {item.presenter}</span>}
                          {item.duration_minutes && <span>Est: {item.duration_minutes} mins</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={
                          item.status === "DISCUSSED"
                            ? "success"
                            : item.status === "DEFERRED"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>

                      {isManagement && !isTerminal && (
                        <div className="flex items-center gap-1.5">
                          {item.status !== "DISCUSSED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-emerald-600 hover:bg-emerald-50 h-8"
                              onClick={() => handleUpdateAgendaStatus(item.id, "DISCUSSED")}
                            >
                              Mark Discussed
                            </Button>
                          )}
                          {item.status !== "DEFERRED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-slate-500 hover:bg-slate-100 h-8"
                              onClick={() => handleUpdateAgendaStatus(item.id, "DEFERRED")}
                            >
                              Defer
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATTENDANCE & QUORUM */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Attendance & Quorum Verification</h3>
                <p className="text-sm text-slate-500">
                  Track member presence and verify governance quorum requirements.
                </p>
              </div>
              {isManagement && !isTerminal && (
                <Button onClick={openAttendanceModal} size="sm">
                  <UserCheck className="mr-1.5 h-4 w-4" /> Record / Update Attendance
                </Button>
              )}
            </div>

            {/* Quorum status indicator box */}
            <div className="p-4 bg-white border rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Formal Quorum Evaluation
                </div>
                <div className="text-sm text-slate-700 mt-1">
                  Required Quorum: <strong>{meeting.quorum_required}</strong> | Present Members:{" "}
                  <strong>{presentCount}</strong>
                </div>
              </div>
              <div>
                {meeting.quorum_met ? (
                  <Badge variant="success" className="px-3 py-1.5 text-xs font-semibold gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Quorum Satisfied
                  </Badge>
                ) : (
                  <Badge variant="warning" className="px-3 py-1.5 text-xs font-semibold gap-1">
                    <AlertCircle className="h-4 w-4" /> Quorum Not Met
                  </Badge>
                )}
              </div>
            </div>

            {/* Attendees list */}
            {attendees.length === 0 ? (
              <div className="p-8 text-center bg-white border rounded-xl text-slate-500">
                <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No attendance records submitted yet.</p>
                {isManagement && !isTerminal && (
                  <Button onClick={openAttendanceModal} variant="outline" size="sm" className="mt-3">
                    Record Attendance Roll
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Member</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Marked At</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendees.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {att.profile?.full_name || att.profile?.display_name || "Guest / Invitee"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-medium">
                            {att.attendee_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              att.status === "PRESENT"
                                ? "success"
                                : att.status === "EXCUSED"
                                ? "outline"
                                : "destructive"
                            }
                            className="text-xs font-medium"
                          >
                            {att.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {att.marked_at ? new Date(att.marked_at).toLocaleTimeString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{att.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINUTES & DECISIONS */}
        {activeTab === "minutes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Official Meeting Minutes</h3>
                <p className="text-sm text-slate-500">
                  Document key discussions, formal proceedings, and statutory decisions.
                </p>
              </div>
              {isMinutesPublished && (
                <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  Official Sealed Record (Read-Only)
                </div>
              )}
            </div>

            {minutesMsg && (
              <div
                className={`p-4 rounded-lg text-sm border flex items-center gap-2 ${
                  minutesMsg.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {minutesMsg.type === "success" ? (
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>{minutesMsg.text}</span>
              </div>
            )}

            {isMinutesPublished ? (
              /* Published immutable view */
              <div className="bg-white border rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                  <div>
                    <span className="text-xs text-slate-500">Status</span>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                      <Shield className="h-4 w-4" /> PUBLISHED & SEALED
                    </div>
                  </div>
                  {minutes?.published_at && (
                    <div>
                      <span className="text-xs text-slate-500">Published Timestamp</span>
                      <div className="text-sm font-medium text-slate-800 mt-0.5">
                        {new Date(minutes.published_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {minutes?.publisher && (
                    <div>
                      <span className="text-xs text-slate-500">Published By</span>
                      <div className="text-sm font-medium text-slate-800 mt-0.5">
                        {minutes.publisher.full_name || minutes.publisher.display_name}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Discussion Summary</h4>
                  <div className="p-4 bg-slate-50 border rounded-lg text-sm text-slate-800 whitespace-pre-wrap">
                    {minutes?.content_summary || "No discussion summary recorded."}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Decisions & Resolutions</h4>
                  <div className="p-4 bg-slate-50 border rounded-lg text-sm text-slate-800 whitespace-pre-wrap">
                    {minutes?.decisions_summary || "No decisions formally recorded."}
                  </div>
                </div>
              </div>
            ) : (
              /* Editable draft view for management */
              <div className="bg-white border rounded-xl p-6 space-y-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-900">
                    Discussion & Proceedings Summary
                  </label>
                  <p className="text-xs text-slate-500">
                    Detailed summary of matters discussed, reports presented, and deliberation.
                  </p>
                  <textarea
                    rows={8}
                    value={minutesForm.content_summary}
                    onChange={(e) =>
                      setMinutesForm({ ...minutesForm, content_summary: e.target.value })
                    }
                    placeholder="Enter meeting proceedings and discussions..."
                    className="w-full mt-2 rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!isManagement}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-900">
                    Decisions & Resolutions Summary
                  </label>
                  <p className="text-xs text-slate-500">
                    Specific decisions agreed upon by the committee during this session.
                  </p>
                  <textarea
                    rows={6}
                    value={minutesForm.decisions_summary}
                    onChange={(e) =>
                      setMinutesForm({ ...minutesForm, decisions_summary: e.target.value })
                    }
                    placeholder="Enter formal decisions, votes, and outcomes..."
                    className="w-full mt-2 rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!isManagement}
                  />
                </div>

                {isManagement && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraftMinutes}
                      disabled={savingMinutes || publishingMinutes}
                    >
                      {savingMinutes ? "Saving..." : "Save Draft"}
                    </Button>

                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handlePublishMinutes}
                      disabled={savingMinutes || publishingMinutes}
                    >
                      <Lock className="mr-1.5 h-4 w-4" />
                      {publishingMinutes ? "Publishing..." : "Publish Official Minutes"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACTION ITEMS */}
        {activeTab === "action_items" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Action Items & Deliverables</h3>
                <p className="text-sm text-slate-500">
                  Assign administrative tasks resulting from meeting proceedings.
                </p>
              </div>
              {isManagement && !isTerminal && (
                <Button onClick={() => setShowAddActionModal(true)} size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add Action Item
                </Button>
              )}
            </div>

            {actionItems.length === 0 ? (
              <div className="p-8 text-center bg-white border rounded-xl text-slate-500">
                <CheckSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No action items assigned for this meeting.</p>
                {isManagement && !isTerminal && (
                  <Button
                    onClick={() => setShowAddActionModal(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Assign First Action Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item) => {
                  const isAssignee = item.assigned_to === currentUserId;
                  const canEditStatus = isManagement || isAssignee;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-semibold text-slate-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                          <span>
                            Assignee:{" "}
                            <strong>
                              {item.assignee?.full_name ||
                                item.assignee?.display_name ||
                                "Unassigned"}
                            </strong>
                          </span>
                          {item.due_date && (
                            <span>
                              Due:{" "}
                              <strong>{new Date(item.due_date).toLocaleDateString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant={
                            item.status === "COMPLETED"
                              ? "success"
                              : item.status === "IN_PROGRESS"
                              ? "warning"
                              : item.status === "CANCELLED"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>

                        {canEditStatus && (
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleUpdateActionStatus(item.id, e.target.value as ActionItemStatus)
                            }
                            className="text-xs border rounded-lg px-2 py-1 bg-white text-slate-700"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD AGENDA ITEM */}
      {showAddAgendaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Agenda Item</h3>
              <button
                onClick={() => setShowAddAgendaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAgenda} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Item Title *</label>
                <input
                  required
                  type="text"
                  value={agendaForm.title}
                  onChange={(e) => setAgendaForm({ ...agendaForm, title: e.target.value })}
                  placeholder="e.g. Annual Budget Presentation"
                  className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={agendaForm.description}
                  onChange={(e) => setAgendaForm({ ...agendaForm, description: e.target.value })}
                  placeholder="Summary of matters to be discussed..."
                  className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Presenter</label>
                  <input
                    type="text"
                    value={agendaForm.presenter}
                    onChange={(e) => setAgendaForm({ ...agendaForm, presenter: e.target.value })}
                    placeholder="e.g. Treasurer"
                    className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Est. Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={agendaForm.duration_minutes}
                    onChange={(e) =>
                      setAgendaForm({ ...agendaForm, duration_minutes: Number(e.target.value) })
                    }
                    className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddAgendaModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingAgenda}>
                  {submittingAgenda ? "Adding..." : "Add Agenda"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD ATTENDANCE ROLL */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Meeting Attendance</h3>
                <p className="text-xs text-slate-500">
                  Mark members present, absent, or excused to update quorum calculations.
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2">
              {attendanceForm.attendees.map((att: any, idx: number) => (
                <div
                  key={att.user_id || idx}
                  className="p-3 border rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-sm text-slate-900">{att.name}</div>
                    <div className="text-xs text-slate-400">{att.role}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={att.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        setAttendanceForm((prev) => {
                          const copy = [...prev.attendees];
                          copy[idx] = { ...copy[idx], status: newStatus };
                          return { attendees: copy };
                        });
                      }}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border ${
                        att.status === "PRESENT"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : att.status === "EXCUSED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="EXCUSED">EXCUSED</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAttendanceModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAttendance} disabled={submittingAttendance}>
                {submittingAttendance ? "Saving..." : "Save Attendance & Verify Quorum"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD ACTION ITEM */}
      {showAddActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Action Item</h3>
              <button
                onClick={() => setShowAddActionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddActionItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                <input
                  required
                  type="text"
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  placeholder="e.g. Issue vendor RFP for elevator overhaul"
                  className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  placeholder="Detailed instructions or context for this action item..."
                  className="w-full mt-1 border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Assign To</label>
                  <select
                    value={actionForm.assigned_to}
                    onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}
                    className="w-full mt-1 border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.display_name || m.user_id} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={actionForm.due_date}
                    onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                    className="w-full mt-1 border rounded-lg p-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddActionModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingAction}>
                  {submittingAction ? "Assigning..." : "Assign Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
