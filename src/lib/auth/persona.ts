import { RoleId, Society, SocietyMembership, Profile } from "../types/database";
import { UserIdentity } from "../types/auth";
import { PERMISSIONS, roleHasPermission } from "./permissions";
import {
  LayoutDashboard,
  Building2,
  Users,
  DoorOpen,
  Receipt,
  FileText,
  ShieldAlert,
  Settings,
  Wrench,
  Truck,
  Shield,
  Activity,
  UserCheck,
  Calendar,
  CheckSquare,
  BarChart3,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: string;
}

export interface PersonaDefinition {
  role: RoleId;
  title: string;
  description: string;
  category: "Platform" | "Governance" | "Residents" | "Operations" | "External";
  defaultDashboard: string;
}

export const PERSONA_DEFINITIONS: Record<RoleId, PersonaDefinition> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Platform Super Admin",
    description: "Full multi-tenant platform oversight, society provisioning, and forensic audits.",
    category: "Platform",
    defaultDashboard: "/superadmin/view-as",
  },
  SOCIETY_ADMIN: {
    role: "SOCIETY_ADMIN",
    title: "Society Administrator",
    description: "Complete administration of physical layout, residents, staff, and society settings.",
    category: "Governance",
    defaultDashboard: "/society/dashboard",
  },
  SECRETARY: {
    role: "SECRETARY",
    title: "Hon. Secretary",
    description: "Society meetings, resolutions, notices, member approvals, and compliance.",
    category: "Governance",
    defaultDashboard: "/committee/dashboard",
  },
  TREASURER: {
    role: "TREASURER",
    title: "Hon. Treasurer",
    description: "Financial oversight, maintenance collections, vendor payouts, and audit books.",
    category: "Governance",
    defaultDashboard: "/finance/dashboard",
  },
  COMMITTEE_MEMBER: {
    role: "COMMITTEE_MEMBER",
    title: "Managing Committee Member",
    description: "Review society tasks, complaints, voting decisions, and vendor works.",
    category: "Governance",
    defaultDashboard: "/committee/dashboard",
  },
  MANAGER: {
    role: "MANAGER",
    title: "Facility / Estate Manager",
    description: "Daily operational tasks, maintenance team oversight, and vendor work orders.",
    category: "Operations",
    defaultDashboard: "/staff/dashboard",
  },
  RESIDENT: {
    role: "RESIDENT",
    title: "Resident",
    description: "Personal flat view, digital gate passes, notices, maintenance dues, and helpdesk.",
    category: "Residents",
    defaultDashboard: "/resident/dashboard",
  },
  OWNER: {
    role: "OWNER",
    title: "Property Owner",
    description: "Unit equity management, tenant leases, property tax records, and AGM voting.",
    category: "Residents",
    defaultDashboard: "/resident/dashboard",
  },
  TENANT: {
    role: "TENANT",
    title: "Tenant (Resident)",
    description: "Active lease view, gate approvals, visitor access, and flat complaints.",
    category: "Residents",
    defaultDashboard: "/resident/dashboard",
  },
  SECURITY: {
    role: "SECURITY",
    title: "Security / Gate Guard",
    description: "Visitor logging, delivery passes, vehicle entry, and emergency gate alerts.",
    category: "Operations",
    defaultDashboard: "/security/dashboard",
  },
  STAFF: {
    role: "STAFF",
    title: "Maintenance & Support Staff",
    description: "Assigned maintenance tickets, work order checklists, and daily duties.",
    category: "Operations",
    defaultDashboard: "/staff/dashboard",
  },
  VENDOR: {
    role: "VENDOR",
    title: "Contractor / Service Vendor",
    description: "Vendor work orders, service milestone logs, and invoice submissions.",
    category: "External",
    defaultDashboard: "/vendor/dashboard",
  },
  AUDITOR: {
    role: "AUDITOR",
    title: "Statutory Auditor",
    description: "Financial vouchers, ledger inspection, and annual compliance audit trail.",
    category: "Operations",
    defaultDashboard: "/staff/dashboard",
  },
};

export function getDashboardPathForRole(role: RoleId | null, societyId?: string | null): string {
  if (!role) return "/login";

  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/view-as";
    case "SOCIETY_ADMIN":
      return societyId ? `/society/${societyId}/dashboard` : "/society/dashboard";
    case "SECRETARY":
    case "COMMITTEE_MEMBER":
      return "/committee/dashboard";
    case "TREASURER":
      return "/finance/dashboard";
    case "RESIDENT":
    case "OWNER":
    case "TENANT":
      return "/resident/dashboard";
    case "SECURITY":
      return "/security/dashboard";
    case "MANAGER":
    case "STAFF":
    case "AUDITOR":
      return "/staff/dashboard";
    case "VENDOR":
      return "/vendor/dashboard";
    default:
      return "/resident/dashboard";
  }
}

