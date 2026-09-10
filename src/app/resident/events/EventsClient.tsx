"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Tag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  UserCheck,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Society } from "@/lib/types/database";

interface EventsClientProps {
  initialEvents: any[];
  initialMeetings: any[];
  society: Society;
}

export function EventsClient({
  initialEvents,
  initialMeetings,
  society,
}: EventsClientProps) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [meetings] = useState<any[]>(initialMeetings);
  const [activeTab, setActiveTab] = useState<"EVENTS" | "MEETINGS">("EVENTS");

  // Interactive RSVP State per event
  const [rsvpSubmitting, setRsvpSubmitting] = useState<string | null>(null);
  const [rsvpGuests, setRsvpGuests] = useState<Record<string, number>>({});
  const [rsvpNotes, setRsvpNotes] = useState<Record<string, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ eventId: string; msg: string; isError?: boolean } | null>(null);

  const handleRsvp = async (eventId: string, response: "GOING" | "NOT_GOING" | "MAYBE") => {
    setRsvpSubmitting(eventId);
    setFeedbackMsg(null);

    const guests_count = response === "GOING" ? (rsvpGuests[eventId] || 0) : 0;
    const notes = rsvpNotes[eventId] || undefined;

    try {
      const res = await fetch(`/api/resident/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          guests_count,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit RSVP");
      }

      // Update local event state
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;

          const oldResponse = ev.user_rsvp?.response;
          const oldGuests = ev.user_rsvp?.guests_count || 0;

          const summary = { ...(ev.rsvp_summary || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 }) };

          // Revert old response
          if (oldResponse === "GOING") {
            summary.going = Math.max(0, summary.going - 1);
            summary.total_attendees = Math.max(0, summary.total_attendees - (1 + oldGuests));
          } else if (oldResponse === "NOT_GOING") {
            summary.not_going = Math.max(0, summary.not_going - 1);
          } else if (oldResponse === "MAYBE") {
            summary.maybe = Math.max(0, summary.maybe - 1);
          }

          // Apply new response
          if (response === "GOING") {
            summary.going += 1;
            summary.total_attendees += 1 + guests_count;
          } else if (response === "NOT_GOING") {
            summary.not_going += 1;
          } else if (response === "MAYBE") {
            summary.maybe += 1;
          }

          return {
            ...ev,
            user_rsvp: data.rsvp,
            rsvp_summary: summary,
          };
        })
      );

      setFeedbackMsg({
        eventId,
        msg: response === "GOING" ? "RSVP confirmed! See you there." : "Your RSVP response has been saved.",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ eventId, msg: err.message || "Failed to update RSVP", isError: true });
    } finally {
      setRsvpSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community Calendar & Meetings</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {events.length + meetings.length} Scheduled
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stay informed on society cultural festivities, sports tournaments, general body meetings (AGM), and reserve your spots.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("EVENTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "EVENTS"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Festivals & Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab("MEETINGS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "MEETINGS"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Meetings & AGMs ({meetings.length})
          </button>
        </div>
      </div>

      {/* Tab: Events */}
      {activeTab === "EVENTS" && (
        <div>
          {events.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Upcoming Events</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No festivals or community events are currently scheduled in your society.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {events.map((ev) => {
                const rsvp = ev.rsvp_summary || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 };
                const isFull = ev.capacity && rsvp.total_attendees >= ev.capacity;
                const userRsvp = ev.user_rsvp;
                const isUserGoing = userRsvp?.response === "GOING";
                const isUserMaybe = userRsvp?.response === "MAYBE";
                const isUserNotGoing = userRsvp?.response === "NOT_GOING";

                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {ev.category}
                          </span>
                          {ev.target_audience !== "ALL_RESIDENTS" && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              {ev.target_audience === "OWNERS_ONLY" ? "Owners Only" : "Committee"}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            ev.status === "UPCOMING" || ev.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{ev.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                          {ev.description}
                        </p>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(ev.event_date).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {(ev.start_time || ev.end_time) && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {ev.start_time || "TBD"} {ev.end_time ? `- ${ev.end_time}` : ""}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.location}</span>
                        </div>

                        {/* Capacity meter */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {rsvp.total_attendees} {ev.capacity ? `/ ${ev.capacity} Attendees` : "Attending"}
                            </span>
                          </div>
                          {isFull && !isUserGoing && (
                            <span className="text-rose-600 font-bold text-[10px]">
                              Capacity Full
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive RSVP Area */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Will you attend?
                        </span>
                        {userRsvp && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            Your RSVP: {userRsvp.response} {userRsvp.guests_count > 0 && `(+${userRsvp.guests_count} Guests)`}
                          </span>
                        )}
                      </div>

                      {feedbackMsg && feedbackMsg.eventId === ev.id && (
                        <div
                          className={`p-2 rounded-lg text-xs ${
                            feedbackMsg.isError
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {feedbackMsg.msg}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={rsvpSubmitting === ev.id || (isFull && !isUserGoing)}
                          onClick={() => handleRsvp(ev.id, "GOING")}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                            isUserGoing
                              ? "bg-emerald-600 text-white shadow-sm"
                              : isFull
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          {rsvpSubmitting === ev.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Going</span>
                        </button>

                        <button
                          type="button"
                          disabled={rsvpSubmitting === ev.id}
                          onClick={() => handleRsvp(ev.id, "MAYBE")}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                            isUserMaybe
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-700"
                          }`}
                        >
                          Maybe
                        </button>

                        <button
                          type="button"
                          disabled={rsvpSubmitting === ev.id}
                          onClick={() => handleRsvp(ev.id, "NOT_GOING")}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition ${
                            isUserNotGoing
                              ? "bg-slate-700 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          No
                        </button>
                      </div>

                      {/* Guest counter if user selects going */}
                      {isUserGoing && (
                        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                          <span>Bringing additional family members / guests?</span>
                          <select
                            value={rsvpGuests[ev.id] ?? userRsvp?.guests_count ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setRsvpGuests({ ...rsvpGuests, [ev.id]: val });
                              handleRsvp(ev.id, "GOING");
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="0">+0 Guests</option>
                            <option value="1">+1 Guest</option>
                            <option value="2">+2 Guests</option>
                            <option value="3">+3 Guests</option>
                            <option value="4">+4 Guests</option>
                            <option value="5">+5 Guests</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Meetings */}
      {activeTab === "MEETINGS" && (
        <div>
          {meetings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Society Meetings</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No general body or AGM meetings are currently scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200">
                        {m.meeting_type}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {m.location_type}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                      {m.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{m.title}</h3>
                    {m.agenda && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">
                        {m.agenda}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(m.scheduled_at).toLocaleString("en-IN", {
                          weekday: "short",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    {m.location_details && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.location_details}</span>
                      </div>
                    )}

                    {m.meeting_link && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Meeting</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {m.minutes_document && (
                      <div className="flex items-center gap-1 text-purple-700 font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Minutes: {m.minutes_document.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
