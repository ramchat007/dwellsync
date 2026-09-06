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
} from "lucide-react";
import { Society, SocietyEvent, SocietyMeeting } from "@/lib/types/database";

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
  const [events] = useState<any[]>(initialEvents);
  const [meetings] = useState<any[]>(initialMeetings);
  const [activeTab, setActiveTab] = useState<"EVENTS" | "MEETINGS">("EVENTS");

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
            Stay informed on society cultural festivities, sports tournaments, and general body meetings (AGM).
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-blue-300 dark:hover:border-blue-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {ev.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        ev.status === "UPCOMING"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{ev.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                      {ev.description}
                    </p>
                  </div>

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

                    {ev.organizer_name && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Organized by: {ev.organizer_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {m.location_type}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        m.status === "SCHEDULED"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : m.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{m.title}</h3>
                    {m.agenda && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                        {m.agenda}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(m.scheduled_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    {m.location_details && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.location_details}</span>
                      </div>
                    )}

                    {m.meeting_link && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Video className="w-3.5 h-3.5 text-blue-500" />
                        <a
                          href={m.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 underline font-semibold flex items-center gap-1"
                        >
                          <span>Join Online Conference</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {m.minutes_document && (
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-900 dark:text-purple-200">
                          Official Minutes: {m.minutes_document.title}
                        </span>
                      </div>
                      <a
                        href={m.minutes_document.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-purple-700 dark:text-purple-300 underline"
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
