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

