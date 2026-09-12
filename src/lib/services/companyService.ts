import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendNotification } from "@/lib/services/notificationService";
import {
  CompanyRole,
  CompanyStatus,
  CompanyMemberStatus,
  CompanySocietyStatus,
  CompanySocietyAccessStatus,
  CompanyStaffAssignmentType,
  CompanyStaffAssignmentStatus,
  ManagementCompany,
  ManagementCompanyMember,
  ManagementCompanySociety,
  ManagementCompanySocietyAccess,
  ManagementCompanyStaffAssignment,
  CompanyDashboardMetrics,
  COMPANY_ROLE_PRECEDENCE,
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

export class CompanyService {
  /**
   * Retrieves company profile.
   */
  static async getCompany(companyId: string, actorUserId: string): Promise<ManagementCompany> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Not a member of this management company");
    }

    const { data: company, error } = await adminClient
      .from("management_companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error || !company) {
      throw new Error("Management company not found");
    }

    return company as ManagementCompany;
  }

  /**
   * Updates company settings (COMPANY_ADMIN or SUPER_ADMIN only).
   */
  static async updateCompany(
    companyId: string,
    input: Partial<ManagementCompany>,
    actorUserId: string
  ): Promise<ManagementCompany> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!member || member.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can update company settings");
    }

    const { data: updated, error } = await adminClient
      .from("management_companies")
      .update({
        ...(input.name ? { name: input.name } : {}),
        ...(input.legal_name !== undefined ? { legal_name: input.legal_name } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.contact_email !== undefined ? { contact_email: input.contact_email } : {}),
        ...(input.contact_phone !== undefined ? { contact_phone: input.contact_phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.logo_url !== undefined ? { logo_url: input.logo_url } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update company: ${error?.message || "Unknown error"}`);
    }

    await recordAuditLog({
      actorUserId,
      action: "COMPANY_UPDATED",
      resourceType: "management_companies",
      resourceId: companyId,
      metadata: { changes: input },
    });

    return updated as ManagementCompany;
  }

  /**
   * Lists company members.
   */
  static async listMembers(companyId: string, actorUserId: string): Promise<ManagementCompanyMember[]> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Access denied to company members");
    }

    const { data, error } = await adminClient
      .from("management_company_members")
      .select(`
        *,
        profile:profiles(id, email, full_name, display_name, phone, avatar_url)
      `)
      .eq("management_company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as ManagementCompanyMember[];
  }

  /**
   * Adds a member to the company (COMPANY_ADMIN or SUPER_ADMIN only).
   */
  static async addMember(
    companyId: string,
    input: { userId?: string; email?: string; role: CompanyRole; status?: CompanyMemberStatus },
    actorUserId: string
  ): Promise<ManagementCompanyMember> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can add members to the management company");
    }

    // Role precedence check: cannot assign a role higher or equal to SUPER_ADMIN (which is not a company role anyway)
    if (!["COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"].includes(input.role)) {
      throw new Error("INVALID_ROLE: Role must be a valid company role");
    }

    let targetUserId = input.userId;
    if (!targetUserId && input.email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", input.email.toLowerCase().trim())
        .maybeSingle();

      if (!profile) {
        throw new Error("USER_NOT_FOUND: No registered profile found with that email");
      }
      targetUserId = profile.id;
    }

    if (!targetUserId) {
      throw new Error("INVALID_INPUT: Target user ID or email required");
    }

    const { data: newMember, error } = await adminClient
      .from("management_company_members")
      .insert({
        management_company_id: companyId,
        user_id: targetUserId,
        role: input.role,
        status: input.status || "ACTIVE",
        created_by: actorUserId,
      })
      .select(`
        *,
        profile:profiles(id, email, full_name, display_name, phone)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("ALREADY_EXISTS: User is already a member of this management company");
      }
      throw new Error(error.message);
    }

    await recordAuditLog({
      actorUserId,
      action: "COMPANY_MEMBER_ADDED",
      resourceType: "management_company_members",
      resourceId: newMember.id,
      metadata: { target_user_id: targetUserId, role: input.role, company_id: companyId },
    });

    // Notify new member
    await sendNotification({
      recipient: targetUserId,
      channel: "IN_APP",
      template: "SYSTEM_ALERT",
      subject: "Added to Property Management Company",
      data: {
        title: "Added to Property Management Company",
        body: `You have been added to the management company as ${input.role}.`,
        link: `/company/${companyId}/dashboard`,
      },
    });

    return newMember as ManagementCompanyMember;
  }

  /**
   * Updates a member's role or status.
   */
  static async updateMember(
    companyId: string,
    memberId: string,
    input: { role?: CompanyRole; status?: CompanyMemberStatus },
    actorUserId: string
  ): Promise<ManagementCompanyMember> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can modify company members");
    }

    const { data: existingMember } = await adminClient
      .from("management_company_members")
      .select("*")
      .eq("id", memberId)
      .eq("management_company_id", companyId)
      .single();

    if (!existingMember) {
      throw new Error("Member not found in this management company");
    }

    if (input.role && !["COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"].includes(input.role)) {
      throw new Error("INVALID_ROLE: Role must be a valid company role");
    }

    // Guard: Prevent leaving the company without any active COMPANY_ADMIN
    if (
      existingMember.role === "COMPANY_ADMIN" &&
      (input.status === "REVOKED" || input.status === "SUSPENDED" || (input.role && input.role !== "COMPANY_ADMIN"))
    ) {
      const { count } = await adminClient
        .from("management_company_members")
        .select("id", { count: "exact", head: true })
        .eq("management_company_id", companyId)
        .eq("role", "COMPANY_ADMIN")
        .eq("status", "ACTIVE")
        .neq("id", memberId);

      if (!count || count === 0) {
        throw new Error("CANNOT_REMOVE_LAST_ADMIN: Cannot revoke, suspend, or demote the only active company administrator");
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.role) updates.role = input.role;
    if (input.status) updates.status = input.status;

    const { data: updated, error } = await adminClient
      .from("management_company_members")
      .update(updates)
      .eq("id", memberId)
      .select(`
        *,
        profile:profiles(id, email, full_name, display_name, phone)
      `)
      .single();

    if (error) throw new Error(error.message);

    await recordAuditLog({
      actorUserId,
      action: input.status === "SUSPENDED" ? "COMPANY_MEMBER_SUSPENDED" : "COMPANY_MEMBER_UPDATED",
      resourceType: "management_company_members",
      resourceId: memberId,
      metadata: { updates, target_user_id: existingMember.user_id, company_id: companyId },
    });

    return updated as ManagementCompanyMember;
  }

  /**
   * Lists societies managed by the company.
   */
  static async listSocieties(companyId: string, actorUserId: string): Promise<ManagementCompanySociety[]> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Access denied to managed societies");
    }

    const { data, error } = await adminClient
      .from("management_company_societies")
      .select(`
        *,
        society:societies(id, name, code, status, city, state, address_line_1)
      `)
      .eq("management_company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as ManagementCompanySociety[];
  }

  /**
   * Assigns a society to the company.
   * Enforces Rule 2: A society can belong to at most one active management company.
   */
  static async assignSociety(
    companyId: string,
    societyId: string,
    actorUserId: string
  ): Promise<ManagementCompanySociety> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can assign societies to the management company");
    }

    // Verify society exists
    const { data: society, error: socError } = await adminClient
      .from("societies")
      .select("id, name, code, status")
      .eq("id", societyId)
      .single();

    if (socError || !society) {
      throw new Error("SOCIETY_NOT_FOUND: The target society does not exist");
    }

    // Rule 2 check: Is society already actively managed by another company?
    const { data: existingActive } = await adminClient
      .from("management_company_societies")
      .select("id, management_company_id, management_company:management_companies(name)")
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingActive) {
      if (existingActive.management_company_id === companyId) {
        throw new Error("ALREADY_ASSIGNED: Society is already actively managed by this company");
      } else {
        throw new Error(
          `SOCIETY_ALREADY_MANAGED: This society is already managed by another active property management company`
        );
      }
    }

    const { data: assignment, error } = await adminClient
      .from("management_company_societies")
      .insert({
        management_company_id: companyId,
        society_id: societyId,
        status: "ACTIVE",
        assigned_by: actorUserId,
      })
      .select(`
        *,
        society:societies(id, name, code, status, city, state)
      `)
      .single();

    if (error) throw new Error(error.message);

    await recordAuditLog({
      actorUserId,
      societyId,
      action: "COMPANY_SOCIETY_ASSIGNED",
      resourceType: "management_company_societies",
      resourceId: assignment.id,
      metadata: { society_id: societyId, company_id: companyId },
    });

    return assignment as ManagementCompanySociety;
  }

  /**
   * Updates society assignment status (e.g. INACTIVE / ACTIVE).
   * Note: Deactivating or removing assignment does NOT delete the canonical society.
   */
  static async updateSocietyAssignment(
    companyId: string,
    assignmentId: string,
    status: CompanySocietyStatus,
    actorUserId: string
  ): Promise<ManagementCompanySociety> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can update society assignment");
    }

    const { data: existing } = await adminClient
      .from("management_company_societies")
      .select("*")
      .eq("id", assignmentId)
      .eq("management_company_id", companyId)
      .single();

    if (!existing) {
      throw new Error("Society assignment not found for this management company");
    }

    // If reactivating, verify Rule 2 again
    if (status === "ACTIVE") {
      const { data: otherActive } = await adminClient
        .from("management_company_societies")
        .select("id, management_company_id")
        .eq("society_id", existing.society_id)
        .eq("status", "ACTIVE")
        .neq("id", assignmentId)
        .maybeSingle();

      if (otherActive) {
        throw new Error("SOCIETY_ALREADY_MANAGED: Another active management company already manages this society");
      }
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === "INACTIVE" ? { removed_at: new Date().toISOString() } : { removed_at: null }),
    };

    const { data: updated, error } = await adminClient
      .from("management_company_societies")
      .update(updates)
      .eq("id", assignmentId)
      .select(`
        *,
        society:societies(id, name, code, status)
      `)
      .single();

    if (error) throw new Error(error.message);

    await recordAuditLog({
      actorUserId,
      societyId: existing.society_id,
      action: status === "INACTIVE" ? "COMPANY_SOCIETY_REMOVED" : "COMPANY_SOCIETY_ASSIGNED",
      resourceType: "management_company_societies",
      resourceId: assignmentId,
      metadata: { status, company_id: companyId, society_id: existing.society_id },
    });

    return updated as ManagementCompanySociety;
  }

  /**
   * Lists explicit member access records for a managed society.
   */
  static async listSocietyAccess(
    companyId: string,
    societyId: string,
    actorUserId: string
  ): Promise<ManagementCompanySocietyAccess[]> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!member || !["COMPANY_ADMIN", "COMPANY_MANAGER"].includes(member.role))) {
      throw new Error("FORBIDDEN: Requires company admin or manager role");
    }

    // Get society assignment id
    const { data: socAssignment } = await adminClient
      .from("management_company_societies")
      .select("id")
      .eq("management_company_id", companyId)
      .eq("society_id", societyId)
      .single();

    if (!socAssignment) {
      throw new Error("Society assignment not found");
    }

    const { data, error } = await adminClient
      .from("management_company_society_access")
      .select(`
        *,
        member:management_company_members (
          id,
          user_id,
          role,
          status,
          profile:profiles(id, email, full_name, display_name)
        )
      `)
      .eq("management_company_id", companyId)
      .eq("management_company_society_id", socAssignment.id);

    if (error) throw new Error(error.message);
    return (data || []) as ManagementCompanySocietyAccess[];
  }

  /**
   * Grants explicit access to a society for a company member.
   * Enforces composite tenant protection.
   */
  static async grantSocietyAccess(
    companyId: string,
    input: { memberId: string; societyAssignmentId: string; status?: CompanySocietyAccessStatus },
    actorUserId: string
  ): Promise<ManagementCompanySocietyAccess> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can grant explicit society access");
    }

    // Verify member belongs to this company
    const { data: targetMember } = await adminClient
      .from("management_company_members")
      .select("id, user_id, status")
      .eq("id", input.memberId)
      .eq("management_company_id", companyId)
      .single();

    if (!targetMember || targetMember.status !== "ACTIVE") {
      throw new Error("INVALID_MEMBER: Member is not active in this company");
    }

    // Verify society assignment belongs to this company and is ACTIVE
    const { data: societyAssignment } = await adminClient
      .from("management_company_societies")
      .select("id, society_id, status")
      .eq("id", input.societyAssignmentId)
      .eq("management_company_id", companyId)
      .single();

    if (!societyAssignment || societyAssignment.status !== "ACTIVE") {
      throw new Error("INVALID_SOCIETY: Society assignment is not active in this company");
    }

    const { data: access, error } = await adminClient
      .from("management_company_society_access")
      .insert({
        management_company_id: companyId,
        management_company_member_id: input.memberId,
        management_company_society_id: input.societyAssignmentId,
        status: input.status || "ACTIVE",
        assigned_by: actorUserId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("ALREADY_GRANTED: Member already has access assigned for this society");
      }
      throw new Error(error.message);
    }

    await recordAuditLog({
      actorUserId,
      societyId: societyAssignment.society_id,
      action: "COMPANY_SOCIETY_ACCESS_GRANTED",
      resourceType: "management_company_society_access",
      resourceId: access.id,
      metadata: {
        member_id: input.memberId,
        target_user_id: targetMember.user_id,
        society_id: societyAssignment.society_id,
        company_id: companyId,
      },
    });

    // Notify member
    await sendNotification({
      recipient: targetMember.user_id,
      societyId: societyAssignment.society_id,
      channel: "IN_APP",
      template: "SYSTEM_ALERT",
      subject: "Society Access Granted",
      data: {
        title: "Society Access Granted",
        body: "You have been granted access to manage society resources.",
        link: `/society/${societyAssignment.society_id}/dashboard`,
      },
    });

    return access as ManagementCompanySocietyAccess;
  }

  /**
   * Updates explicit society access status (e.g. SUSPENDED or REVOKED).
   */
  static async updateSocietyAccess(
    companyId: string,
    accessId: string,
    status: CompanySocietyAccessStatus,
    actorUserId: string
  ): Promise<ManagementCompanySocietyAccess> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || actorMember.role !== "COMPANY_ADMIN")) {
      throw new Error("FORBIDDEN: Only COMPANY_ADMIN can update society access");
    }

    const { data: existingAccess } = await adminClient
      .from("management_company_society_access")
      .select(`
        *,
        society_assignment:management_company_societies(society_id),
        member:management_company_members(user_id)
      `)
      .eq("id", accessId)
      .eq("management_company_id", companyId)
      .single();

    if (!existingAccess) {
      throw new Error("Access record not found");
    }

    const { data: updated, error } = await adminClient
      .from("management_company_society_access")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accessId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const action =
      status === "REVOKED"
        ? "COMPANY_SOCIETY_ACCESS_REVOKED"
        : status === "SUSPENDED"
        ? "COMPANY_SOCIETY_ACCESS_SUSPENDED"
        : "COMPANY_SOCIETY_ACCESS_GRANTED";

    await recordAuditLog({
      actorUserId,
      societyId: existingAccess.society_assignment?.society_id,
      action,
      resourceType: "management_company_society_access",
      resourceId: accessId,
      metadata: { status, company_id: companyId, target_user_id: existingAccess.member?.user_id },
    });

    return updated as ManagementCompanySocietyAccess;
  }

  /**
   * Lists operational staff assignments.
   */
  static async listStaffAssignments(
    companyId: string,
    actorUserId: string,
    societyId?: string
  ): Promise<ManagementCompanyStaffAssignment[]> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && !member) {
      throw new Error("UNAUTHORIZED: Access denied to staff assignments");
    }

    let query = adminClient
      .from("management_company_staff_assignments")
      .select(`
        *,
        profile:profiles(id, email, full_name, phone),
        society:societies(id, name, code)
      `)
      .eq("management_company_id", companyId);

    if (societyId) {
      query = query.eq("society_id", societyId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as ManagementCompanyStaffAssignment[];
  }

  /**
   * Assigns staff to a society.
   */
  static async assignStaff(
    companyId: string,
    input: {
      userId: string;
      societyId: string;
      assignmentType: CompanyStaffAssignmentType;
      status?: CompanyStaffAssignmentStatus;
      startDate?: string;
      endDate?: string | null;
    },
    actorUserId: string
  ): Promise<ManagementCompanyStaffAssignment> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || !["COMPANY_ADMIN", "COMPANY_MANAGER"].includes(actorMember.role))) {
      throw new Error("FORBIDDEN: Requires COMPANY_ADMIN or COMPANY_MANAGER role to assign staff");
    }

    // Verify society is actively managed by company
    const { data: compSoc } = await adminClient
      .from("management_company_societies")
      .select("id")
      .eq("management_company_id", companyId)
      .eq("society_id", input.societyId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!compSoc) {
      throw new Error("Society is not actively managed by this company");
    }

    // Verify staff user is an active member of this management company
    const { data: staffMember } = await adminClient
      .from("management_company_members")
      .select("id, status")
      .eq("management_company_id", companyId)
      .eq("user_id", input.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!staffMember) {
      throw new Error("INVALID_STAFF_MEMBER: Staff user must be an active member of this management company");
    }

    const { data: assignment, error } = await adminClient
      .from("management_company_staff_assignments")
      .insert({
        management_company_id: companyId,
        user_id: input.userId,
        society_id: input.societyId,
        assignment_type: input.assignmentType || "OPERATIONS",
        status: input.status || "ACTIVE",
        start_date: input.startDate || new Date().toISOString().split("T")[0],
        end_date: input.endDate || null,
        assigned_by: actorUserId,
      })
      .select(`
        *,
        profile:profiles(id, email, full_name, phone),
        society:societies(id, name, code)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Staff member already has an assignment of this type in this society");
      }
      throw new Error(error.message);
    }

    await recordAuditLog({
      actorUserId,
      societyId: input.societyId,
      action: "COMPANY_STAFF_ASSIGNED",
      resourceType: "management_company_staff_assignments",
      resourceId: assignment.id,
      metadata: {
        user_id: input.userId,
        society_id: input.societyId,
        assignment_type: input.assignmentType,
        company_id: companyId,
      },
    });

    // Notify staff user
    await sendNotification({
      recipient: input.userId,
      societyId: input.societyId,
      channel: "IN_APP",
      template: "SYSTEM_ALERT",
      subject: "Staff Assignment Created",
      data: {
        title: "Staff Assignment Created",
        body: `You have been assigned as ${input.assignmentType} for this society.`,
        link: `/society/${input.societyId}/dashboard`,
      },
    });

    return assignment as ManagementCompanyStaffAssignment;
  }

  /**
   * Updates a staff assignment.
   */
  static async updateStaffAssignment(
    companyId: string,
    assignmentId: string,
    input: { assignmentType?: CompanyStaffAssignmentType; status?: CompanyStaffAssignmentStatus; endDate?: string | null },
    actorUserId: string
  ): Promise<ManagementCompanyStaffAssignment> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);
    const actorMember = await getActorCompanyMember(adminClient, companyId, actorUserId);

    if (!isSuper && (!actorMember || !["COMPANY_ADMIN", "COMPANY_MANAGER"].includes(actorMember.role))) {
      throw new Error("FORBIDDEN: Requires COMPANY_ADMIN or COMPANY_MANAGER role to update staff assignments");
    }

    const { data: existing } = await adminClient
      .from("management_company_staff_assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("management_company_id", companyId)
      .single();

    if (!existing) {
      throw new Error("Staff assignment not found");
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.assignmentType) updates.assignment_type = input.assignmentType;
    if (input.status) updates.status = input.status;
    if (input.endDate !== undefined) updates.end_date = input.endDate;

    const { data: updated, error } = await adminClient
      .from("management_company_staff_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select(`
        *,
        profile:profiles(id, email, full_name, phone),
        society:societies(id, name, code)
      `)
      .single();

    if (error) throw new Error(error.message);

    await recordAuditLog({
      actorUserId,
      societyId: existing.society_id,
      action: input.status === "TERMINATED" || input.status === "INACTIVE" ? "COMPANY_STAFF_UNASSIGNED" : "COMPANY_STAFF_ASSIGNED",
      resourceType: "management_company_staff_assignments",
      resourceId: assignmentId,
      metadata: { updates, user_id: existing.user_id, society_id: existing.society_id, company_id: companyId },
    });

    return updated as ManagementCompanyStaffAssignment;
  }

  /**
   * Returns list of societies the user is authorized to access under this company.
   */
  static async getUserAccessibleSocieties(
    companyId: string,
    actorUserId: string
  ): Promise<ManagementCompanySociety[]> {
    const adminClient = createAdminClient();
    const isSuper = await isPlatformSuperAdmin(adminClient, actorUserId);

    if (isSuper) {
      // Platform super admin can see all active societies assigned to this company
      const { data } = await adminClient
        .from("management_company_societies")
        .select(`
          *,
          society:societies(id, name, code, status, city, state)
        `)
        .eq("management_company_id", companyId)
        .eq("status", "ACTIVE");
      return (data || []) as ManagementCompanySociety[];
    }

    const member = await getActorCompanyMember(adminClient, companyId, actorUserId);
    if (!member) {
      return [];
    }

    // COMPANY_ADMIN has oversight of all societies assigned to the company
    if (member.role === "COMPANY_ADMIN") {
      const { data } = await adminClient
        .from("management_company_societies")
        .select(`
          *,
          society:societies(id, name, code, status, city, state)
        `)
        .eq("management_company_id", companyId)
        .eq("status", "ACTIVE");
      return (data || []) as ManagementCompanySociety[];
    }

    // For other roles, must have explicit ACTIVE access assignment
    const { data: accessGrants } = await adminClient
      .from("management_company_society_access")
      .select(`
        management_company_society_id,
        company_society:management_company_societies!inner (
          *,
          society:societies(id, name, code, status, city, state)
        )
      `)
      .eq("management_company_id", companyId)
      .eq("management_company_member_id", member.id)
      .eq("status", "ACTIVE")
      .eq("company_society.status", "ACTIVE");

    return (accessGrants || []).map((g: any) => g.company_society) as ManagementCompanySociety[];
  }

  /**
   * Computes aggregated operational metrics strictly scoped to authorized societies.
   */
  static async getDashboardMetrics(
    companyId: string,
    actorUserId: string
  ): Promise<CompanyDashboardMetrics> {
    const adminClient = createAdminClient();
    const accessibleSocieties = await this.getUserAccessibleSocieties(companyId, actorUserId);
    const accessibleSocietyIds = accessibleSocieties.map((s) => s.society_id);

    // Total managed societies for company
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
        openComplaintsCount: 0,
        upcomingEventsCount: 0,
        pendingAccessRequestsCount: 0,
        upcomingMeetingsCount: 0,
      };
    }

    // Aggregate strictly across accessible societies
    const [
      { count: buildingsCount },
      { count: unitsCount },
      { count: membersCount },
      { count: complaintsCount },
      { count: eventsCount },
      { count: accessRequestsCount },
      { count: meetingsCount },
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
        .gte("start_date", new Date().toISOString()),
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
    ]);

    return {
      managedSocietiesCount: managedSocietiesCount || 0,
      activeSocietiesCount: activeSocietiesCount || 0,
      accessibleSocietiesCount: accessibleSocietyIds.length,
      totalBuildingsCount: buildingsCount || 0,
      totalUnitsCount: unitsCount || 0,
      totalActiveMembersCount: membersCount || 0,
      openComplaintsCount: complaintsCount || 0,
      upcomingEventsCount: eventsCount || 0,
      pendingAccessRequestsCount: accessRequestsCount || 0,
      upcomingMeetingsCount: meetingsCount || 0,
    };
  }
}
