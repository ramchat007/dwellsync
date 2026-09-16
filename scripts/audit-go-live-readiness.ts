import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TableCheck {
  table: string;
  category: string;
  migration: string;
}

const tablesToCheck: TableCheck[] = [
  // Core & Auth
  { table: "profiles", category: "Core Auth", migration: "01_initial_schema" },
  { table: "societies", category: "Core Hierarchy", migration: "01_initial_schema / 03_phase0" },
  { table: "roles", category: "RBAC", migration: "01_initial_schema" },
  { table: "permissions", category: "RBAC", migration: "01_initial_schema" },
  { table: "role_permissions", category: "RBAC", migration: "01_initial_schema" },
  { table: "society_memberships", category: "Membership", migration: "01_initial_schema" },
  { table: "platform_admins", category: "Platform Admin", migration: "01_initial_schema" },
  { table: "impersonation_sessions", category: "Impersonation", migration: "01_initial_schema" },
  { table: "audit_logs", category: "Audit & Compliance", migration: "01_initial_schema" },

  // Physical Hierarchy
  { table: "buildings", category: "Physical Hierarchy", migration: "03_phase0_core_models" },
  { table: "wings", category: "Physical Hierarchy", migration: "03_phase0_core_models" },
  { table: "floors", category: "Physical Hierarchy", migration: "03_phase0_core_models" },
  { table: "units", category: "Physical Hierarchy", migration: "03_phase0_core_models" },

  // Ownership & Occupancy
  { table: "unit_owners", category: "Ownership", migration: "05_phase1_ownership" },
  { table: "unit_occupancies", category: "Occupancy", migration: "05_phase1_ownership" },
  { table: "family_members", category: "Household", migration: "05_phase1_ownership" },
  { table: "invitations", category: "Invitations", migration: "05_phase1_ownership" },

  // Society Access Requests
  { table: "society_access_requests", category: "Access Requests", migration: "07_society_access_requests" },

  // Security Gate & Visitors
  { table: "visitors", category: "Security Gate", migration: "07_phase7_security_gate" },
  { table: "visitor_logs", category: "Security Gate", migration: "07_phase7_security_gate" },

  // Society Operations
  { table: "amenities", category: "Society Operations", migration: "08_phase8_operations" },
  { table: "amenity_bookings", category: "Society Operations", migration: "08_phase8_operations" },
  { table: "announcements", category: "Society Operations", migration: "08_phase8_operations" },
  { table: "staff_members", category: "Society Operations", migration: "08_phase8_operations" },

  // Maintenance & Billing
  { table: "maintenance_bills", category: "Billing", migration: "09_phase9_maintenance_billing" },
  { table: "payments", category: "Billing", migration: "09_phase9_maintenance_billing" },

  // Communications & Notifications
  { table: "notifications", category: "Communications", migration: "10_phase10_notifications" },
  { table: "notification_preferences", category: "Communications", migration: "10_phase10_notifications" },
  { table: "user_localization_preferences", category: "Localization", migration: "20_language_localization" },

  // Governance
  { table: "committees", category: "Governance", migration: "11_phase11_governance" },
  { table: "committee_members", category: "Governance", migration: "11_phase11_governance" },
  { table: "resolutions", category: "Governance", migration: "11_phase11_governance" },
  { table: "resolution_votes", category: "Governance", migration: "11_phase11_governance" },
  { table: "meetings", category: "Governance", migration: "13_phase11_3_meetings" },
  { table: "meeting_attendees", category: "Governance", migration: "13_phase11_3_meetings" },
  { table: "meeting_action_items", category: "Governance", migration: "13_phase11_3_meetings" },

  // Complaints & SLA
  { table: "complaints", category: "Complaints", migration: "19_complaints_sla" },
  { table: "complaint_timeline", category: "Complaints", migration: "19_complaints_sla" },

  // Documents
  { table: "document_folders", category: "Documents", migration: "16_document_management" },
  { table: "document_versions", category: "Documents", migration: "16_document_management" },
  { table: "document_entity_links", category: "Documents", migration: "16_document_management" },

  // Assets & Inventory
  { table: "assets", category: "Assets", migration: "17_assets_inventory" },
  { table: "asset_maintenance_records", category: "Assets", migration: "17_assets_inventory" },
  { table: "inventory_items", category: "Inventory", migration: "17_assets_inventory" },
  { table: "inventory_stock_movements", category: "Inventory", migration: "17_assets_inventory" },

  // Events, Polls, Reminders
  { table: "events", category: "Events & Polls", migration: "18_events_polls" },
  { table: "event_rsvps", category: "Events & Polls", migration: "18_events_polls" },
  { table: "polls", category: "Events & Polls", migration: "18_events_polls" },
  { table: "poll_options", category: "Events & Polls", migration: "18_events_polls" },
  { table: "poll_votes", category: "Events & Polls", migration: "18_events_polls" },

  // Pricing & Subscriptions
  { table: "subscription_plans", category: "Subscriptions", migration: "21_pricing_subscriptions" },
  { table: "society_subscriptions", category: "Subscriptions", migration: "21_pricing_subscriptions" },

  // Property Management (PMC / Multi-Society)
  { table: "management_companies", category: "Property Management", migration: "25_property_management" },
  { table: "management_company_members", category: "Property Management", migration: "25_property_management" },
  { table: "management_company_societies", category: "Property Management", migration: "25_property_management" },
  { table: "management_company_society_access", category: "Property Management", migration: "25_property_management" },
  { table: "management_company_staff_assignments", category: "Property Management", migration: "25_property_management" },
];

async function runAudit() {
  console.log("===============================================================================");
  console.log("DWELLSYNC FULL SCHEMA & GO-LIVE READINESS AUDIT");
  console.log("Remote URL:", supabaseUrl);
  console.log("===============================================================================\n");

  const results: { table: string; category: string; exists: boolean; rowCount?: number; error?: string }[] = [];

  for (const item of tablesToCheck) {
    const { count, error } = await client
      .from(item.table)
      .select("*", { count: "exact", head: true });

    if (!error) {
      results.push({ table: item.table, category: item.category, exists: true, rowCount: count || 0 });
      console.log(`[EXISTS]   ${item.table.padEnd(38)} (${item.category.padEnd(20)}) -> Rows: ${count}`);
    } else {
      results.push({ table: item.table, category: item.category, exists: false, error: error.message });
      console.log(`[MISSING]  ${item.table.padEnd(38)} (${item.category.padEnd(20)}) -> ${error.message}`);
    }
  }

  const existingCount = results.filter((r) => r.exists).length;
  const missingCount = results.filter((r) => !r.exists).length;

  console.log("\n===============================================================================");
  console.log(`AUDIT SUMMARY: ${existingCount} / ${tablesToCheck.length} tables deployed in Remote Supabase`);
  console.log(`Deployed: ${existingCount} | Missing: ${missingCount}`);
  console.log("===============================================================================");
}

runAudit().catch(console.error);

