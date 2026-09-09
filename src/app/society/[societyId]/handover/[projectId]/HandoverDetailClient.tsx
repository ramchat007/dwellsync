"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  AlertTriangle,
  Building2,
  FileText,
  ShieldCheck,
  Wrench,
  Receipt,
  Gauge,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---- Types ----
interface Project {
  id: string;
  title: string;
  description?: string | null;
  builder_name: string;
  builder_contact_name?: string | null;
  builder_contact_email?: string | null;
  builder_contact_phone?: string | null;
  handover_start_date?: string | null;
  target_handover_date?: string | null;
  actual_handover_date?: string | null;
  status: string;
  overall_progress: number;
  created_at: string;
  creator?: { full_name: string | null; display_name: string | null } | null;
}

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  priority: string;
  status: string;
  due_date?: string | null;
  completed_date?: string | null;
  notes?: string | null;
  builder_responsibility: boolean;
}

interface Defect {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  reported_date: string;
  target_resolution_date?: string | null;
  builder_responsibility: boolean;
  assignee?: { full_name: string | null; display_name: string | null } | null;
}

interface Commitment {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  target_date?: string | null;
  verification_status: string;
}

interface StatutoryRecord {
  id: string;
  document_type: string;
  document_number?: string | null;
  issuing_authority?: string | null;
  status: string;
  expiry_date?: string | null;
  document_url?: string | null;
}

interface Asset {
  id: string;
  asset_name: string;
  category: string;
  current_condition: string;
  handover_status: string;
  warranty_end?: string | null;
}

interface AmcWarranty {
  id: string;
  title: string;
  contract_type: string;
  vendor_name?: string | null;
  status: string;
  end_date?: string | null;
  renewal_date?: string | null;
}

interface Meter {
  id: string;
  meter_type: string;
  meter_number?: string | null;
  handover_reading?: number | null;
  reading_date?: string | null;
  unit_of_measurement?: string | null;
}

interface DocumentLink {
  id: string;
  entity_type: string;
  notes?: string | null;
  document?: { id: string; title: string; file_url: string; category: string } | null;
}

interface MeetingLink {
  id: string;
  notes?: string | null;
  meeting?: { id: string; title: string; scheduled_at: string; status: string } | null;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  display_name: string | null;
  role_id: string;
}

interface Props {
  project: Project;
  checklistItems: ChecklistItem[];
  defects: Defect[];
  commitments: Commitment[];
  statutoryRecords: StatutoryRecord[];
  assets: Asset[];
  amcWarranties: AmcWarranty[];
  meters: Meter[];
  documentLinks: DocumentLink[];
  meetingLinks: MeetingLink[];
  staffMembers: StaffMember[];
  societyId: string;
  currentUserId: string;
  canManage: boolean;
  canApprove: boolean;
}

// ---- Status configs ----
const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-yellow-100 text-yellow-700" },
  READY_FOR_HANDOVER: { label: "Ready for Handover", color: "bg-purple-100 text-purple-700" },
  HANDOVER_COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Closed", color: "bg-slate-100 text-slate-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

const CHECKLIST_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  NOT_APPLICABLE: "bg-slate-100 text-slate-400",
  BLOCKED: "bg-red-100 text-red-700",
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const DEFECT_STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  PENDING_BUILDER: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  VERIFIED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-500",
};

