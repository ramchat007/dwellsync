import { z } from "zod";

export const CompanyRoleEnum = z.enum(["COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"]);
export const CompanyStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);
export const CompanyMemberStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]);
export const CompanySocietyStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);
export const CompanySocietyAccessStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]);
export const CompanyStaffAssignmentTypeEnum = z.enum([
  "PROPERTY_MANAGER",
  "FACILITY_STAFF",
  "ACCOUNTANT",
  "OPERATIONS",
  "SUPERVISOR",
  "OTHER",
]);
export const CompanyStaffAssignmentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]);

export const CreateCompanySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(120),
  legal_name: z.string().max(200).optional().nullable(),
  code: z
    .string()
    .min(2, "Company code must be at least 2 characters")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only letters, numbers, hyphens, and underscores")
    .transform((val) => val.toUpperCase()),
  contact_email: z.string().email("Invalid contact email").optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  address: z.record(z.unknown()).optional().default({}),
  logo_url: z.string().url().optional().nullable(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  legal_name: z.string().max(200).optional().nullable(),
  status: CompanyStatusEnum.optional(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  address: z.record(z.unknown()).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});

export const AddCompanyMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: CompanyRoleEnum.default("COMPANY_OPERATIONS"),
  status: CompanyMemberStatusEnum.default("ACTIVE"),
}).refine((data) => data.user_id || data.email, {
  message: "Either user_id or email must be provided",
});

export const UpdateCompanyMemberSchema = z.object({
  role: CompanyRoleEnum.optional(),
  status: CompanyMemberStatusEnum.optional(),
});

export const AssignSocietySchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
});

export const UpdateSocietyAssignmentSchema = z.object({
  status: CompanySocietyStatusEnum,
});

export const GrantSocietyAccessSchema = z.object({
  management_company_member_id: z.string().uuid("Invalid member ID"),
  management_company_society_id: z.string().uuid("Invalid society assignment ID"),
  status: CompanySocietyAccessStatusEnum.default("ACTIVE"),
});

export const UpdateSocietyAccessSchema = z.object({
  status: CompanySocietyAccessStatusEnum,
});

export const AssignStaffSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  society_id: z.string().uuid("Invalid society ID"),
  assignment_type: CompanyStaffAssignmentTypeEnum.default("OPERATIONS"),
  status: CompanyStaffAssignmentStatusEnum.default("ACTIVE"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").optional().nullable(),
});

export const UpdateStaffAssignmentSchema = z.object({
  assignment_type: CompanyStaffAssignmentTypeEnum.optional(),
  status: CompanyStaffAssignmentStatusEnum.optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").optional().nullable(),
});

// Phase 16: Operations & Tasks Validations
export const CompanyTaskCategoryEnum = z.enum([
  "FACILITY",
  "MAINTENANCE",
  "HOUSEKEEPING",
  "SECURITY",
  "ELECTRICAL",
  "PLUMBING",
  "LIFT",
  "FIRE_SAFETY",
  "COMMON_AREA",
  "VENDOR",
  "INSPECTION",
  "RESIDENT_FOLLOWUP",
  "GENERAL",
]);

export const CompanyTaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const CompanyTaskStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]);

export const CreateCompanyTaskSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters"),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
  category: CompanyTaskCategoryEnum.default("GENERAL"),
  priority: CompanyTaskPriorityEnum.default("MEDIUM"),
  status: CompanyTaskStatusEnum.default("OPEN"),
  assigned_to: z.string().uuid("Invalid assignee ID").optional().nullable(),
  due_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/)).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const UpdateCompanyTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: CompanyTaskCategoryEnum.optional(),
  priority: CompanyTaskPriorityEnum.optional(),
  status: CompanyTaskStatusEnum.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/)).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const CompanyTaskQuerySchema = z.object({
  society_id: z.string().uuid().optional(),
  status: CompanyTaskStatusEnum.optional(),
  priority: CompanyTaskPriorityEnum.optional(),
  category: CompanyTaskCategoryEnum.optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  overdue_only: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CreateCompanyTaskCommentSchema = z.object({
  comment: z.string().min(1, "Comment cannot be empty").max(1000, "Comment cannot exceed 1000 characters"),
});


