import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendNotification } from "@/lib/services/notificationService";
import { CompanyService } from "@/lib/services/companyService";
import {
  ManagementCompanyTask,
  ManagementCompanyTaskComment,
  CompanyTaskActivity,
  CompanyTaskCategory,
  CompanyTaskPriority,
  CompanyTaskStatus,
  SocietyOperationalSummary,
  CompanyDashboardMetrics,
  ManagementCompanyMember,
} from "@/lib/types/company";

// Helper to check if actor is platform super admin
async function isPlatformSuperAdmin(adminClient: any, userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("role_id", "SUPER_ADMIN")
    .maybeSingle();
  return !!data;
}

// Helper to get actor's company membership
async function getActorCompanyMember(
  adminClient: any,
  companyId: string,
  userId: string
): Promise<ManagementCompanyMember | null> {
  const { data } = await adminClient
    .from("management_company_members")
    .select("*")
    .eq("management_company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return data as ManagementCompanyMember | null;
}

export interface CreateTaskInput {
  society_id: string;
  title: string;
  description?: string | null;
  category?: CompanyTaskCategory;
  priority?: CompanyTaskPriority;
  status?: CompanyTaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  category?: CompanyTaskCategory;
  priority?: CompanyTaskPriority;
  status?: CompanyTaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TaskQueryFilters {
  society_id?: string;
  status?: CompanyTaskStatus;
  priority?: CompanyTaskPriority;
  category?: CompanyTaskCategory;
  assigned_to?: string;
  search?: string;
  overdue_only?: string;
  page?: number;
  limit?: number;
}

export class CompanyOperationsService {
  /**
   * Retrieves tasks for a company, strictly scoped to user's authorized societies.
   */
  static async getTasks(
    companyId: string,
    filters: TaskQueryFilters,
    actorUserId: string
  ): Promise<{ tasks: ManagementCompanyTask[]; totalCount: number }> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Not an active member of this management company");
    }

    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const accessibleSocietyIds = accessibleSocieties.map((s) => s.society_id);

    if (accessibleSocietyIds.length === 0) {
      return { tasks: [], totalCount: 0 };
    }

    // If specific society requested, ensure it is accessible
    if (filters.society_id) {
      if (!accessibleSocietyIds.includes(filters.society_id)) {
        throw new Error("FORBIDDEN: You do not have access to operational tasks for this society");
      }
    }

    const targetSocietyIds = filters.society_id ? [filters.society_id] : accessibleSocietyIds;

    let query = adminClient
      .from("management_company_tasks")
      .select(`
        *,
        society:societies(id, name, code, city, state),
        assignee:profiles!management_company_tasks_assigned_to_fkey(id, email, full_name, phone, avatar_url),
        creator:profiles!management_company_tasks_created_by_fkey(id, email, full_name)
      `, { count: "exact" })
      .eq("management_company_id", companyId)
      .in("society_id", targetSocietyIds);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }
    if (filters.category) {
      query = query.eq("category", filters.category);
    }
    if (filters.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to);
    }
    if (filters.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }
    if (filters.overdue_only === "true") {
      query = query
        .in("status", ["OPEN", "IN_PROGRESS", "ON_HOLD"])
        .lt("due_at", new Date().toISOString());
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch operational tasks: ${error.message}`);
    }

    return {
      tasks: (data || []) as ManagementCompanyTask[],
      totalCount: count || 0,
    };
  }

  /**
   * Retrieves single task by ID with comments and activity timeline.
   */
  static async getTaskById(
    companyId: string,
    taskId: string,
    actorUserId: string
  ): Promise<{
    task: ManagementCompanyTask;
    comments: ManagementCompanyTaskComment[];
    timeline: CompanyTaskActivity[];
  }> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Access denied to company tasks");
    }

    const { data: task, error: taskErr } = await adminClient
      .from("management_company_tasks")
      .select(`
        *,
        society:societies(id, name, code, city, state),
        assignee:profiles!management_company_tasks_assigned_to_fkey(id, email, full_name, phone, avatar_url),
        creator:profiles!management_company_tasks_created_by_fkey(id, email, full_name)
      `)
      .eq("id", taskId)
      .eq("management_company_id", companyId)
      .single();

    if (taskErr || !task) {
      throw new Error("Operational task not found");
    }

    // Verify actor has access to this society
    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const hasAccess = accessibleSocieties.some((s) => s.society_id === task.society_id);

    if (!isSuper && !hasAccess) {
      throw new Error("FORBIDDEN: You do not have access to tasks for this society");
    }

    // Fetch comments
    const { data: comments } = await adminClient
      .from("management_company_task_comments")
      .select(`
        *,
        user:profiles(id, email, full_name, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    // Fetch audit timeline
    const { data: audits } = await adminClient
      .from("audit_logs")
      .select(`
        id,
        action,
        actor_user_id,
        metadata,
        created_at,
        actor:profiles!audit_logs_actor_user_id_fkey(id, email, full_name)
      `)
      .eq("resource_type", "management_company_tasks")
      .eq("resource_id", taskId)
      .order("created_at", { ascending: false });

    return {
      task: task as ManagementCompanyTask,
      comments: (comments || []) as ManagementCompanyTaskComment[],
      timeline: ((audits || []) as any[]).map((a) => ({
        id: a.id,
        action: a.action,
        actor_user_id: a.actor_user_id,
        metadata: a.metadata || {},
        created_at: a.created_at,
        actor: Array.isArray(a.actor) ? a.actor[0] : a.actor,
      })) as CompanyTaskActivity[],
    };
  }

  /**
   * Creates a new operational task.
   */
  static async createTask(
    companyId: string,
    input: CreateTaskInput,
    actorUserId: string
  ): Promise<ManagementCompanyTask> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Not an active member of this management company");
    }

    // 1. Verify company is active
    const { data: company } = await adminClient
      .from("management_companies")
      .select("id, name, status")
      .eq("id", companyId)
      .single();

    if (!company || company.status !== "ACTIVE") {
      throw new Error("FORBIDDEN: Management company is inactive");
    }

    // 2. Verify society is actively managed by company
    const { data: companySociety } = await adminClient
      .from("management_company_societies")
      .select("id, status")
      .eq("management_company_id", companyId)
      .eq("society_id", input.society_id)
      .maybeSingle();

    if (!companySociety || companySociety.status !== "ACTIVE") {
      throw new Error("FORBIDDEN: Society is not actively managed by this company");
    }

    // 3. Verify actor has access to this society
    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const hasAccess = accessibleSocieties.some((s) => s.society_id === input.society_id);

    if (!isSuper && !hasAccess) {
      throw new Error("FORBIDDEN: You do not have active access to this society");
    }

    // 4. Validate assignee if provided
    if (input.assigned_to) {
      // Must belong to this company
      const { data: assignedMember } = await adminClient
        .from("management_company_members")
        .select("id, status")
        .eq("management_company_id", companyId)
        .eq("user_id", input.assigned_to)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!assignedMember) {
        throw new Error("INVALID_ASSIGNMENT: Assigned user is not an active member of this company");
      }

      // Must have active staff assignment to this society
      const { data: staffAssignment } = await adminClient
        .from("management_company_staff_assignments")
        .select("id, status")
        .eq("management_company_id", companyId)
        .eq("user_id", input.assigned_to)
        .eq("society_id", input.society_id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!staffAssignment) {
        throw new Error("INVALID_ASSIGNMENT: Assigned user does not have an active staff assignment for this society");
      }
    }

    const { data: newTask, error } = await adminClient
      .from("management_company_tasks")
      .insert({
        management_company_id: companyId,
        society_id: input.society_id,
        title: input.title,
        description: input.description || null,
        category: input.category || "GENERAL",
        priority: input.priority || "MEDIUM",
        status: input.status || "OPEN",
        assigned_to: input.assigned_to || null,
        created_by: actorUserId,
        due_at: input.due_at || null,
        metadata: input.metadata || {},
      })
      .select(`
        *,
        society:societies(id, name, code, city, state),
        assignee:profiles!management_company_tasks_assigned_to_fkey(id, email, full_name, phone, avatar_url),
        creator:profiles!management_company_tasks_created_by_fkey(id, email, full_name)
      `)
      .single();

    if (error || !newTask) {
      throw new Error(`Failed to create operational task: ${error?.message || "Unknown error"}`);
    }

    // Audit log
    await recordAuditLog({
      actorUserId,
      societyId: input.society_id,
      action: "COMPANY_OPERATION_TASK_CREATED",
      resourceType: "management_company_tasks",
      resourceId: newTask.id,
      metadata: {
        company_id: companyId,
        society_id: input.society_id,
        task_id: newTask.id,
        title: input.title,
        category: input.category || "GENERAL",
        priority: input.priority || "MEDIUM",
        assigned_to: input.assigned_to || null,
      },
    });

    // Notify assignee if assigned
    if (input.assigned_to) {
      await sendNotification({
        recipient: input.assigned_to,
        societyId: input.society_id,
        channel: "IN_APP",
        template: "SYSTEM_ALERT",
        subject: `Operational Task Assigned: ${input.title}`,
        data: {
          title: "New Task Assigned",
          body: `You have been assigned to task "${input.title}" in society ${newTask.society?.name || "assigned society"}.`,
          link: `/company/${companyId}/operations/tasks/${newTask.id}`,
        },
      });
    }

    return newTask as ManagementCompanyTask;
  }

  /**
   * Updates an existing operational task.
   */
  static async updateTask(
    companyId: string,
    taskId: string,
    updates: UpdateTaskInput,
    actorUserId: string
  ): Promise<ManagementCompanyTask> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Not an active member of this management company");
    }

    const { data: existing, error: fetchErr } = await adminClient
      .from("management_company_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("management_company_id", companyId)
      .single();

    if (fetchErr || !existing) {
      throw new Error("Operational task not found");
    }

    // Verify actor access to society
    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const hasAccess = accessibleSocieties.some((s) => s.society_id === existing.society_id);

    if (!isSuper && !hasAccess) {
      throw new Error("FORBIDDEN: You do not have access to tasks for this society");
    }

    // Role-based editing restrictions:
    // COMPANY_OPERATIONS can only update status/description on assigned tasks or within their accessible scope
    const isManagerOrAdmin = isSuper || (member && ["COMPANY_ADMIN", "COMPANY_MANAGER"].includes(member.role));

    if (!isManagerOrAdmin) {
      // COMPANY_OPERATIONS cannot reassign tasks or change category
      if (updates.assigned_to !== undefined && updates.assigned_to !== existing.assigned_to) {
        throw new Error("FORBIDDEN: COMPANY_OPERATIONS role cannot reassign tasks");
      }
    }

    // Validate new assignee if changed
    if (updates.assigned_to !== undefined && updates.assigned_to !== null && updates.assigned_to !== existing.assigned_to) {
      const { data: assignedMember } = await adminClient
        .from("management_company_members")
        .select("id, status")
        .eq("management_company_id", companyId)
        .eq("user_id", updates.assigned_to)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!assignedMember) {
        throw new Error("INVALID_ASSIGNMENT: Assigned user is not an active member of this company");
      }

      const { data: staffAssignment } = await adminClient
        .from("management_company_staff_assignments")
        .select("id, status")
        .eq("management_company_id", companyId)
        .eq("user_id", updates.assigned_to)
        .eq("society_id", existing.society_id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!staffAssignment) {
        throw new Error("INVALID_ASSIGNMENT: Assigned user does not have an active staff assignment for this society");
      }
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.assigned_to !== undefined) payload.assigned_to = updates.assigned_to;
    if (updates.due_at !== undefined) payload.due_at = updates.due_at;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata;

    if (updates.status !== undefined) {
      payload.status = updates.status;
      if (updates.status === "COMPLETED" && existing.status !== "COMPLETED") {
        payload.completed_at = new Date().toISOString();
      } else if (updates.status !== "COMPLETED" && existing.status === "COMPLETED") {
        payload.completed_at = null;
      }
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("management_company_tasks")
      .update(payload)
      .eq("id", taskId)
      .select(`
        *,
        society:societies(id, name, code, city, state),
        assignee:profiles!management_company_tasks_assigned_to_fkey(id, email, full_name, phone, avatar_url),
        creator:profiles!management_company_tasks_created_by_fkey(id, email, full_name)
      `)
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update operational task: ${updateErr?.message || "Unknown error"}`);
    }

    // Determine audit action
    let auditAction = "COMPANY_OPERATION_TASK_UPDATED";
    if (updates.status === "COMPLETED" && existing.status !== "COMPLETED") {
      auditAction = "COMPANY_OPERATION_TASK_COMPLETED";
    } else if (existing.status === "COMPLETED" && updates.status && updates.status !== "COMPLETED") {
      auditAction = "COMPANY_OPERATION_TASK_REOPENED";
    } else if (updates.status && updates.status !== existing.status) {
      auditAction = "COMPANY_OPERATION_TASK_STATUS_CHANGED";
    } else if (updates.assigned_to !== undefined && updates.assigned_to !== existing.assigned_to) {
      auditAction = "COMPANY_OPERATION_TASK_REASSIGNED";
    }

    await recordAuditLog({
      actorUserId,
      societyId: existing.society_id,
      action: auditAction,
      resourceType: "management_company_tasks",
      resourceId: taskId,
      metadata: {
        company_id: companyId,
        society_id: existing.society_id,
        task_id: taskId,
        previous_status: existing.status,
        new_status: updated.status,
        previous_assignee: existing.assigned_to,
        new_assignee: updated.assigned_to,
        changes: payload,
      },
    });

    // Notify new assignee if reassigned
    if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
      await sendNotification({
        recipient: updates.assigned_to,
        societyId: existing.society_id,
        channel: "IN_APP",
        template: "SYSTEM_ALERT",
        subject: `Operational Task Assigned: ${updated.title}`,
        data: {
          title: "Task Assigned",
          body: `You have been assigned to task "${updated.title}" in society ${updated.society?.name || "assigned society"}.`,
          link: `/company/${companyId}/operations/tasks/${updated.id}`,
        },
      });
    }

    return updated as ManagementCompanyTask;
  }

  /**
   * Adds an operational comment to a task.
   */
  static async addTaskComment(
    companyId: string,
    taskId: string,
    commentText: string,
    actorUserId: string
  ): Promise<ManagementCompanyTaskComment> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Not an active member of this management company");
    }

    const { data: task } = await adminClient
      .from("management_company_tasks")
      .select("id, society_id, management_company_id")
      .eq("id", taskId)
      .eq("management_company_id", companyId)
      .single();

    if (!task) {
      throw new Error("Operational task not found");
    }

    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const hasAccess = accessibleSocieties.some((s) => s.society_id === task.society_id);

    if (!isSuper && !hasAccess) {
      throw new Error("FORBIDDEN: You do not have access to tasks for this society");
    }

    const { data: comment, error } = await adminClient
      .from("management_company_task_comments")
      .insert({
        task_id: taskId,
        management_company_id: companyId,
        user_id: actorUserId,
        comment: commentText,
      })
      .select(`
        *,
        user:profiles(id, email, full_name, avatar_url)
      `)
      .single();

    if (error || !comment) {
      throw new Error(`Failed to add comment: ${error?.message || "Unknown error"}`);
    }

    await recordAuditLog({
      actorUserId,
      societyId: task.society_id,
      action: "COMPANY_OPERATION_TASK_COMMENT_ADDED",
      resourceType: "management_company_tasks",
      resourceId: taskId,
      metadata: {
        company_id: companyId,
        society_id: task.society_id,
        task_id: taskId,
        comment_id: comment.id,
      },
    });

    return comment as ManagementCompanyTaskComment;
  }

  /**
   * Computes comprehensive operational metrics for the company scoped to authorized societies.
   */
  static async getOperationalMetrics(
    companyId: string,
    actorUserId: string
  ): Promise<CompanyDashboardMetrics> {
    const adminClient = createAdminClient();
    const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(companyId, actorUserId);
    const accessibleSocietyIds = accessibleSocieties.map((s) => s.society_id);

    const { count: managedSocietiesCount } = await adminClient
      .from("management_company_societies")
      .select("id", { count: "exact", head: true })
      .eq("management_company_id", companyId);

    const { count: activeSocietiesCount } = await adminClient
      .from("management_company_societies")
      .select("id", { count: "exact", head: true })
      .eq("management_company_id", companyId)
      .eq("status", "ACTIVE");

    if (accessibleSocietyIds.length === 0) {
      return {
        managedSocietiesCount: managedSocietiesCount || 0,
        activeSocietiesCount: activeSocietiesCount || 0,
        accessibleSocietiesCount: 0,
        totalBuildingsCount: 0,
        totalUnitsCount: 0,
        totalActiveMembersCount: 0,
        activeStaffCount: 0,
        activePropertyManagersCount: 0,
        openComplaintsCount: 0,
        pendingTasksCount: 0,
        overdueTasksCount: 0,
        completedTasksCount: 0,
        upcomingEventsCount: 0,
        pendingAccessRequestsCount: 0,
        upcomingMeetingsCount: 0,
        recentActivity: [],
        societySummaries: [],
      };
    }

    const now = new Date().toISOString();

    const [
      { count: buildingsCount },
      { count: unitsCount },
      { count: membersCount },
      { count: complaintsCount },
      { count: eventsCount },
      { count: accessRequestsCount },
      { count: meetingsCount },
      { count: activeStaffCount },
      { count: activePropertyManagersCount },
      { count: pendingTasksCount },
      { count: overdueTasksCount },
      { count: completedTasksCount },
      { data: recentAudits },
      { data: allTasks },
    ] = await Promise.all([
      adminClient
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .eq("status", "ACTIVE"),
      adminClient
        .from("units")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds),
      adminClient
        .from("society_memberships")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .eq("status", "ACTIVE"),
      adminClient
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .in("status", ["OPEN", "IN_PROGRESS", "ESCALATED"]),
      adminClient
        .from("events")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .gte("start_date", now),
      adminClient
        .from("society_access_requests")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .eq("status", "PENDING"),
      adminClient
        .from("society_meetings")
        .select("id", { count: "exact", head: true })
        .in("society_id", accessibleSocietyIds)
        .eq("status", "SCHEDULED"),
      adminClient
        .from("management_company_staff_assignments")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds)
        .eq("status", "ACTIVE"),
      adminClient
        .from("management_company_staff_assignments")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds)
        .eq("assignment_type", "PROPERTY_MANAGER")
        .eq("status", "ACTIVE"),
      adminClient
        .from("management_company_tasks")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds)
        .in("status", ["OPEN", "IN_PROGRESS", "ON_HOLD"]),
      adminClient
        .from("management_company_tasks")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds)
        .in("status", ["OPEN", "IN_PROGRESS", "ON_HOLD"])
        .lt("due_at", now),
      adminClient
        .from("management_company_tasks")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds)
        .eq("status", "COMPLETED"),
      adminClient
        .from("audit_logs")
        .select(`
          id,
          action,
          actor_user_id,
          metadata,
          created_at,
          actor:profiles!audit_logs_actor_user_id_fkey(id, email, full_name)
        `)
        .eq("resource_type", "management_company_tasks")
        .in("society_id", accessibleSocietyIds)
        .order("created_at", { ascending: false })
        .limit(10),
      adminClient
        .from("management_company_tasks")
        .select("id, society_id, status, due_at")
        .eq("management_company_id", companyId)
        .in("society_id", accessibleSocietyIds),
    ]);

    // Build society summaries
    const tasksBySociety: Record<string, any[]> = {};
    (allTasks || []).forEach((t: any) => {
      if (!tasksBySociety[t.society_id]) tasksBySociety[t.society_id] = [];
      tasksBySociety[t.society_id].push(t);
    });

    const societySummaries: SocietyOperationalSummary[] = accessibleSocieties.map((soc) => {
      const sTasks = tasksBySociety[soc.society_id] || [];
      const open = sTasks.filter((t) => t.status === "OPEN").length;
      const inProg = sTasks.filter((t) => t.status === "IN_PROGRESS").length;
      const completed = sTasks.filter((t) => t.status === "COMPLETED").length;
      const overdue = sTasks.filter(
        (t) => ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(t.status) && t.due_at && t.due_at < now
      ).length;

      return {
        societyId: soc.society_id,
        societyName: soc.society?.name || "Society",
        societyCode: soc.society?.code || "SOC",
        totalTasksCount: sTasks.length,
        openTasksCount: open,
        inProgressTasksCount: inProg,
        overdueTasksCount: overdue,
        completedTasksCount: completed,
        activeStaffCount: 0, // Computed below if needed
        openComplaintsCount: 0,
      };
    });

    return {
      managedSocietiesCount: managedSocietiesCount || 0,
      activeSocietiesCount: activeSocietiesCount || 0,
      accessibleSocietiesCount: accessibleSocietyIds.length,
      totalBuildingsCount: buildingsCount || 0,
      totalUnitsCount: unitsCount || 0,
      totalActiveMembersCount: membersCount || 0,
      activeStaffCount: activeStaffCount || 0,
      activePropertyManagersCount: activePropertyManagersCount || 0,
      openComplaintsCount: complaintsCount || 0,
      pendingTasksCount: pendingTasksCount || 0,
      overdueTasksCount: overdueTasksCount || 0,
      completedTasksCount: completedTasksCount || 0,
      upcomingEventsCount: eventsCount || 0,
      pendingAccessRequestsCount: accessRequestsCount || 0,
      upcomingMeetingsCount: meetingsCount || 0,
      recentActivity: ((recentAudits || []) as any[]).map((a) => ({
        id: a.id,
        action: a.action,
        actor_user_id: a.actor_user_id,
        metadata: a.metadata || {},
        created_at: a.created_at,
        actor: Array.isArray(a.actor) ? a.actor[0] : a.actor,
      })) as CompanyTaskActivity[],
      societySummaries,
    };
  }
}
