"use client";

import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Ban,
  Tag,
} from "lucide-react";

interface EventsAdminClientProps {
  initialEvents: any[];
  initialMeetings: any[];
  societyDocuments: any[];
  societyId: string;
}

export function EventsAdminClient({
  initialEvents,
  initialMeetings,
  societyDocuments,
  societyId,
}: EventsAdminClientProps) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [activeTab, setActiveTab] = useState<"EVENTS" | "MEETINGS">("EVENTS");

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Event Form
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    category: "CELEBRATION",
    event_date: new Date().toISOString().split("T")[0],
    start_time: "18:00",
    end_time: "21:00",
    location: "Main Clubhouse Lawn",
    organizer_name: "Cultural Committee",
    visibility: "ALL_RESIDENTS",
  });

  // Meeting Form
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    agenda: "",
    meeting_type: "AGM",
    location_type: "PHYSICAL",
    location_details: "Society Community Hall",
    meeting_link: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
    duration_minutes: 60,
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule event.");

      setEvents([data.event, ...events]);
      setIsEventModalOpen(false);
      setEventForm({
        title: "",
        description: "",
        category: "CELEBRATION",
        event_date: new Date().toISOString().split("T")[0],
        start_time: "18:00",
        end_time: "21:00",
        location: "Main Clubhouse Lawn",
        organizer_name: "Cultural Committee",
        visibility: "ALL_RESIDENTS",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule meeting.");

      setMeetings([data.meeting, ...meetings]);
      setIsMeetingModalOpen(false);
      setMeetingForm({
        title: "",
        agenda: "",
        meeting_type: "AGM",
        location_type: "PHYSICAL",
        location_details: "Society Community Hall",
        meeting_link: "",
        scheduled_at: new Date().toISOString().slice(0, 16),
        duration_minutes: 60,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to cancel this event?")) return;
    try {
      const res = await fetch(`/api/society/${societyId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel event.");
      setEvents(events.map((e) => (e.id === eventId ? data.event : e)));
    } catch (err: any) {
      alert(err.message || "Error cancelling event.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Events & Meetings Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule community festivals, committee sessions, and statutory Annual General Meetings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
          <button
            onClick={() => setIsMeetingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting / AGM</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("EVENTS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "EVENTS"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Community Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("MEETINGS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "MEETINGS"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Society Meetings & AGMs ({meetings.length})
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === "EVENTS" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {events.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No events scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Visibility</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                        <div>{ev.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 font-normal mt-0.5">
                          {ev.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{ev.category}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{ev.event_date}</div>
                        <div className="text-[10px] text-slate-400">
                          {ev.start_time || "TBD"} {ev.end_time ? `- ${ev.end_time}` : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{ev.location}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {ev.visibility}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            ev.status === "UPCOMING"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {ev.status === "UPCOMING" && (
                          <button
                            onClick={() => handleCancelEvent(ev.id)}
                            className="text-rose-600 hover:underline font-semibold"
                          >
                            Cancel
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
      )}

      {/* Meetings Tab */}
      {activeTab === "MEETINGS" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No society meetings scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Meeting Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Format / Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Official Minutes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                        <div>{m.title}</div>
                        {m.agenda && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 font-normal mt-0.5">
                            {m.agenda}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {m.meeting_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {new Date(m.scheduled_at).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{m.location_type}</span>
                        {m.location_details && (
                          <div className="text-[10px] text-slate-400">{m.location_details}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            m.status === "SCHEDULED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.minutes_document ? (
                          <span className="text-purple-700 font-semibold text-[11px] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {m.minutes_document.title}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not Attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Schedule Community Event</h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
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

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Community Gala & Dinner"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="CELEBRATION">Celebration / Festival</option>
                    <option value="SPORTS">Sports Tournament</option>
                    <option value="CULTURAL">Cultural Event</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="MEETING">Meeting</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={eventForm.visibility}
                    onChange={(e) => setEventForm({ ...eventForm, visibility: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="ALL_RESIDENTS">All Residents</option>
                    <option value="COMMITTEE_ONLY">Committee Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location Venue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Society Central Lawn or Clubhouse"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Event schedule, dress code, catering info..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
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
                  <span>Publish Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Schedule Society Meeting / AGM</h3>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual General Body Meeting (AGM 2026)"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meeting Type *</label>
                  <select
                    value={meetingForm.meeting_type}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="AGM">Annual General Meeting (AGM)</option>
                    <option value="EGM">Extraordinary General Meeting (EGM)</option>
                    <option value="MANAGING_COMMITTEE">Managing Committee</option>
                    <option value="GENERAL">General Resident Meeting</option>
                    <option value="VENDOR">Vendor Review</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format *</label>
                  <select
                    value={meetingForm.location_type}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="PHYSICAL">Physical In-Person</option>
                    <option value="ONLINE">Online Virtual</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={meetingForm.scheduled_at}
                    onChange={(e) => setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    value={meetingForm.duration_minutes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Location Details</label>
                <input
                  type="text"
                  placeholder="e.g. Society Clubhouse Multipurpose Hall"
                  value={meetingForm.location_details}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location_details: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Meeting Link (If Online / Hybrid)</label>
                <input
                  type="text"
                  placeholder="e.g. https://meet.google.com/xyz-abc"
                  value={meetingForm.meeting_link}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_link: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Meeting Agenda Points</label>
                <textarea
                  rows={3}
                  placeholder="1. Approval of annual accounts&#10;2. Lift modernization proposal&#10;3. Security audit report"
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Schedule Meeting</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