// ---- Main Component ----
export function HandoverDetailClient({
  project,
  checklistItems,
  defects,
  commitments,
  statutoryRecords,
  assets,
  amcWarranties,
  meters,
  documentLinks,
  meetingLinks,
  staffMembers,
  societyId,
  currentUserId,
  canManage,
  canApprove,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const statusConfig = PROJECT_STATUS_CONFIG[project.status] || {
    label: project.status,
    color: "bg-slate-100 text-slate-600",
  };

  // Computed stats for overview
  const completedChecklist = checklistItems.filter((c) => c.status === "COMPLETED").length;
  const openDefects = defects.filter((d) => !["VERIFIED", "CLOSED"].includes(d.status)).length;
  const criticalOpenDefects = defects.filter(
    (d) => d.severity === "CRITICAL" && !["VERIFIED", "CLOSED"].includes(d.status)
  ).length;
  const pendingCommitments = commitments.filter((c) =>
    ["PENDING", "IN_PROGRESS"].includes(c.status)
  ).length;

  async function handleAccept() {
    if (
      !window.confirm(
        `Finalize handover for "${project.title}"? This will mark the project as HANDOVER COMPLETED.`
      )
    )
      return;

    const date = window.prompt(
      "Enter actual handover date (YYYY-MM-DD):",
      new Date().toISOString().split("T")[0]
    );
    if (!date) return;

    setAcceptLoading(true);
    setAcceptError(null);

    try {
      const res = await fetch(
        `/api/society/${societyId}/handover/projects/${project.id}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actual_handover_date: date,
            acknowledge_outstanding: criticalOpenDefects > 0,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.error || "Failed to complete handover");
        return;
      }
      router.refresh();
    } catch (err: any) {
      setAcceptError(err?.message || "Unexpected error");
    } finally {
      setAcceptLoading(false);
    }
  }

  const canAccept =
    canApprove && project.status === "READY_FOR_HANDOVER";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={`/society/${societyId}/handover`}>
            <button className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Builder: <span className="font-medium text-slate-700">{project.builder_name}</span>
              {project.target_handover_date && (
                <>
                  {" "}
                  · Target:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(project.target_handover_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canAccept && (
            <Button
              onClick={handleAccept}
              disabled={acceptLoading}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              {acceptLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Accept Handover
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {acceptError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {acceptError}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Overall Progress</span>
          <span className="text-xs font-bold text-slate-700">{project.overall_progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${project.overall_progress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs px-3 py-1.5 rounded-lg">
            Overview
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs px-3 py-1.5 rounded-lg">
            Checklist ({checklistItems.length})
          </TabsTrigger>
          <TabsTrigger value="defects" className="text-xs px-3 py-1.5 rounded-lg">
            Defects ({defects.length})
          </TabsTrigger>
          <TabsTrigger value="commitments" className="text-xs px-3 py-1.5 rounded-lg">
            Commitments ({commitments.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs px-3 py-1.5 rounded-lg">
            Documents ({documentLinks.length})
          </TabsTrigger>
          <TabsTrigger value="statutory" className="text-xs px-3 py-1.5 rounded-lg">
            Compliance ({statutoryRecords.length})
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs px-3 py-1.5 rounded-lg">
            Assets ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="amc" className="text-xs px-3 py-1.5 rounded-lg">
            AMC &amp; Warranties ({amcWarranties.length})
          </TabsTrigger>
          <TabsTrigger value="meters" className="text-xs px-3 py-1.5 rounded-lg">
            Meters ({meters.length})
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs px-3 py-1.5 rounded-lg">
            Meetings ({meetingLinks.length})
          </TabsTrigger>
          <TabsTrigger value="acceptance" className="text-xs px-3 py-1.5 rounded-lg">
            Acceptance
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <OverviewStat
              icon={<ClipboardList className="w-4 h-4 text-indigo-500" />}
              label="Checklist"
              value={`${completedChecklist}/${checklistItems.length}`}
              sub="completed"
            />
            <OverviewStat
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              label="Open Defects"
              value={openDefects}
              sub={criticalOpenDefects > 0 ? `${criticalOpenDefects} CRITICAL` : ""}
              alert={criticalOpenDefects > 0}
            />
            <OverviewStat
              icon={<Clock className="w-4 h-4 text-orange-500" />}
              label="Pending Commitments"
              value={pendingCommitments}
              sub="builder"
            />
            <OverviewStat
              icon={<Building2 className="w-4 h-4 text-purple-500" />}
              label="Assets"
              value={assets.filter((a) => a.handover_status === "ACCEPTED").length}
              sub={`of ${assets.length} accepted`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.description && (
                <p className="text-slate-600">{project.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400 block">Builder</span>
                  <span className="font-medium">{project.builder_name}</span>
                </div>
                {project.builder_contact_name && (
                  <div>
                    <span className="text-xs text-slate-400 block">Contact Person</span>
                    <span className="font-medium">{project.builder_contact_name}</span>
                  </div>
                )}
                {project.builder_contact_email && (
                  <div>
                    <span className="text-xs text-slate-400 block">Email</span>
                    <a
                      href={`mailto:${project.builder_contact_email}`}
                      className="font-medium text-indigo-600 underline"
                    >
                      {project.builder_contact_email}
                    </a>
                  </div>
                )}
                {project.builder_contact_phone && (
                  <div>
                    <span className="text-xs text-slate-400 block">Phone</span>
                    <span className="font-medium">{project.builder_contact_phone}</span>
                  </div>
                )}
                {project.handover_start_date && (
                  <div>
                    <span className="text-xs text-slate-400 block">Start Date</span>
                    <span className="font-medium">
                      {new Date(project.handover_start_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                {project.target_handover_date && (
                  <div>
                    <span className="text-xs text-slate-400 block">Target Date</span>
                    <span className="font-medium">
                      {new Date(project.target_handover_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                {project.actual_handover_date && (
                  <div>
                    <span className="text-xs text-slate-400 block">Actual Handover Date</span>
                    <span className="font-medium text-green-700">
                      {new Date(project.actual_handover_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECKLIST TAB */}
        <TabsContent value="checklist" className="mt-4">
          <SectionHeader
            title="Handover Checklist"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add Item"
                  placeholder="Checklist item title"
                  onSubmit={async (title, extra) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/checklist`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          category: extra?.category || "OTHER",
                          priority: extra?.priority || "MEDIUM",
                        }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {checklistItems.length === 0 && (
              <EmptyState message="No checklist items yet." />
            )}
            {checklistItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
              >
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    CHECKLIST_STATUS_COLOR[item.status] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {item.category} · {item.priority}{" "}
                    {item.due_date && `· Due: ${new Date(item.due_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                {item.builder_responsibility && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">
                    Builder
                  </span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* DEFECTS TAB */}
        <TabsContent value="defects" className="mt-4">
          <SectionHeader
            title="Defects / Punch List"
            action={
              canManage ? (
                <AddItemDialog
                  label="Log Defect"
                  placeholder="Defect title"
                  descRequired
                  onSubmit={async (title, extra) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/defects`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          description: extra?.description || title,
                          category: extra?.category || "OTHER",
                          severity: extra?.severity || "MEDIUM",
                        }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {defects.length === 0 && <EmptyState message="No defects logged." />}
            {defects.map((defect) => (
              <div
                key={defect.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
              >
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                    SEVERITY_COLOR[defect.severity] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {defect.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{defect.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {defect.category}
                    {defect.assignee &&
                      ` · Assigned to: ${defect.assignee.display_name || defect.assignee.full_name}`}
                    {defect.target_resolution_date &&
                      ` · Target: ${new Date(defect.target_resolution_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    DEFECT_STATUS_COLOR[defect.status] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {defect.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* COMMITMENTS TAB */}
        <TabsContent value="commitments" className="mt-4">
          <SectionHeader
            title="Builder Commitments & Pending Works"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add Commitment"
                  placeholder="Commitment title"
                  onSubmit={async (title, extra) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/commitments`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          category: extra?.category || "OTHER",
                          priority: extra?.priority || "MEDIUM",
                        }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {commitments.length === 0 && <EmptyState message="No commitments recorded." />}
            {commitments.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white"
              >
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    SEVERITY_COLOR[c.priority] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {c.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {c.category}
                    {c.target_date &&
                      ` · Due: ${new Date(c.target_date).toLocaleDateString("en-IN")}`}
                    {c.verification_status === "VERIFIED" && " · ✓ Verified"}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  c.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  c.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          <SectionHeader title="Handover Documents" />
          <div className="space-y-2 mt-3">
            {documentLinks.length === 0 && (
              <EmptyState message="No documents linked. Link documents from the Documents section." />
            )}
            {documentLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {link.document?.title || "Untitled Document"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {link.entity_type} {link.notes && `· ${link.notes}`}
                  </p>
                </div>
                {link.document?.file_url && (
                  <a
                    href={link.document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 underline shrink-0"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* STATUTORY TAB */}
        <TabsContent value="statutory" className="mt-4">
          <SectionHeader
            title="Statutory & Compliance Records"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add Record"
                  placeholder="Document type (e.g. Occupancy Certificate)"
                  onSubmit={async (title) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/statutory`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ document_type: title }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {statutoryRecords.length === 0 && <EmptyState message="No statutory records." />}
            {statutoryRecords.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.document_type}</p>
                  <p className="text-[10px] text-slate-400">
                    {r.document_number && `#${r.document_number} · `}
                    {r.issuing_authority && `${r.issuing_authority} · `}
                    {r.expiry_date &&
                      `Expires: ${new Date(r.expiry_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  r.status === "VERIFIED" ? "bg-green-100 text-green-700" :
                  r.status === "EXPIRED" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="mt-4">
          <SectionHeader
            title="Asset Handover"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add Asset"
                  placeholder="Asset name (e.g. Main Water Pump)"
                  onSubmit={async (title, extra) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/assets`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          asset_name: title,
                          category: extra?.category || "OTHER",
                        }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {assets.length === 0 && <EmptyState message="No assets recorded." />}
            {assets.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.asset_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {a.category} · Condition: {a.current_condition}
                    {a.warranty_end &&
                      ` · Warranty: ${new Date(a.warranty_end).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  a.handover_status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                  a.handover_status === "REJECTED" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {a.handover_status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* AMC & WARRANTIES TAB */}
        <TabsContent value="amc" className="mt-4">
          <SectionHeader
            title="AMC & Warranties"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add AMC / Warranty"
                  placeholder="Contract title (e.g. Lift AMC)"
                  onSubmit={async (title) => {
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/amc-warranties`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title, contract_type: "AMC" }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {amcWarranties.length === 0 && <EmptyState message="No AMCs or warranties recorded." />}
            {amcWarranties.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <Receipt className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {a.contract_type}
                    {a.vendor_name && ` · ${a.vendor_name}`}
                    {a.end_date &&
                      ` · Expires: ${new Date(a.end_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  a.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                  a.status === "EXPIRED" ? "bg-red-100 text-red-700" :
                  a.status === "RENEWAL_DUE" ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* METERS TAB */}
        <TabsContent value="meters" className="mt-4">
          <SectionHeader
            title="Meters & Infrastructure Readings"
            action={
              canManage ? (
                <AddItemDialog
                  label="Add Meter"
                  placeholder="Meter type (e.g. ELECTRICITY_MAIN)"
                  onSubmit={async (title) => {
                    const validTypes = ["ELECTRICITY_MAIN","ELECTRICITY_DG","WATER_MAIN","WATER_STP","GAS","SOLAR","LIFT_ELECTRICITY","OTHER"];
                    const type = validTypes.includes(title.toUpperCase()) ? title.toUpperCase() : "OTHER";
                    const res = await fetch(
                      `/api/society/${societyId}/handover/projects/${project.id}/meters`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ meter_type: type }),
                      }
                    );
                    if (res.ok) router.refresh();
                    else {
                      const d = await res.json();
                      throw new Error(d.error);
                    }
                  }}
                />
              ) : null
            }
          />
          <div className="space-y-2 mt-3">
            {meters.length === 0 && <EmptyState message="No meter readings recorded." />}
            {meters.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <Gauge className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {m.meter_type.replace("_", " ")}
                    {m.meter_number && ` — #${m.meter_number}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {m.handover_reading != null &&
                      `Reading: ${m.handover_reading} ${m.unit_of_measurement || ""}`}
                    {m.reading_date &&
                      ` · Date: ${new Date(m.reading_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* MEETINGS TAB */}
        <TabsContent value="meetings" className="mt-4">
          <SectionHeader title="Handover Meetings" />
          <div className="space-y-2 mt-3">
            {meetingLinks.length === 0 && (
              <EmptyState message="No meetings linked. Schedule meetings from the Meetings section and link them here." />
            )}
            {meetingLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {link.meeting?.title || "Meeting"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {link.meeting?.scheduled_at &&
                      new Date(link.meeting.scheduled_at).toLocaleString("en-IN")}
                    {link.meeting?.status && ` · ${link.meeting.status}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ACCEPTANCE TAB */}
        <TabsContent value="acceptance" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Handover Acceptance</h2>

            {project.status === "HANDOVER_COMPLETED" || project.status === "CLOSED" ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Handover Completed</p>
                  {project.actual_handover_date && (
                    <p className="text-sm text-green-700">
                      Completed on:{" "}
                      {new Date(project.actual_handover_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Card>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <p className="text-slate-600">
                      Before finalizing the handover, ensure:
                    </p>
                    <div className="space-y-2">
                      <CheckItem
                        done={checklistItems.filter(c => !["COMPLETED","NOT_APPLICABLE"].includes(c.status)).length === 0}
                        label={`All checklist items resolved (${checklistItems.filter(c => ["COMPLETED","NOT_APPLICABLE"].includes(c.status)).length}/${checklistItems.length})`}
                      />
                      <CheckItem
                        done={criticalOpenDefects === 0}
                        label={`No open CRITICAL defects (${criticalOpenDefects} open)`}
                        warn={criticalOpenDefects > 0}
                      />
                      <CheckItem
                        done={pendingCommitments === 0}
                        label={`All builder commitments fulfilled (${pendingCommitments} pending)`}
                        warn={pendingCommitments > 0}
                      />
                      <CheckItem
                        done={assets.filter(a => a.handover_status !== "ACCEPTED").length === 0}
                        label={`All assets accepted (${assets.filter(a => a.handover_status === "ACCEPTED").length}/${assets.length})`}
                      />
                    </div>

                    {canAccept && (
                      <Button
                        onClick={handleAccept}
                        disabled={acceptLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white mt-3"
                      >
                        {acceptLoading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4 mr-2" /> Accept & Finalize Handover</>
                        )}
                      </Button>
                    )}
                    {!canApprove && (
                      <p className="text-xs text-slate-500 text-center mt-2">
                        Requires handover.approve permission to finalize.
                      </p>
                    )}
                    {acceptError && (
                      <p className="text-xs text-red-600 mt-1">{acceptError}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Helper sub-components ----

function OverviewStat({
  icon,
  label,
  value,
  sub,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 bg-white ${alert ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <div className={`text-xl font-bold ${alert ? "text-red-700" : "text-slate-800"}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
      {sub && <div className={`text-[10px] font-medium ${alert ? "text-red-600" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-slate-400 text-sm">{message}</div>
  );
}

function CheckItem({ done, label, warn }: { done: boolean; label: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : warn ? (
        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-slate-300 shrink-0" />
      )}
      <span className={`text-sm ${done ? "text-slate-600" : warn ? "text-orange-700" : "text-slate-500"}`}>
        {label}
      </span>
    </div>
  );
}

// Quick-add dialog using browser prompt (avoids heavy dialog dependency for MVP)
function AddItemDialog({
  label,
  placeholder,
  descRequired = false,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  descRequired?: boolean;
  onSubmit: (title: string, extra?: Record<string, string>) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const title = window.prompt(placeholder);
    if (!title?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(title.trim());
    } catch (err: any) {
      setError(err?.message || "Failed");
      window.alert("Error: " + (err?.message || "Failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="sm"
      variant="outline"
      className="text-xs gap-1"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "+"}
      {label}
    </Button>
  );
}