export function getNavigationForRole(
  role: RoleId | null,
  societyId?: string | null
): NavItem[] {
  if (!role) return [];

  const sid = societyId || "default";

  // 1. Super Admin Navigation (ONLY when operating in Super Admin context)
  if (role === "SUPER_ADMIN") {
    return [
      { label: "View-As Console", href: "/superadmin/view-as", iconName: "UserCheck" },
      { label: "Platform Overview", href: "/superadmin", iconName: "LayoutDashboard" },
      { label: "Platform Analytics", href: "/superadmin/analytics", iconName: "BarChart3" },
      { label: "Societies Registry", href: "/superadmin/societies", iconName: "Building2" },
      { label: "Plans & Subscriptions", href: "/superadmin/subscriptions", iconName: "CreditCard" },
      { label: "Platform Users", href: "/superadmin/users", iconName: "Users" },
      { label: "Audit Ledger", href: "/superadmin/audit", iconName: "Activity" },
    ];
  }

  // 2. Society Admin Navigation
  if (role === "SOCIETY_ADMIN") {
    return [
      { label: "Dashboard", href: `/society/${sid}/dashboard`, iconName: "LayoutDashboard" },
      { label: "Analytics & Reports", href: `/society/${sid}/analytics`, iconName: "BarChart3" },
      { label: "Committees", href: `/society/${sid}/committees`, iconName: "Shield" },
      { label: "Meetings & Proceedings", href: `/society/${sid}/meetings`, iconName: "Calendar" },
      { label: "Resolutions", href: `/society/${sid}/resolutions`, iconName: "FileCheck2" },
      { label: "Buildings & Wings", href: `/society/${sid}/buildings`, iconName: "Building2" },
      { label: "Units & Flats", href: `/society/${sid}/units`, iconName: "DoorOpen" },
      { label: "People Directory", href: `/society/${sid}/people`, iconName: "Users" },
      { label: "Complaints & Helpdesk", href: `/society/${sid}/complaints`, iconName: "MessageSquare" },
      { label: "Billing & Invoices", href: `/society/${sid}/billing`, iconName: "Receipt" },
      { label: "Treasury & Finance", href: `/society/${sid}/finance`, iconName: "Banknote" },
      { label: "Amenities", href: `/society/${sid}/amenities`, iconName: "Sparkles" },
      { label: "Events & Gatherings", href: `/society/${sid}/events`, iconName: "Calendar" },
      { label: "Polls & Surveys", href: `/society/${sid}/polls`, iconName: "CheckSquare" },
      { label: "Notices", href: `/society/${sid}/notices`, iconName: "Bell" },
      { label: "Documents", href: `/society/${sid}/documents`, iconName: "FileText" },
      { label: "Handover", href: `/society/${sid}/handover`, iconName: "ClipboardList" },
      { label: "Assets & Inventory", href: `/society/${sid}/assets`, iconName: "Boxes" },
      { label: "Data Migration", href: `/society/${sid}/import`, iconName: "FileSpreadsheet" },
      { label: "Subscription & Limits", href: `/society/${sid}/subscription`, iconName: "CreditCard" },
      { label: "Society Settings", href: `/society/${sid}/settings`, iconName: "Settings" },
    ];
  }

  // 3. Managing Committee / Secretary
  if (role === "COMMITTEE_MEMBER" || role === "SECRETARY") {
    return [
      { label: "Committee Hub", href: "/committee/dashboard", iconName: "LayoutDashboard" },
      { label: "Analytics & Reports", href: `/society/${sid}/analytics`, iconName: "BarChart3" },
      { label: "Committees", href: `/society/${sid}/committees`, iconName: "Shield" },
      { label: "Meetings & Proceedings", href: `/society/${sid}/meetings`, iconName: "Calendar" },
      { label: "Resolutions", href: `/society/${sid}/resolutions`, iconName: "FileCheck2" },
      { label: "Treasury & Finance", href: `/society/${sid}/finance`, iconName: "Banknote" },
      { label: "Buildings & Layout", href: `/society/${sid}/buildings`, iconName: "Building2" },
      { label: "Units Directory", href: `/society/${sid}/units`, iconName: "DoorOpen" },
      { label: "Members Roster", href: `/society/${sid}/people`, iconName: "Users" },
      { label: "Complaints", href: `/society/${sid}/complaints`, iconName: "MessageSquare" },
      { label: "Events", href: `/society/${sid}/events`, iconName: "Calendar" },
      { label: "Polls & Surveys", href: `/society/${sid}/polls`, iconName: "CheckSquare" },
      { label: "Notices", href: `/society/${sid}/notices`, iconName: "Bell" },
      { label: "Documents", href: `/society/${sid}/documents`, iconName: "FileText" },
      { label: "Handover", href: `/society/${sid}/handover`, iconName: "ClipboardList" },
      { label: "Assets & Inventory", href: `/society/${sid}/assets`, iconName: "Boxes" },
      { label: "Data Migration", href: `/society/${sid}/import`, iconName: "FileSpreadsheet" },
      { label: "Society Profile", href: `/society/${sid}/society`, iconName: "Settings" },
    ];
  }

  // 4. Treasurer / Finance
  if (role === "TREASURER") {
    return [
      { label: "Finance Hub", href: "/finance/dashboard", iconName: "LayoutDashboard" },
      { label: "Treasury & Accounts", href: `/society/${sid}/finance`, iconName: "Banknote" },
      { label: "Analytics & Reports", href: `/society/${sid}/analytics`, iconName: "BarChart3" },
      { label: "Billing & Invoices", href: `/society/${sid}/billing`, iconName: "Receipt" },
      { label: "Units & Dues", href: `/society/${sid}/units`, iconName: "DoorOpen" },
      { label: "Member Directory", href: `/society/${sid}/people`, iconName: "Users" },
      { label: "Documents", href: `/society/${sid}/documents`, iconName: "FileText" },
      { label: "Assets & Inventory", href: `/society/${sid}/assets`, iconName: "Boxes" },
      { label: "Data Migration", href: `/society/${sid}/import`, iconName: "FileSpreadsheet" },
      { label: "Society Profile", href: `/society/${sid}/society`, iconName: "Settings" },
    ];
  }

  // 5. Resident / Owner / Tenant Navigation (Completely clean, zero admin tools)
  if (role === "RESIDENT" || role === "OWNER" || role === "TENANT") {
    return [
      { label: "My Home", href: "/resident/dashboard", iconName: "LayoutDashboard" },
      { label: "General Meetings", href: "/resident/meetings", iconName: "Calendar" },
      { label: "Committee Roster", href: "/resident/committee", iconName: "ShieldCheck" },
      { label: "Dues & Invoices", href: "/resident/dues", iconName: "Receipt" },
      { label: "Gate Passes", href: "/resident/visitors", iconName: "ShieldAlert" },
      { label: "Complaints", href: "/resident/complaints", iconName: "MessageSquare" },
      { label: "Amenities", href: "/resident/amenities", iconName: "Sparkles" },
      { label: "Events", href: "/resident/events", iconName: "Calendar" },
      { label: "Polls & Surveys", href: "/resident/polls", iconName: "CheckSquare" },
      { label: "Notices", href: "/resident/notices", iconName: "Bell" },
      { label: "Documents", href: "/resident/documents", iconName: "FileText" },
      { label: "Community", href: "/resident/community", iconName: "Users" },
    ];
  }

  // 6. Security Gate Guard
  if (role === "SECURITY") {
    return [
      { label: "Gate Checkpoint", href: "/security/dashboard", iconName: "ShieldAlert" },
      { label: "Residents Roster", href: `/society/${sid}/people`, iconName: "Users" },
    ];
  }

  // 7. Staff / Facility Manager / Auditor
  if (role === "MANAGER" || role === "STAFF" || role === "AUDITOR") {
    const items: NavItem[] = [
      { label: "Operations Hub", href: "/staff/dashboard", iconName: "Wrench" },
    ];
    if (role === "MANAGER") {
      items.push({ label: "Analytics & Reports", href: `/society/${sid}/analytics`, iconName: "BarChart3" });
    }
    if (role === "AUDITOR") {
      items.push({ label: "Treasury & Audit Books", href: `/society/${sid}/finance`, iconName: "Banknote" });
    }
    items.push(
      { label: "Assets & Inventory", href: `/society/${sid}/assets`, iconName: "Boxes" },
      { label: "Complaints", href: `/society/${sid}/complaints`, iconName: "MessageSquare" },
      { label: "Amenities", href: `/society/${sid}/amenities`, iconName: "Sparkles" },
      { label: "Buildings & Units", href: `/society/${sid}/units`, iconName: "DoorOpen" },
      { label: "People Directory", href: `/society/${sid}/people`, iconName: "Users" },
    );
    return items;
  }

  // 8. Vendor Service Provider
  if (role === "VENDOR") {
    return [
      { label: "Vendor Portal", href: "/vendor/dashboard", iconName: "Truck" },
      { label: "Society Contacts", href: `/society/${sid}/society`, iconName: "Building2" },
    ];
  }

  return [
    { label: "Dashboard", href: "/resident/dashboard", iconName: "LayoutDashboard" },
  ];
}

export function resolveUserExperience(identity: UserIdentity | null) {
  if (!identity || !identity.isAuthenticated) {
    return {
      isAuthenticated: false,
      isSuperAdmin: false,
      isImpersonating: false,
      role: null,
      society: null,
      dashboardPath: "/login",
      navigation: [],
    };
  }

  const role = identity.currentRole;
  const societyId = identity.currentSociety?.id;
  const dashboardPath = getDashboardPathForRole(role, societyId);
  const navigation = getNavigationForRole(role, societyId);

  return {
    isAuthenticated: true,
    isSuperAdmin: identity.isSuperAdmin,
    isImpersonating: identity.isImpersonating,
    role,
    society: identity.currentSociety,
    availableSocieties: identity.availableSocieties,
    permissions: identity.permissions,
    dashboardPath,
    navigation,
  };
}

