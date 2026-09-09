"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldAlert,
  FileCheck,
  Calendar,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KPIs {
  totalProjects: number;
  activeProjects: number;
  overdueChecklistItems: number;
  openCriticalDefects: number;
  pendingCommitments: number;
  overdueCommitments: number;
  expiringAmcs: number;
}

interface Project {
  id: string;
  title: string;
  builder_name: string;
  status: string;
  overall_progress: number;
  target_handover_date?: string | null;
  actual_handover_date?: string | null;
  created_at: string;
  creator?: { full_name: string | null; display_name: string | null } | null;
}

interface Props {
  projects: Project[];
  kpis: KPIs;
  societyId: string;
  canManage: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-yellow-100 text-yellow-700" },
  READY_FOR_HANDOVER: { label: "Ready for Handover", color: "bg-purple-100 text-purple-700" },
  HANDOVER_COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Closed", color: "bg-slate-100 text-slate-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

export function HandoverListClient({ projects, kpis, societyId, canManage }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL");

  const filtered =
    filter === "ALL"
      ? projects
      : projects.filter((p) => p.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Builder Handover</h1>
            <p className="text-sm text-slate-500">
              Manage the structured transition from builder to society management
            </p>
          </div>
        </div>
        {canManage && (
          <Link href={`/society/${societyId}/handover/new`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              New Handover Project
            </Button>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard
          icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
          label="Active Projects"
          value={kpis.activeProjects}
          bg="bg-indigo-50"
        />
        <KPICard
          icon={<Clock className="w-4 h-4 text-orange-600" />}
          label="Overdue Checklist"
          value={kpis.overdueChecklistItems}
          bg="bg-orange-50"
          alert={kpis.overdueChecklistItems > 0}
        />
        <KPICard
          icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
          label="Critical Defects"
          value={kpis.openCriticalDefects}
          bg="bg-red-50"
          alert={kpis.openCriticalDefects > 0}
        />
        <KPICard
          icon={<ShieldAlert className="w-4 h-4 text-yellow-600" />}
          label="Pending Commitments"
          value={kpis.pendingCommitments}
          bg="bg-yellow-50"
          alert={kpis.pendingCommitments > 0}
        />
        <KPICard
          icon={<Clock className="w-4 h-4 text-rose-600" />}
          label="Overdue Commitments"
          value={kpis.overdueCommitments}
          bg="bg-rose-50"
          alert={kpis.overdueCommitments > 0}
        />
        <KPICard
          icon={<FileCheck className="w-4 h-4 text-purple-600" />}
          label="Expiring AMCs (30d)"
          value={kpis.expiringAmcs}
          bg="bg-purple-50"
          alert={kpis.expiringAmcs > 0}
        />
        <KPICard
          icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
          label="Total Projects"
          value={kpis.totalProjects}
          bg="bg-green-50"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {["ALL", "DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "READY_FOR_HANDOVER", "HANDOVER_COMPLETED", "CLOSED"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : (STATUS_CONFIG[s]?.label ?? s)}
            </button>
          )
        )}
      </div>

      {/* Project List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No handover projects found</p>
          {canManage && (
            <p className="text-sm mt-1">
              <Link href={`/society/${societyId}/handover/new`} className="text-indigo-600 underline">
                Create the first handover project
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              societyId={societyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  bg,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${bg} border border-white shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <div className={`text-2xl font-bold ${alert && value > 0 ? "text-red-700" : "text-slate-800"}`}>
        {value}
      </div>
      <div className="text-[10px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ProjectCard({ project, societyId }: { project: Project; societyId: string }) {
  const config = STATUS_CONFIG[project.status] || { label: project.status, color: "bg-slate-100 text-slate-600" };

  return (
    <Link href={`/society/${societyId}/handover/${project.id}`}>
      <div className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{project.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Builder:{" "}
                <span className="font-medium text-slate-700">{project.builder_name}</span>
              </p>
              {project.target_handover_date && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Target:{" "}
                  {new Date(project.target_handover_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.color}`}>
              {config.label}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">Overall Progress</span>
            <span className="text-[10px] font-semibold text-slate-700">
              {project.overall_progress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${project.overall_progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
