"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ManagementCompany,
  ManagementCompanyTask,
  ManagementCompanyMember,
  CompanyRole,
  CompanyTaskCategory,
  CompanyTaskPriority,
  CompanyTaskStatus,
} from "@/lib/types/company";
import {
  CheckSquare,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Building2,
  User,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface OperationsWorkspaceClientProps {
  company: ManagementCompany;
  accessibleSocieties: Array<{
    id: string;
    society_id: string;
    society?: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  members: ManagementCompanyMember[];
  initialTasks: ManagementCompanyTask[];
  role: CompanyRole | "SUPER_ADMIN";
  currentUserId: string;
}

const CATEGORIES: { value: CompanyTaskCategory; label: string }[] = [
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "FACILITY", label: "Facility" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
  { value: "SECURITY", label: "Security" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "LIFT", label: "Lift & Elevators" },
  { value: "FIRE_SAFETY", label: "Fire Safety" },
  { value: "COMMON_AREA", label: "Common Area" },
  { value: "VENDOR", label: "Vendor" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "RESIDENT_FOLLOWUP", label: "Resident Follow-up" },
  { value: "GENERAL", label: "General" },
];

const PRIORITIES: { value: CompanyTaskPriority; label: string; badge: "secondary" | "default" | "warning" | "destructive" }[] = [
  { value: "LOW", label: "Low", badge: "secondary" },
  { value: "MEDIUM", label: "Medium", badge: "default" },
  { value: "HIGH", label: "High", badge: "warning" },
  { value: "URGENT", label: "Urgent", badge: "destructive" },
];

const STATUSES: { value: CompanyTaskStatus; label: string; badge: "secondary" | "warning" | "destructive" | "success" | "default" }[] = [
  { value: "OPEN", label: "Open", badge: "warning" },
  { value: "IN_PROGRESS", label: "In Progress", badge: "default" },
  { value: "ON_HOLD", label: "On Hold", badge: "destructive" },
  { value: "COMPLETED", label: "Completed", badge: "success" },
  { value: "CANCELLED", label: "Cancelled", badge: "secondary" },
];

export function OperationsWorkspaceClient({
  company,
  accessibleSocieties,
  members,
  initialTasks,
  role,
}: OperationsWorkspaceClientProps) {
  const [tasks, setTasks] = useState<ManagementCompanyTask[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [societyFilter, setSocietyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    society_id: accessibleSocieties[0]?.society_id || "",
    title: "",
    description: "",
    category: "MAINTENANCE" as CompanyTaskCategory,
    priority: "MEDIUM" as CompanyTaskPriority,
    assigned_to: "",
    due_at: "",
  });

  const canCreate = ["SUPER_ADMIN", "COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"].includes(role);

  const activeSocieties = useMemo(() => {
    return accessibleSocieties.filter((s) => s.society);
  }, [accessibleSocieties]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description ? task.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc) return false;
      }
      if (societyFilter !== "all" && task.society_id !== societyFilter) return false;
      if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (assigneeFilter === "unassigned") {
        if (task.assigned_to) return false;
      } else if (assigneeFilter !== "all") {
        if (task.assigned_to !== assigneeFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, societyFilter, categoryFilter, priorityFilter, statusFilter, assigneeFilter]);

  const refreshTasks = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/company/${company.id}/operations/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to refresh tasks:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Task title is required");
      return;
    }
    if (!formData.society_id) {
      setFormError("Society selection is required");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const payload: any = {
        society_id: formData.society_id,
        title: formData.title.trim(),
        category: formData.category,
        priority: formData.priority,
      };
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.assigned_to) {
        payload.assigned_to = formData.assigned_to;
      }
      if (formData.due_at) {
        payload.due_at = new Date(formData.due_at).toISOString();
      }

      const res = await fetch(`/api/company/${company.id}/operations/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create task");
      }

      setTasks((prev) => [result.task, ...prev]);
      setIsCreateOpen(false);
      setFormData({
        society_id: accessibleSocieties[0]?.society_id || "",
        title: "",
        description: "",
        category: "MAINTENANCE",
        priority: "MEDIUM",
        assigned_to: "",
        due_at: "",
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadgeVariant = (priority: CompanyTaskPriority) => {
    const item = PRIORITIES.find((p) => p.value === priority);
    return item ? item.badge : "secondary";
  };

  const getStatusBadgeVariant = (status: CompanyTaskStatus) => {
    const item = STATUSES.find((s) => s.value === status);
    return item ? item.badge : "secondary";
  };

  const isOverdue = (task: ManagementCompanyTask) => {
    if (!task.due_at) return false;
    if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
    return new Date(task.due_at).getTime() < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Operations & Tasks
            </h1>
            <Badge variant="outline" className="text-slate-700 bg-slate-50">
              {tasks.length} total
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage multi-society operational tasks, facility schedules, and staff assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTasks}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {canCreate && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Society filter */}
          <div>
            <select
              value={societyFilter}
              onChange={(e) => setSocietyFilter(e.target.value)}
              aria-label="Filter by Society"
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Societies</option>
              {activeSocieties.map((s) => (
                <option key={s.society_id} value={s.society_id}>
                  {s.society?.name || s.society_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by Priority"
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by Assignee"
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter count & clear */}
        {(societyFilter !== "all" ||
          statusFilter !== "all" ||
          priorityFilter !== "all" ||
          categoryFilter !== "all" ||
          assigneeFilter !== "all" ||
          searchQuery.trim()) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {filteredTasks.length} matching tasks</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSocietyFilter("all");
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
                setAssigneeFilter("all");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="h-6 w-6" />
          </div>
          <h3 className="text-base font-medium text-slate-900">No operational tasks found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {tasks.length === 0
              ? "Get started by creating the first operational task for your managed societies."
              : "Try adjusting your search criteria or clearing active filters."}
          </p>
          {canCreate && (
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Task
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <Card
                key={task.id}
                className="p-4 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>

                  <Link
                    href={`/company/${company.id}/operations/tasks/${task.id}`}
                    className="block group"
                  >
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {task.title}
                    </h3>
                  </Link>

                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px] py-0">
                      <Building2 className="h-3 w-3 mr-1 text-slate-400" />
                      {task.society?.name || "Society"}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] py-0 capitalize">
                      {task.category.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate max-w-[120px]">
                      {task.assignee?.full_name || "Unassigned"}
                    </span>
                  </div>

                  {task.due_at && (
                    <div
                      className={`flex items-center gap-1 font-medium ${
                        overdue ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(task.due_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Operational Task</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateTask} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Society *
              </label>
              <select
                value={formData.society_id}
                onChange={(e) => setFormData({ ...formData, society_id: e.target.value })}
                required
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {activeSocieties.map((s) => (
                  <option key={s.society_id} value={s.society_id}>
                    {s.society?.name} ({s.society?.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Task Title *
              </label>
              <Input
                placeholder="e.g. Inspect fire hydrant & safety valves"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={200}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Detailed instructions, scope of work, vendor notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as CompanyTaskCategory })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as CompanyTaskPriority })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assign Staff
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)} ({m.role.replace("COMPANY_", "")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={formData.due_at}
                  onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
