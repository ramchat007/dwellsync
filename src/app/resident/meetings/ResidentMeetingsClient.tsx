"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  ShieldCheck,
  Building,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { SocietyMeeting } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResidentMeetingsClientProps {
  societyName: string;
  upcomingMeetings: SocietyMeeting[];
  pastPublishedMinutes: SocietyMeeting[];
}

export function ResidentMeetingsClient({
  societyName,
  upcomingMeetings,
  pastPublishedMinutes,
}: ResidentMeetingsClientProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "archive">("upcoming");
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedMeetingId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {societyName}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              General Meetings & Proceedings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Official general body sessions, statutory meetings (AGM/EGM), and published minutes archive.
            </p>
          </div>
          <div>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 gap-1.5 py-1 px-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Official Transparency
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 text-sm font-medium">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "upcoming"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Upcoming General Meetings ({upcomingMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "archive"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          Published Minutes Archive ({pastPublishedMinutes.length})
        </button>
      </div>

      {/* Tab 1: Upcoming Meetings */}
      {activeTab === "upcoming" && (
        <div className="space-y-4">
          {upcomingMeetings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
              <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No Upcoming General Body Meetings
              </h3>
              <p className="text-sm mt-1">
                When an Annual General Meeting (AGM), Extraordinary General Meeting (EGM), or Special General Meeting is scheduled, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMeetings.map((m) => (
                <Card key={m.id} className="border-slate-200 hover:border-slate-300 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {m.meeting_type.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="default" className="text-[11px] uppercase">
                        {m.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">{m.title}</CardTitle>
                    {m.committee && (
                      <CardDescription className="text-xs text-slate-500">
                        Convened by: {m.committee.name}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {new Date(m.scheduled_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {new Date(m.scheduled_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ({m.duration_minutes} mins)
                      </div>
                      <div className="flex items-center">
                        {m.location_type === "ONLINE" ? (
                          <Video className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <MapPin className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>{m.location_details || m.location_type}</span>
                        {m.meeting_link && (
                          <a
                            href={m.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 inline-flex items-center text-indigo-600 hover:underline font-medium"
                          >
                            Meeting Link <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {m.agenda && (
                      <div className="p-3 bg-slate-50 rounded-lg border text-xs text-slate-700 whitespace-pre-line">
                        <div className="font-semibold text-slate-800 mb-1">Agenda Notice</div>
                        {m.agenda}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Published Minutes Archive */}
      {activeTab === "archive" && (
        <div className="space-y-4">
          {pastPublishedMinutes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
              <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No Published Minutes Yet
              </h3>
              <p className="text-sm mt-1">
                Official minutes approved and published by the committee will be recorded here for resident transparency.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastPublishedMinutes.map((m) => {
                const publishedMinutes = Array.isArray(m.minutes)
                  ? m.minutes.find((min: any) => min.status === "PUBLISHED")
                  : (m.minutes as any)?.status === "PUBLISHED"
                  ? m.minutes
                  : null;

                if (!publishedMinutes) return null;
                const isExpanded = expandedMeetingId === m.id;

                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs"
                  >
                    <div
                      onClick={() => toggleExpand(m.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {m.meeting_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(m.scheduled_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {m.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock className="h-3 w-3" /> Published
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4 text-sm bg-slate-50/50">
                        <div className="text-xs text-slate-500">
                          Published on: {new Date(publishedMinutes.published_at).toLocaleString()}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                            Discussion & Proceedings Summary
                          </h4>
                          <div className="p-3.5 bg-white border rounded-lg text-slate-800 text-sm whitespace-pre-wrap">
                            {publishedMinutes.content_summary || "No discussion summary recorded."}
                          </div>
                        </div>

                        {publishedMinutes.decisions_summary && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                              Formal Decisions & Outcomes
                            </h4>
                            <div className="p-3.5 bg-white border rounded-lg text-slate-800 text-sm whitespace-pre-wrap">
                              {publishedMinutes.decisions_summary}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
