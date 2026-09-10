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
  Bell,
  Send,
  UserCheck,
  Shield,
  HelpCircle,
  X,
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
  const [successMsg, setSuccessMsg] = useState("");

  // Attendees modal
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<any | null>(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesData, setAttendeesData] = useState<{ summary: any; rsvps: any[] } | null>(null);

  // Dispatch reminders
  const [dispatchingReminders, setDispatchingReminders] = useState(false);

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
    target_audience: "ALL_RESIDENTS",
    capacity: "",
    remind_24h: true,
    remind_2h: true,
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
    setSuccessMsg("");

    try {
      const reminder_offsets: number[] = [];
      if (eventForm.remind_24h) reminder_offsets.push(24);
      if (eventForm.remind_2h) reminder_offsets.push(2);

      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        event_date: eventForm.event_date,
        start_time: eventForm.start_time || undefined,
        end_time: eventForm.end_time || undefined,
        location: eventForm.location,
        organizer_name: eventForm.organizer_name || undefined,
        visibility: eventForm.visibility,
        target_audience: eventForm.target_audience,
        capacity: eventForm.capacity ? parseInt(eventForm.capacity, 10) : undefined,
        status: "PUBLISHED",
        reminder_offsets: reminder_offsets.length > 0 ? reminder_offsets : undefined,
      };

      const res = await fetch(`/api/society/${societyId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule event.");

      const newEvent = {
        ...data.event,
        rsvp_summary: { going: 0, not_going: 0, maybe: 0, total_attendees: 0 },
      };

      setEvents([newEvent, ...events]);
      setIsEventModalOpen(false);
      setSuccessMsg("Event published and scheduled successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);

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
        target_audience: "ALL_RESIDENTS",
        capacity: "",
        remind_24h: true,
        remind_2h: true,
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
    if (!confirm("Are you sure you want to cancel this event? This will also cancel all scheduled reminders.")) return;
    try {
      const res = await fetch(`/api/society/${societyId}/events/${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel event");
      }

      setEvents(
        events.map((e) => (e.id === eventId ? { ...e, status: "CANCELLED" } : e))
      );
      setSuccessMsg("Event cancelled successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to cancel event");
    }
  };

  const handleOpenAttendees = async (event: any) => {
    setSelectedEventForAttendees(event);
    setAttendeesLoading(true);
    setAttendeesData(null);

    try {
      const res = await fetch(`/api/society/${societyId}/events/${event.id}/rsvp`);
      const data = await res.json();
      if (res.ok) {
        setAttendeesData(data);
      } else {
        alert(data.error || "Failed to load attendees");
      }
    } catch (err: any) {
      alert("Network error fetching attendees");
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleDispatchReminders = async () => {
    setDispatchingReminders(true);
    try {
      const res = await fetch(`/api/society/${societyId}/reminders/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Reminders processed.");
      } else {
        alert(data.error || "Failed to dispatch reminders.");
      }
    } catch (err: any) {
      alert("Error dispatching reminders");
    } finally {
      setDispatchingReminders(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Events & Gatherings</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {events.length} Events
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coordinate society celebrations, sports tournaments, capacity limits, RSVPs, and automated reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDispatchReminders}
            disabled={dispatchingReminders}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
            title="Scan and dispatch due event/poll reminders"
          >
            {dispatchingReminders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            <span>Run Reminders</span>
          </button>

          {activeTab === "EVENTS" ? (
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          ) : (
            <button
              onClick={() => setIsMeetingModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Meeting</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("EVENTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "EVENTS"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Community Events & RSVPs ({events.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("MEETINGS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "MEETINGS"
              ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Society Meetings & AGMs ({meetings.length})</span>
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === "EVENTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {events.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No events scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Category & Audience</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">RSVP & Capacity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {events.map((ev) => {
                    const rsvp = ev.rsvp_summary || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 };
                    const isFull = ev.capacity && rsvp.total_attendees >= ev.capacity;

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-xs">
                          <div>{ev.title}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 font-normal mt-0.5">
                            {ev.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">{ev.category}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {ev.target_audience === "OWNERS_ONLY"
                              ? "Owners Exclusive"
                              : ev.target_audience === "COMMITTEE_ONLY"
                              ? "Committee Only"
                              : "All Residents"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{ev.event_date}</div>
                          <div className="text-[10px] text-slate-400">
                            {ev.start_time || "TBD"} {ev.end_time ? `- ${ev.end_time}` : ""}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{ev.location}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {rsvp.total_attendees}
                            </span>
                            <span className="text-slate-400">
                              / {ev.capacity ? `${ev.capacity} Max` : "Unlimited"}
                            </span>
                            {isFull && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                FULL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-emerald-600 font-semibold">{rsvp.going} Going</span>
                            <span>•</span>
                            <span className="text-amber-600 font-semibold">{rsvp.maybe} Maybe</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              ev.status === "PUBLISHED" || ev.status === "UPCOMING"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                                : ev.status === "CANCELLED"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenAttendees(ev)}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
                            >
                              RSVPs
                            </button>
                            {ev.status !== "CANCELLED" && (
                              <button
                                onClick={() => handleCancelEvent(ev.id)}
                                className="text-rose-600 hover:underline font-semibold text-[11px]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === "MEETINGS" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No society meetings scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Meeting Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Format / Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Official Minutes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-xs">
                        <div>{m.title}</div>
                        {m.agenda && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 font-normal mt-0.5">
                            {m.agenda}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                          {m.meeting_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {new Date(m.scheduled_at).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.location_type}</span>
                        {m.location_details && (
                          <div className="text-[10px] text-slate-400">{m.location_details}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            m.status === "SCHEDULED"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.minutes_document ? (
                          <span className="text-purple-700 dark:text-purple-400 font-semibold text-[11px] flex items-center gap-1">
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
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Community Event</h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs"
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Community Gala & Dinner"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Audience *</label>
                  <select
                    value={eventForm.target_audience}
                    onChange={(e) => setEventForm({ ...eventForm, target_audience: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="ALL_RESIDENTS">All Residents</option>
                    <option value="OWNERS_ONLY">Owners Only</option>
                    <option value="COMMITTEE_ONLY">Committee Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Location Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clubhouse Lawn"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Max Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited if left empty"
                    value={eventForm.capacity}
                    onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide details about the gathering, food, dress code, etc."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              {/* Automated Reminders */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>Automated Activity Reminders</span>
                </div>
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.remind_24h}
                      onChange={(e) => setEventForm({ ...eventForm, remind_24h: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>24 hours before</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.remind_2h}
                      onChange={(e) => setEventForm({ ...eventForm, remind_2h: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>2 hours before</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {selectedEventForAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  RSVP & Attendee Roster
                </h3>
                <p className="text-xs text-slate-500">{selectedEventForAttendees.title}</p>
              </div>
              <button
                onClick={() => setSelectedEventForAttendees(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {attendeesLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Loading RSVPs...</p>
              </div>
            ) : attendeesData ? (
              <div className="space-y-4 text-xs">
                {/* Metrics */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {attendeesData.summary.total_attendees}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Headcount</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                      {attendeesData.summary.going}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold uppercase">Going</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">
                      {attendeesData.summary.maybe}
                    </div>
                    <div className="text-[10px] text-amber-600 font-semibold uppercase">Maybe</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-lg font-black text-slate-600 dark:text-slate-300">
                      {attendeesData.summary.spots_remaining !== null
                        ? attendeesData.summary.spots_remaining
                        : "∞"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Spots Left</div>
                  </div>
                </div>

                {/* RSVP List */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Responses ({attendeesData.rsvps.length})</h4>
                  {attendeesData.rsvps.length === 0 ? (
                    <p className="text-slate-400 py-4 text-center italic">No RSVPs recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                      {attendeesData.rsvps.map((r: any) => (
                        <div key={r.id} className="py-2 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {r.user?.display_name || r.user?.full_name || "Resident"}
                            </div>
                            {r.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5">
                                Note: &ldquo;{r.notes}&rdquo;
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.response === "GOING"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : r.response === "MAYBE"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {r.response} {r.guests_count > 0 && `(+${r.guests_count})`}
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedEventForAttendees(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Society Meeting (AGM)</h3>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15th Annual General Body Meeting (AGM)"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Meeting Type *</label>
                  <select
                    value={meetingForm.meeting_type}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="AGM">AGM (Annual General Meeting)</option>
                    <option value="EGM">EGM (Extraordinary Meeting)</option>
                    <option value="MANAGING_COMMITTEE">Managing Committee Meeting</option>
                    <option value="VENDOR">Vendor / Contractor Meeting</option>
                    <option value="GENERAL">General Body Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Format *</label>
                  <select
                    value={meetingForm.location_type}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="PHYSICAL">In-Person (Physical)</option>
                    <option value="ONLINE">Virtual (Online Link)</option>
                    <option value="HYBRID">Hybrid (Both)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={meetingForm.scheduled_at}
                    onChange={(e) => setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duration (Mins) *</label>
                  <input
                    type="number"
                    required
                    value={meetingForm.duration_minutes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, duration_minutes: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agenda Points</label>
                <textarea
                  rows={3}
                  placeholder="1. Review of annual accounts&#10;2. Sinking fund contribution hike"
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
