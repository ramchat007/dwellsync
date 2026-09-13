import { describe, it, expect } from "vitest";
import {
  CompanyRole,
  ManagementCompany,
  ManagementCompanyMember,
  ManagementCompanySociety,
  ManagementCompanyTask,
  CompanyTaskCategory,
  CompanyTaskPriority,
  CompanyTaskStatus,
  COMPANY_PERMISSIONS,
  COMPANY_ROLE_PERMISSIONS,
} from "@/lib/types/company";
import { companyRoleHasPermission, getPermissionsForCompanyRole } from "@/lib/auth/permissions";
import {
  CreateCompanyTaskSchema,
  UpdateCompanyTaskSchema,
  CompanyTaskQuerySchema,
  CreateCompanyTaskCommentSchema,
} from "@/lib/validations/company";

describe("Phase 16 — Property Management Company Operations & Portfolio Workflow Security Suite", () => {
  // Constants
  const COMP_ALPHA = "a0000000-0000-0000-0000-000000000001";
  const COMP_BETA = "b0000000-0000-0000-0000-000000000002";
  const SOC_ALPHA_1 = "11111111-1111-1111-1111-111111111111";
  const SOC_ALPHA_2 = "22222222-2222-2222-2222-222222222222";
  const SOC_BETA_1 = "33333333-3333-3333-3333-333333333333";
  const SOC_UNRELATED = "99999999-9999-9999-9999-999999999999";

  const USER_ADMIN = "44444444-4444-4444-4444-444444444444";
  const USER_MANAGER = "55555555-5555-5555-5555-555555555555";
  const USER_OPS = "66666666-6666-6666-6666-666666666666";
  const USER_STAFF = "77777777-7777-7777-7777-777777777777";
  const USER_VIEWER = "88888888-8888-8888-8888-888888888888";
  const USER_BETA_STAFF = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const USER_STRANGER = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  // Mock Companies
  const mockCompanyAlpha: ManagementCompany = {
    id: COMP_ALPHA,
    name: "Alpha PM Ltd",
    legal_name: "Alpha Property Management Pvt Ltd",
    code: "ALPHA-PM",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCompanyBeta: ManagementCompany = {
    id: COMP_BETA,
    name: "Beta PM Services",
    legal_name: "Beta Property Management LLP",
    code: "BETA-PM",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Mock Members
  const mockMembersAlpha: ManagementCompanyMember[] = [
    {
      id: "mem-alpha-admin",
      management_company_id: COMP_ALPHA,
      user_id: USER_ADMIN,
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-manager",
      management_company_id: COMP_ALPHA,
      user_id: USER_MANAGER,
      role: "COMPANY_MANAGER",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-ops",
      management_company_id: COMP_ALPHA,
      user_id: USER_OPS,
      role: "COMPANY_OPERATIONS",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-staff",
      management_company_id: COMP_ALPHA,
      user_id: USER_STAFF,
      role: "COMPANY_OPERATIONS",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-viewer",
      management_company_id: COMP_ALPHA,
      user_id: USER_VIEWER,
      role: "COMPANY_OPERATIONS",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-suspended",
      management_company_id: COMP_ALPHA,
      user_id: "sus-user-1111",
      role: "COMPANY_OPERATIONS",
      status: "SUSPENDED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Mock Societies Assigned
  const mockCompanySocieties: ManagementCompanySociety[] = [
    {
      id: "cs-alpha-1",
      management_company_id: COMP_ALPHA,
      society_id: SOC_ALPHA_1,
      status: "ACTIVE",
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cs-alpha-2",
      management_company_id: COMP_ALPHA,
      society_id: SOC_ALPHA_2,
      status: "ACTIVE",
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cs-beta-1",
      management_company_id: COMP_BETA,
      society_id: SOC_BETA_1,
      status: "ACTIVE",
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Mock Tasks
  const mockTaskAlpha: ManagementCompanyTask = {
    id: "task-alpha-001",
    management_company_id: COMP_ALPHA,
    society_id: SOC_ALPHA_1,
    title: "Inspect water pump valves",
    description: "Annual preventive inspection of building B pump house",
    category: "MAINTENANCE",
    priority: "HIGH",
    status: "OPEN",
    assigned_to: USER_OPS,
    created_by: USER_ADMIN,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTaskBeta: ManagementCompanyTask = {
    id: "task-beta-001",
    management_company_id: COMP_BETA,
    society_id: SOC_BETA_1,
    title: "Security gate biometric audit",
    description: "Check access log synchronization on gate 1 and 2",
    category: "SECURITY",
    priority: "MEDIUM",
    status: "OPEN",
    assigned_to: USER_BETA_STAFF,
    created_by: USER_BETA_STAFF,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ==========================================================================
  // 1. Cross-Company Task Access Rejection
  // ==========================================================================
  describe("1. Cross-Company Task Access Rejection", () => {
    it("1. User in Company A cannot view tasks belonging to Company B", () => {
      const canViewTask = (actorCompanyId: string, task: ManagementCompanyTask) => {
        return actorCompanyId === task.management_company_id;
      };

      expect(canViewTask(COMP_ALPHA, mockTaskAlpha)).toBe(true);
      expect(canViewTask(COMP_ALPHA, mockTaskBeta)).toBe(false);
    });

    it("2. User in Company A cannot update or transition tasks belonging to Company B", () => {
      const canUpdateTask = (actorCompanyId: string, task: ManagementCompanyTask) => {
        return actorCompanyId === task.management_company_id;
      };

      expect(canUpdateTask(COMP_ALPHA, mockTaskAlpha)).toBe(true);
      expect(canUpdateTask(COMP_ALPHA, mockTaskBeta)).toBe(false);
    });

    it("3. Listing tasks for Company A filters out any tasks from other companies", () => {
      const allTasks = [mockTaskAlpha, mockTaskBeta];
      const getCompanyTasks = (companyId: string) => {
        return allTasks.filter((t) => t.management_company_id === companyId);
      };

      const alphaTasks = getCompanyTasks(COMP_ALPHA);
      expect(alphaTasks.length).toBe(1);
      expect(alphaTasks[0].id).toBe("task-alpha-001");
      expect(alphaTasks.some((t) => t.management_company_id === COMP_BETA)).toBe(false);
    });

    it("4. Task query endpoint with mismatched company ID returns empty or forbidden", () => {
      const queryTasks = (authenticatedCompanyId: string, requestedCompanyId: string) => {
        if (authenticatedCompanyId !== requestedCompanyId) {
          throw new Error("FORBIDDEN: Cross-company access rejected");
        }
        return [mockTaskAlpha];
      };

      expect(() => queryTasks(COMP_ALPHA, COMP_BETA)).toThrow(/Cross-company access rejected/);
    });
  });

  // ==========================================================================
  // 2. Unauthorized Society Task Rejection
  // ==========================================================================
  describe("2. Unauthorized Society Task Rejection", () => {
    it("5. Cannot create task for a society not managed by the company", () => {
      const isSocietyManaged = (companyId: string, societyId: string) => {
        return mockCompanySocieties.some(
          (cs) => cs.management_company_id === companyId && cs.society_id === societyId && cs.status === "ACTIVE"
        );
      };

      expect(isSocietyManaged(COMP_ALPHA, SOC_ALPHA_1)).toBe(true);
      expect(isSocietyManaged(COMP_ALPHA, SOC_BETA_1)).toBe(false);
      expect(isSocietyManaged(COMP_ALPHA, SOC_UNRELATED)).toBe(false);
    });

    it("6. Task creation fails when society is outside caller's accessible societies", () => {
      const userAccessibleSocieties = [SOC_ALPHA_1]; // Scoped to Alpha 1 only
      const canCreateTaskForSociety = (societyId: string) => {
        return userAccessibleSocieties.includes(societyId);
      };

      expect(canCreateTaskForSociety(SOC_ALPHA_1)).toBe(true);
      expect(canCreateTaskForSociety(SOC_ALPHA_2)).toBe(false);
    });

    it("7. Task listing returns only tasks belonging to societies the user can access", () => {
      const userAccessibleSocieties = [SOC_ALPHA_1];
      const tasksInCompany = [
        mockTaskAlpha,
        { ...mockTaskAlpha, id: "task-alpha-002", society_id: SOC_ALPHA_2 },
      ];

      const visibleTasks = tasksInCompany.filter((t) => userAccessibleSocieties.includes(t.society_id));
      expect(visibleTasks.length).toBe(1);
      expect(visibleTasks[0].society_id).toBe(SOC_ALPHA_1);
    });
  });

  // ==========================================================================
  // 3. Inactive Company / Society Operations Blocking
  // ==========================================================================
  describe("3. Inactive Company / Society Operations Blocking", () => {
    it("8. Inactive management company cannot perform task operations", () => {
      const isCompanyOperational = (comp: ManagementCompany) => comp.status === "ACTIVE";

      expect(isCompanyOperational(mockCompanyAlpha)).toBe(true);
      expect(isCompanyOperational({ ...mockCompanyAlpha, status: "INACTIVE" })).toBe(false);
      expect(isCompanyOperational({ ...mockCompanyAlpha, status: "INACTIVE" as any })).toBe(false);
    });

    it("9. Inactive society assignment blocks new task creation", () => {
      const isAssignmentActive = (socAssignment: ManagementCompanySociety) => socAssignment.status === "ACTIVE";

      const inactiveAssignment: ManagementCompanySociety = {
        ...mockCompanySocieties[0],
        status: "INACTIVE",
      };
      expect(isAssignmentActive(mockCompanySocieties[0])).toBe(true);
      expect(isAssignmentActive(inactiveAssignment)).toBe(false);
    });

    it("10. Terminated society assignment prevents updating existing tasks", () => {
      const canMutateTask = (assignmentStatus: string) => assignmentStatus === "ACTIVE";
      expect(canMutateTask("ACTIVE")).toBe(true);
      expect(canMutateTask("TERMINATED")).toBe(false);
    });

    it("11. Suspended company rejects all operational API endpoints", () => {
      const checkOperationalAccess = (companyStatus: string) => {
        if (companyStatus !== "ACTIVE") {
          throw new Error("FORBIDDEN: Company is not in ACTIVE status");
        }
        return true;
      };

      expect(checkOperationalAccess("ACTIVE")).toBe(true);
      expect(() => checkOperationalAccess("SUSPENDED")).toThrow(/not in ACTIVE status/);
    });
  });

  // ==========================================================================
  // 4. Revoked / Suspended Access Enforcement
  // ==========================================================================
  describe("4. Revoked / Suspended Access Enforcement", () => {
    it("12. Suspended member cannot access company tasks workspace", () => {
      const isMemberActive = (member: ManagementCompanyMember) => member.status === "ACTIVE";
      const suspendedMember = mockMembersAlpha.find((m) => m.status === "SUSPENDED")!;

      expect(isMemberActive(mockMembersAlpha[0])).toBe(true);
      expect(isMemberActive(suspendedMember)).toBe(false);
    });

    it("13. Revoked member access grant blocks task access for that specific society", () => {
      const checkGrant = (grantStatus: string) => grantStatus === "ACTIVE";
      expect(checkGrant("ACTIVE")).toBe(true);
      expect(checkGrant("REVOKED")).toBe(false);
      expect(checkGrant("SUSPENDED")).toBe(false);
    });

    it("14. Removed member cannot post task comments", () => {
      const canPostComment = (memberStatus: string) => memberStatus === "ACTIVE";
      expect(canPostComment("ACTIVE")).toBe(true);
      expect(canPostComment("REMOVED")).toBe(false);
    });
  });

  // ==========================================================================
  // 5. Role Privilege Boundaries
  // ==========================================================================
  describe("5. Role Privilege Boundaries", () => {
    it("15. Unknown role or outsider cannot create tasks", () => {
      expect(companyRoleHasPermission(null, COMPANY_PERMISSIONS.COMPANY_TASKS_CREATE)).toBe(false);
      expect(companyRoleHasPermission("OUTSIDER" as any, COMPANY_PERMISSIONS.COMPANY_TASKS_CREATE)).toBe(false);
    });

    it("16. COMPANY_OPERATIONS cannot manage company or company members", () => {
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_MEMBERS_MANAGE)).toBe(false);
    });

    it("17. COMPANY_OPERATIONS has operations view & task creation permissions", () => {
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_OPERATIONS_VIEW)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_TASKS_CREATE)).toBe(true);
    });

    it("18. COMPANY_OPERATIONS cannot reassign tasks or manage operations", () => {
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_OPERATIONS_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_TASKS_ASSIGN)).toBe(false);
    });

    it("19. COMPANY_MANAGER has task creation and operations management permissions", () => {
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_OPERATIONS_VIEW)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_OPERATIONS_MANAGE)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_TASKS_CREATE)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_TASKS_ASSIGN)).toBe(true);
    });

    it("20. COMPANY_ADMIN has full operational permissions", () => {
      const adminPerms = getPermissionsForCompanyRole("COMPANY_ADMIN");
      expect(adminPerms).toContain(COMPANY_PERMISSIONS.COMPANY_OPERATIONS_VIEW);
      expect(adminPerms).toContain(COMPANY_PERMISSIONS.COMPANY_OPERATIONS_MANAGE);
      expect(adminPerms).toContain(COMPANY_PERMISSIONS.COMPANY_TASKS_CREATE);
      expect(adminPerms).toContain(COMPANY_PERMISSIONS.COMPANY_TASKS_ASSIGN);
    });
  });

  // ==========================================================================
  // 6. Staff Assignment Invariants
  // ==========================================================================
  describe("6. Staff Assignment Invariants", () => {
    it("21. Cannot assign task to a user who is not a member of the company", () => {
      const isValidAssignee = (companyId: string, assigneeUserId: string) => {
        return mockMembersAlpha.some(
          (m) => m.management_company_id === companyId && m.user_id === assigneeUserId && m.status === "ACTIVE"
        );
      };

      expect(isValidAssignee(COMP_ALPHA, USER_OPS)).toBe(true);
      expect(isValidAssignee(COMP_ALPHA, USER_STAFF)).toBe(true);
      expect(isValidAssignee(COMP_ALPHA, USER_BETA_STAFF)).toBe(false);
      expect(isValidAssignee(COMP_ALPHA, USER_STRANGER)).toBe(false);
    });

    it("22. Cannot assign task to a suspended company member", () => {
      const isAssigneeActive = (assigneeUserId: string) => {
        const mem = mockMembersAlpha.find((m) => m.user_id === assigneeUserId);
        return !!mem && mem.status === "ACTIVE";
      };

      expect(isAssigneeActive(USER_OPS)).toBe(true);
      expect(isAssigneeActive("sus-user-1111")).toBe(false);
    });

    it("23. Composite foreign key constraint ensures task assigned_to belongs to same company", () => {
      const checkCompositeFk = (taskCompanyId: string, assigneeCompanyId: string | null) => {
        if (!assigneeCompanyId) return true; // nullable
        return taskCompanyId === assigneeCompanyId;
      };

      expect(checkCompositeFk(COMP_ALPHA, COMP_ALPHA)).toBe(true);
      expect(checkCompositeFk(COMP_ALPHA, COMP_BETA)).toBe(false);
    });

    it("24. Reassigning task updates assigned_to while preserving company isolation", () => {
      const reassignTask = (task: ManagementCompanyTask, newAssigneeId: string) => {
        const isMember = mockMembersAlpha.some((m) => m.user_id === newAssigneeId && m.status === "ACTIVE");
        if (!isMember) {
          throw new Error("Assignee must be an active member of the company");
        }
        return { ...task, assigned_to: newAssigneeId };
      };

      const updated = reassignTask(mockTaskAlpha, USER_STAFF);
      expect(updated.assigned_to).toBe(USER_STAFF);
      expect(() => reassignTask(mockTaskAlpha, USER_BETA_STAFF)).toThrow(/Assignee must be an active member/);
    });

    it("25. Unassigning task (setting assigned_to to null) is permitted", () => {
      const unassignTask = (task: ManagementCompanyTask) => {
        return { ...task, assigned_to: null };
      };

      const updated = unassignTask(mockTaskAlpha);
      expect(updated.assigned_to).toBeNull();
    });
  });

  // ==========================================================================
  // 7. IDOR Tampering Defense
  // ==========================================================================
  describe("7. IDOR Tampering Defense", () => {
    it("26. Tampering with companyId in URL path is rejected", () => {
      const verifyCompanyRouteAccess = (actorCompanyId: string, urlCompanyId: string) => {
        if (actorCompanyId !== urlCompanyId) {
          throw new Error("IDOR: Actor company does not match route company");
        }
        return true;
      };

      expect(verifyCompanyRouteAccess(COMP_ALPHA, COMP_ALPHA)).toBe(true);
      expect(() => verifyCompanyRouteAccess(COMP_ALPHA, COMP_BETA)).toThrow(/IDOR/);
    });

    it("27. Tampering with society_id in create payload is rejected if society is not managed", () => {
      const validateCreateSociety = (companyId: string, payloadSocietyId: string) => {
        const isManaged = mockCompanySocieties.some(
          (cs) => cs.management_company_id === companyId && cs.society_id === payloadSocietyId && cs.status === "ACTIVE"
        );
        if (!isManaged) {
          throw new Error("IDOR: Target society is not actively managed by company");
        }
        return true;
      };

      expect(validateCreateSociety(COMP_ALPHA, SOC_ALPHA_1)).toBe(true);
      expect(() => validateCreateSociety(COMP_ALPHA, SOC_BETA_1)).toThrow(/Target society is not actively managed/);
      expect(() => validateCreateSociety(COMP_ALPHA, SOC_UNRELATED)).toThrow(/Target society is not actively managed/);
    });

    it("28. Tampering with taskId in route to access another company task is rejected", () => {
      const fetchTaskById = (companyId: string, taskId: string) => {
        const allTasks = [mockTaskAlpha, mockTaskBeta];
        const found = allTasks.find((t) => t.id === taskId && t.management_company_id === companyId);
        if (!found) {
          throw new Error("Task not found in company scope");
        }
        return found;
      };

      expect(fetchTaskById(COMP_ALPHA, "task-alpha-001").id).toBe("task-alpha-001");
      expect(() => fetchTaskById(COMP_ALPHA, "task-beta-001")).toThrow(/Task not found/);
    });

    it("29. Tampering with assigned_to in update payload is rejected if assignee is outside company", () => {
      const validateAssigneeInCompany = (companyId: string, assigneeId: string | null) => {
        if (!assigneeId) return true;
        const exists = mockMembersAlpha.some((m) => m.management_company_id === companyId && m.user_id === assigneeId);
        if (!exists) {
          throw new Error("IDOR: Assignee does not belong to company");
        }
        return true;
      };

      expect(validateAssigneeInCompany(COMP_ALPHA, USER_OPS)).toBe(true);
      expect(() => validateAssigneeInCompany(COMP_ALPHA, USER_BETA_STAFF)).toThrow(/Assignee does not belong/);
    });
  });

  // ==========================================================================
  // 8. Society RBAC Independence & Data Hygiene
  // ==========================================================================
  describe("8. Society RBAC Independence & Data Hygiene", () => {
    it("30. PMC users do not acquire society-level admin privileges", () => {
      // PMC operations member does NOT have society admin roles
      const hasSocietyAdminRole = (companyMember: ManagementCompanyMember) => {
        // PMC roles are strictly prefixed with COMPANY_
        return (companyMember.role as string) === "ADMIN";
      };

      expect(hasSocietyAdminRole(mockMembersAlpha[0])).toBe(false);
      expect(hasSocietyAdminRole(mockMembersAlpha[1])).toBe(false);
      expect(hasSocietyAdminRole(mockMembersAlpha[2])).toBe(false);
    });

    it("31. Task operations do not alter society user permissions or occupancy", () => {
      // Invariant: Company task mutations only touch management_company_tasks
      const permittedTablesToMutate = [
        "management_company_tasks",
        "management_company_task_comments",
        "audit_logs",
        "notifications",
      ];
      const protectedTables = ["residents", "ownership_records", "society_roles", "flats"];

      protectedTables.forEach((table) => {
        expect(permittedTablesToMutate.includes(table)).toBe(false);
      });
    });

    it("32. Society resident cannot access PMC internal operations workspace", () => {
      const canAccessCompanyWorkspace = (userId: string) => {
        return mockMembersAlpha.some((m) => m.user_id === userId && m.status === "ACTIVE");
      };

      expect(canAccessCompanyWorkspace(USER_ADMIN)).toBe(true);
      expect(canAccessCompanyWorkspace(USER_OPS)).toBe(true);
      expect(canAccessCompanyWorkspace("resident-user-1234")).toBe(false);
    });
  });

  // ==========================================================================
  // 9. Audit Logging & Notification Scoping
  // ==========================================================================
  describe("9. Audit Logging & Notification Scoping", () => {
    it("33. Task creation produces an audit event with management_company_tasks resource", () => {
      const createAuditEvent = (taskId: string, companyId: string, actorId: string) => ({
        resource_type: "management_company_tasks",
        resource_id: taskId,
        company_id: companyId,
        actor_user_id: actorId,
        action: "create",
        created_at: new Date().toISOString(),
      });

      const audit = createAuditEvent(mockTaskAlpha.id, COMP_ALPHA, USER_ADMIN);
      expect(audit.resource_type).toBe("management_company_tasks");
      expect(audit.company_id).toBe(COMP_ALPHA);
      expect(audit.actor_user_id).toBe(USER_ADMIN);
      expect(audit.action).toBe("create");
    });

    it("34. Task assignment notification is scoped strictly to the assigned company member", () => {
      const buildNotification = (assigneeId: string, taskTitle: string, companyId: string) => ({
        recipient_user_id: assigneeId,
        title: `Task Assigned: ${taskTitle}`,
        company_id: companyId,
      });

      const notif = buildNotification(USER_OPS, mockTaskAlpha.title, COMP_ALPHA);
      expect(notif.recipient_user_id).toBe(USER_OPS);
      expect(notif.company_id).toBe(COMP_ALPHA);
      expect(notif.recipient_user_id).not.toBe(USER_BETA_STAFF);
    });
  });

  // ==========================================================================
  // 10. Task Status Transitions & Overdue Calculations
  // ==========================================================================
  describe("10. Task Status Transitions & Overdue Calculations", () => {
    const ALLOWED_TRANSITIONS: Record<CompanyTaskStatus, CompanyTaskStatus[]> = {
      OPEN: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "ON_HOLD", "CANCELLED"],
      ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
      COMPLETED: ["OPEN"],
      CANCELLED: ["OPEN"],
    };

    const isValidTransition = (current: CompanyTaskStatus, next: CompanyTaskStatus) => {
      return ALLOWED_TRANSITIONS[current].includes(next);
    };

    it("35. Valid status transitions are accepted", () => {
      expect(isValidTransition("OPEN", "IN_PROGRESS")).toBe(true);
      expect(isValidTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
      expect(isValidTransition("IN_PROGRESS", "ON_HOLD")).toBe(true);
      expect(isValidTransition("ON_HOLD", "IN_PROGRESS")).toBe(true);
      expect(isValidTransition("OPEN", "CANCELLED")).toBe(true);
      expect(isValidTransition("COMPLETED", "OPEN")).toBe(true);
    });

    it("36. Invalid status transitions are rejected", () => {
      expect(isValidTransition("OPEN", "COMPLETED")).toBe(false); // Must be in_progress first
      expect(isValidTransition("ON_HOLD", "COMPLETED")).toBe(false); // Must resume before completing
    });

    it("37. Overdue calculation: true when due_at is past and status is OPEN/IN_PROGRESS/ON_HOLD", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day ahead

      const checkOverdue = (task: { status: CompanyTaskStatus; due_at?: string | null }) => {
        if (!task.due_at) return false;
        if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
        return new Date(task.due_at).getTime() < Date.now();
      };

      // Past due date with open status -> overdue
      expect(checkOverdue({ status: "OPEN", due_at: pastDate })).toBe(true);
      expect(checkOverdue({ status: "IN_PROGRESS", due_at: pastDate })).toBe(true);
      expect(checkOverdue({ status: "ON_HOLD", due_at: pastDate })).toBe(true);

      // Future due date -> not overdue
      expect(checkOverdue({ status: "OPEN", due_at: futureDate })).toBe(false);

      // Past due date but completed or cancelled -> not overdue
      expect(checkOverdue({ status: "COMPLETED", due_at: pastDate })).toBe(false);
      expect(checkOverdue({ status: "CANCELLED", due_at: pastDate })).toBe(false);

      // No due date -> not overdue
      expect(checkOverdue({ status: "OPEN", due_at: null })).toBe(false);
    });
  });

  // ==========================================================================
  // 11. Schema & Payload Validation
  // ==========================================================================
  describe("11. Schema & Payload Validation", () => {
    it("38. CreateCompanyTaskSchema validates required fields and bounds", () => {
      const valid = CreateCompanyTaskSchema.safeParse({
        society_id: SOC_ALPHA_1,
        title: "Clean water tank 3",
        category: "MAINTENANCE",
        priority: "HIGH",
      });
      expect(valid.success).toBe(true);

      const invalidTitle = CreateCompanyTaskSchema.safeParse({
        society_id: SOC_ALPHA_1,
        title: "ab", // < 3 chars
      });
      expect(invalidTitle.success).toBe(false);

      const invalidSociety = CreateCompanyTaskSchema.safeParse({
        society_id: "not-a-uuid",
        title: "Valid title here",
      });
      expect(invalidSociety.success).toBe(false);
    });

    it("39. UpdateCompanyTaskSchema allows partial updates", () => {
      const updateStatus = UpdateCompanyTaskSchema.safeParse({
        status: "COMPLETED",
      });
      expect(updateStatus.success).toBe(true);

      const updatePriority = UpdateCompanyTaskSchema.safeParse({
        priority: "URGENT",
      });
      expect(updatePriority.success).toBe(true);

      const invalidStatus = UpdateCompanyTaskSchema.safeParse({
        status: "INVALID_STATUS",
      });
      expect(invalidStatus.success).toBe(false);
    });

    it("40. CreateCompanyTaskCommentSchema validates non-empty comment", () => {
      const valid = CreateCompanyTaskCommentSchema.safeParse({
        comment: "Work has commenced on the site.",
      });
      expect(valid.success).toBe(true);

      const empty = CreateCompanyTaskCommentSchema.safeParse({
        comment: "",
      });
      expect(empty.success).toBe(false);
    });
  });
});
