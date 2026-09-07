"use client";

import React from "react";
import {
  Users,
  ShieldCheck,
  Calendar,
  Award,
  Info,
  CheckCircle2,
  Building,
  User,
  Vote,
} from "lucide-react";
import { Committee } from "@/lib/types/database";

interface PublicOfficer {
  id: string;
  designation: string;
  appointed_at: string;
  voting_rights: boolean;
  profile?: {
    id: string;
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface ResidentCommitteeClientProps {
  societyName: string;
  committee: Committee | null;
  roster: PublicOfficer[];
}

export function ResidentCommitteeClient({
  societyName,
  committee,
  roster,
}: ResidentCommitteeClientProps) {
  const getDesignationBadge = (designation: string) => {
    switch (designation) {
      case "PRESIDENT":
      case "CHAIRMAN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "SECRETARY":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "TREASURER":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "VICE_PRESIDENT":
      case "JOINT_SECRETARY":
      case "JOINT_TREASURER":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const formatDesignation = (desig: string) => {
    return desig.replace(/_/g, " ");
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Managing Committee
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Official elected & appointed office bearers serving <span className="font-semibold text-slate-700 dark:text-slate-300">{societyName}</span>
            </p>
          </div>
          {committee && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Term
            </div>
          )}
        </div>
      </div>

      {!committee ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No Active Managing Committee Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Society governance records will appear here once the Managing Committee is formally constituted by the society administration.
          </p>
        </div>
      ) : (
        <>
          {/* Committee Tenure Card */}
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Current Elected Body
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {committee.name}
                </h2>
                {committee.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                    {committee.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 self-start md:self-auto">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  Term: <strong>{formatDate(committee.term_start_date)}</strong> – <strong>{formatDate(committee.term_end_date)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Officer Roster Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Office Bearers & Members ({roster.length})
              </h3>
            </div>

            {roster.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
                No active committee appointments currently recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster.map((member) => {
                  const name =
                    member.profile?.display_name ||
                    member.profile?.full_name ||
                    "Member";
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDesignationBadge(
                              member.designation
                            )}`}
                          >
                            {formatDesignation(member.designation)}
                          </span>
                          {member.voting_rights && (
                            <span
                              title="Voting Member"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md"
                            >
                              <Vote className="w-3 h-3" />
                              Voting
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {member.profile?.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={member.profile.avatar_url}
                              alt={name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-base border border-blue-200 dark:border-blue-800">
                              {initial}
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                              {name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Appointed: {formatDate(member.appointed_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verified Active Member</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Privacy & Governance Notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p>
              <strong>Governance Privacy Guarantee:</strong> In accordance with society governance regulations, personal contact phone numbers and internal committee deliberations are kept confidential. To submit official correspondence to the committee, please use the society communications desk or ticketing portal.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
