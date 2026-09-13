"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ManagementCompany,
  ManagementCompanyTask,
  ManagementCompanyTaskComment,
  CompanyTaskActivity,
  ManagementCompanyMember,
  CompanyRole,
  CompanyTaskPriority,
  CompanyTaskStatus,
} from "@/lib/types/company";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MessageSquare,
  Activity,
  Loader2,
  Calendar,
  AlertCircle,
  Play,
  Ban,
  RotateCcw,
  PauseCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TaskDetailClientProps {
  company: ManagementCompany;
  task: ManagementCompanyTask;
  initialComments: ManagementCompanyTaskComment[];
  initialActivities: CompanyTaskActivity[];
  members: ManagementCompanyMember[];
  accessibleSocieties: Array<{
    id: string;
    society_id: string;
    society?: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  role: CompanyRole | "SUPER_ADMIN";
  currentUserId: string;
}

export function TaskDetailClient({
  company,
  task: initialTask,
  initialComments,
  initialActivities,
  members,
  role,
  currentUserId,
}: TaskDetailClientProps) {
  const [task, setTask] = useState<ManagementCompanyTask>(initialTask);
  const [comments, setComments] = useState<ManagementCompanyTaskComment[]>(initialComments);
  const [activities, setActivities] = useState<CompanyTaskActivity[]>(initialActivities);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState("");

  const canManage = ["SUPER_ADMIN", "COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"].includes(role);

  const handleStatusChange = async (newStatus: CompanyTaskStatus) => {
    setIsUpdatingStatus(true);
    setActionError("");
    try {
      const res = await fetch(`/api/company/${company.id}/operations/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      setTask(data.task);

      // Record activity locally for immediate feedback
      const newAct: CompanyTaskActivity = {
        id: "temp-" + Date.now(),
        action: `status_changed_to_${newStatus}`,
        actor_user_id: currentUserId,
        created_at: new Date().toISOString(),
        metadata: { old_status: task.status, new_status: newStatus },
      };
      setActivities((prev) => [newAct, ...prev]);
    } catch (err: any) {
      setActionError(err.message || "Failed to update task");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    setActionError("");
    try {
      const res = await fetch(`/api/company/${company.id}/operations/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: newAssigneeId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reassign task");
      }
      setTask(data.task);
    } catch (err: any) {
      setActionError(err.message || "Failed to reassign task");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    setCommentError("");

    try {
      const res = await fetch(`/api/company/${company.id}/operations/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: newComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment");
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const isOverdue =
    task.due_at &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED" &&
    new Date(task.due_at).getTime() < Date.now();

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/company/${company.id}/operations`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Operations</span>
        </Link>
        <Badge variant="outline" className="font-mono text-xs">
          TASK #{task.id.slice(0, 8)}
        </Badge>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Task Header Card */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  task.status === "COMPLETED"
                    ? "success"
                    : task.status === "ON_HOLD"
                    ? "destructive"
                    : task.status === "IN_PROGRESS"
                    ? "default"
                    : "warning"
                }
              >
                {task.status.replace("_", " ")}
              </Badge>
              <Badge
                variant={
                  task.priority === "URGENT"
                    ? "destructive"
                    : task.priority === "HIGH"
                    ? "warning"
                    : "secondary"
                }
              >
                {task.priority} PRIORITY
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {task.category.replace("_", " ")}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">
                  {task.society?.name || "Managed Society"}
                </span>
                {task.society?.code && (
                  <span className="text-slate-400">({task.society.code})</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
              </div>

              {task.due_at && (
                <div
                  className={`flex items-center gap-1 font-medium ${
                    isOverdue ? "text-red-600" : "text-slate-600"
                  }`}
                >
                  {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Due {new Date(task.due_at).toLocaleDateString()}
                    {isOverdue && " (Overdue)"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Transition Action Buttons */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {task.status === "OPEN" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={isUpdatingStatus}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Work
                </Button>
              )}

              {task.status === "IN_PROGRESS" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("COMPLETED")}
                    disabled={isUpdatingStatus}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete Task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("ON_HOLD")}
                    disabled={isUpdatingStatus}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1.5"
                  >
                    <PauseCircle className="h-3.5 w-3.5" />
                    Put On Hold
                  </Button>
                </>
              )}

              {task.status === "ON_HOLD" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={isUpdatingStatus}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume Work
                </Button>
              )}

              {task.status !== "CANCELLED" && task.status !== "COMPLETED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={isUpdatingStatus}
                  className="text-slate-600 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}

              {(task.status === "COMPLETED" || task.status === "CANCELLED") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("OPEN")}
                  disabled={isUpdatingStatus}
                  className="text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Two Column Layout: Details & Comments vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Description, Comments, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Description & Scope</h2>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {task.description || (
                <span className="italic text-slate-400">No detailed description provided.</span>
              )}
            </div>
          </Card>

          {/* Comments Thread */}
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Operational Comments ({comments.length})
              </h2>
            </div>

            {/* Comment List */}
            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No comments yet. Post an update or note below.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {c.user?.full_name || c.user?.email || "Team Member"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            {commentError && (
              <div className="p-2.5 mb-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {commentError}
              </div>
            )}

            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write an operational note or progress update..."
                rows={3}
                required
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                >
                  {isSubmittingComment && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Post Comment
                </Button>
              </div>
            </form>
          </Card>

          {/* Activity / Audit Timeline */}
          {activities.length > 0 && (
            <Card className="p-5 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Activity className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Task Activity Log</h2>
              </div>
              <div className="space-y-2.5 text-xs text-slate-600">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-slate-800 capitalize">
                        {act.action.replace(/_/g, " ")}
                      </span>
                      {act.actor?.full_name && (
                        <span className="text-slate-500 ml-1">by {act.actor.full_name}</span>
                      )}
                      <span className="text-slate-400 ml-2">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Metadata & Staff Assignment */}
        <div className="space-y-6">
          {/* Assignment & Status Card */}
          <Card className="p-5 bg-white border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Assignment & Schedule
            </h2>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Assigned Staff Member
              </label>
              {canManage ? (
                <select
                  value={task.assigned_to || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)} (
                      {m.role.replace("COMPANY_", "")})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-medium text-slate-800">
                  {task.assignee?.full_name || "Unassigned"}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
              <p className="text-xs font-medium text-slate-800">
                {task.due_at ? new Date(task.due_at).toLocaleDateString() : "No due date set"}
              </p>
            </div>

            {/* Society */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Society</label>
              <p className="text-xs font-medium text-slate-800">
                {task.society?.name || "Unknown Society"}
              </p>
            </div>

            {/* Timestamps */}
            <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
              <div>Created: {new Date(task.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(task.updated_at).toLocaleString()}</div>
              {task.completed_at && (
                <div className="text-emerald-600 font-medium">
                  Completed: {new Date(task.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
