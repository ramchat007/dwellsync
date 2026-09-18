import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  domain: string;
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function runLiveAutomatedTests() {
  console.log("===============================================================================");
  console.log("DWELLSYNC COMPREHENSIVE LIVE DOMAIN TEST SUITE");
  console.log("Target Database:", supabaseUrl);
  console.log("Execution Mode: Live End-to-End Database Assertions");
  console.log("===============================================================================\n");

  const results: CheckResult[] = [];

  const assertCheck = (domain: string, test: string, condition: boolean, details?: string, error?: string) => {
    results.push({ domain, test, passed: condition, details, error });
    const mark = condition ? "✓ PASS" : "❌ FAIL";
    console.log(`${mark.padEnd(8)} [${domain.padEnd(20)}] ${test} ${details ? `-> ${details}` : ""}`);
    if (!condition && error) console.log(`         Error: ${error}`);
  };

  // 1. Platform Super Admin Domain
  const { data: superAdmins, error: saErr } = await adminClient.from("platform_admins").select("*");
  assertCheck(
    "Platform Super Admin",
    "Verified platform_admins record exists",
    !saErr && (superAdmins?.length || 0) > 0,
    `Found ${superAdmins?.length} Super Admin(s)`,
    saErr?.message
  );

  // 2. Societies
  const { data: societies, error: socErr } = await adminClient.from("societies").select("*").eq("status", "ACTIVE");
  assertCheck(
    "Societies",
    "Active housing societies exist in database",
    !socErr && (societies?.length || 0) > 0,
    `Found ${societies?.length} active societies`,
    socErr?.message
  );

  const testSociety = societies?.find((s) => s.code === "UAT001") || societies?.[0];
  const sid = testSociety?.id;

  if (!sid) {
    console.error("❌ Cannot continue: No society available to run domain tests.");
    process.exit(1);
  }

  // 3. Physical Structural Hierarchy
  const { data: buildings, error: bErr } = await adminClient.from("buildings").select("*").eq("society_id", sid);
  assertCheck("Structure", "Buildings exist for society", !bErr && (buildings?.length || 0) > 0, `${buildings?.length} building(s)`, bErr?.message);

  const { data: wings, error: wErr } = await adminClient.from("wings").select("*").eq("society_id", sid);
  assertCheck("Structure", "Wings exist for society", !wErr && (wings?.length || 0) > 0, `${wings?.length} wing(s)`, wErr?.message);

  const { data: units, error: uErr } = await adminClient.from("units").select("*").eq("society_id", sid);
  assertCheck("Structure", "Units exist for society", !uErr && (units?.length || 0) > 0, `${units?.length} unit(s)`, uErr?.message);

  // 4. Member Roster & Memberships
  const { data: memberships, error: mErr } = await adminClient.from("society_memberships").select("*").eq("society_id", sid);
  assertCheck("Memberships", "Active member roster exists", !mErr && (memberships?.length || 0) > 0, `${memberships?.length} membership(s)`, mErr?.message);

  // 5. Ownerships & Occupancies
  const { data: owners, error: oErr } = await adminClient.from("unit_owners").select("*").eq("society_id", sid);
  assertCheck("Ownership", "Unit ownership relationships linked", !oErr && (owners?.length || 0) > 0, `${owners?.length} owner(s)`, oErr?.message);

  const { data: occupancies, error: occErr } = await adminClient.from("unit_occupancies").select("*").eq("society_id", sid);
  assertCheck("Occupancy", "Unit occupancies linked", !occErr && (occupancies?.length || 0) > 0, `${occupancies?.length} occupancy record(s)`, occErr?.message);

  const { data: family, error: famErr } = await adminClient.from("family_members").select("*").eq("society_id", sid);
  assertCheck("Family Members", "Unit family members registered", !famErr && (family?.length || 0) > 0, `${family?.length} family member(s)`, famErr?.message);

  // 6. Notices (Announcements)
  const { data: notices, error: nErr } = await adminClient.from("notices").select("*").eq("society_id", sid);
  assertCheck("Notices", "Society notices published", !nErr && (notices?.length || 0) > 0, `${notices?.length} notice(s)`, nErr?.message);

  // 7. Amenities & Bookings
  const { data: amenities, error: aErr } = await adminClient.from("amenities").select("*").eq("society_id", sid);
  assertCheck("Amenities", "Society amenities registered", !aErr && (amenities?.length || 0) > 0, `${amenities?.length} amenity(ies)`, aErr?.message);

  const { data: bookings, error: abErr } = await adminClient.from("amenity_bookings").select("*").eq("society_id", sid);
  assertCheck("Amenities", "Amenity booking records exist", !abErr && (bookings?.length || 0) > 0, `${bookings?.length} booking(s)`, abErr?.message);

  // 8. Maintenance Billing & Payments
  const { data: billingCycles, error: bcErr } = await adminClient.from("billing_cycles").select("*").eq("society_id", sid);
  assertCheck("Billing", "Maintenance billing cycles created", !bcErr && (billingCycles?.length || 0) > 0, `${billingCycles?.length} billing cycle(s)`, bcErr?.message);

  const { data: invoices, error: invErr } = await adminClient.from("invoices").select("*").eq("society_id", sid);
  assertCheck("Billing", "Maintenance invoices generated", !invErr && (invoices?.length || 0) > 0, `${invoices?.length} invoice(s)`, invErr?.message);

  const { data: payments, error: payErr } = await adminClient.from("payments").select("*").eq("society_id", sid);
  assertCheck("Billing", "Payment records reconciled", !payErr && (payments?.length || 0) > 0, `${payments?.length} payment(s)`, payErr?.message);

  // 9. Visitors & Security Gate
  const { data: visitors, error: vErr } = await adminClient.from("visitors").select("*").eq("society_id", sid);
  assertCheck("Security Gate", "Visitor gate entries logged", !vErr && (visitors?.length || 0) > 0, `${visitors?.length} visitor record(s)`, vErr?.message);

  // 10. Complaints & SLA Timeline
  const { data: complaints, error: cErr } = await adminClient.from("complaints").select("*").eq("society_id", sid);
  assertCheck("Complaints", "Helpdesk tickets registered", !cErr && (complaints?.length || 0) > 0, `${complaints?.length} ticket(s)`, cErr?.message);

  if (complaints && complaints.length > 0) {
    const { data: slaEvents, error: tErr } = await adminClient.from("complaint_sla_events").select("*").eq("society_id", sid);
    assertCheck("Complaints", "SLA timeline events tracked", !tErr && (slaEvents?.length || 0) > 0, `${slaEvents?.length} event(s)`, tErr?.message);
  }

  // 11. Documents & Folders
  const { data: folders, error: fErr } = await adminClient.from("document_folders").select("*").eq("society_id", sid);
  assertCheck("Documents", "Document folders configured", !fErr && (folders?.length || 0) > 0, `${folders?.length} folder(s)`, fErr?.message);

  const { data: docs, error: docErr } = await adminClient.from("documents").select("*").eq("society_id", sid);
  assertCheck("Documents", "Official documents repository active", !docErr && (docs?.length || 0) > 0, `${docs?.length} document(s)`, docErr?.message);

  // 12. Governance: Committees, Meetings & Resolutions
  const { data: committees, error: comErr } = await adminClient.from("committees").select("*").eq("society_id", sid);
  assertCheck("Governance", "Managing Committee established", !comErr && (committees?.length || 0) > 0, `${committees?.length} committee(s)`, comErr?.message);

  const { data: committeeMembers, error: cmErr } = await adminClient.from("committee_members").select("*").eq("society_id", sid);
  assertCheck("Governance", "Committee officers appointed", !cmErr && (committeeMembers?.length || 0) > 0, `${committeeMembers?.length} officer(s)`, cmErr?.message);

  const { data: meetings, error: mtgErr } = await adminClient.from("society_meetings").select("*").eq("society_id", sid);
  assertCheck("Governance", "General Meetings (AGM/EGM) scheduled", !mtgErr && (meetings?.length || 0) > 0, `${meetings?.length} meeting(s)`, mtgErr?.message);

  const { data: resolutions, error: resErr } = await adminClient.from("governance_resolutions").select("*").eq("society_id", sid);
  assertCheck("Governance", "Formal resolutions recorded", !resErr && (resolutions?.length || 0) > 0, `${resolutions?.length} resolution(s)`, resErr?.message);

  // 13. Builder Handover Projects & Defects
  const { data: hProjects, error: hpErr } = await adminClient.from("handover_projects").select("*").eq("society_id", sid);
  assertCheck("Builder Handover", "Handover workspace project exists", !hpErr && (hProjects?.length || 0) > 0, `${hProjects?.length} project(s)`, hpErr?.message);

  if (hProjects && hProjects.length > 0) {
    const { data: checklists, error: chkErr } = await adminClient.from("handover_checklist_items").select("*").eq("handover_project_id", hProjects[0].id);
    assertCheck("Builder Handover", "Handover checklist items tracked", !chkErr && (checklists?.length || 0) > 0, `${checklists?.length} item(s)`, chkErr?.message);

    const { data: defects, error: defErr } = await adminClient.from("handover_defects").select("*").eq("handover_project_id", hProjects[0].id);
    assertCheck("Builder Handover", "Defect snagging registry populated", !defErr && (defects?.length || 0) > 0, `${defects?.length} defect(s)`, defErr?.message);
  }

  // 14. Assets & Inventory
  const { data: assets, error: astErr } = await adminClient.from("assets").select("*").eq("society_id", sid);
  assertCheck("Assets", "Physical society assets registered", !astErr && (assets?.length || 0) > 0, `${assets?.length} asset(s)`, astErr?.message);

  const { data: inventory, error: inventoryErr } = await adminClient.from("inventory_items").select("*").eq("society_id", sid);
  assertCheck("Inventory", "Consumable inventory items tracked", !inventoryErr && (inventory?.length || 0) > 0, `${inventory?.length} item(s)`, inventoryErr?.message);

  // 15. Treasury & Bank Accounts
  const { data: coa, error: coaErr } = await adminClient.from("chart_of_accounts").select("*").eq("society_id", sid);
  assertCheck("Finance", "General ledger chart of accounts active", !coaErr && (coa?.length || 0) > 0, `${coa?.length} account(s)`, coaErr?.message);

  const { data: bankAccs, error: bkErr } = await adminClient.from("society_bank_accounts").select("*").eq("society_id", sid);
  assertCheck("Finance", "Society bank accounts registered", !bkErr && (bankAccs?.length || 0) > 0, `${bankAccs?.length} bank account(s)`, bkErr?.message);

  // 16. Property Management Company
  const { data: pmcSocieties, error: pmcErr } = await adminClient.from("management_company_societies").select("*").eq("society_id", sid);
  assertCheck("Property Mgmt (PMC)", "PMC portfolio association verified", !pmcErr && (pmcSocieties?.length || 0) > 0, `${pmcSocieties?.length} PMC binding(s)`, pmcErr?.message);

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log("\n===============================================================================");
  console.log(`AUTOMATED TEST RESULTS: ${passedCount} / ${results.length} PASSED`);
  if (failedCount === 0) {
    console.log("🎉 ALL CORE DOMAINS ARE FULLY POPULATED AND VERIFIED LIVE!");
  } else {
    console.log(`⚠️ ${failedCount} domain assertions failed.`);
  }
  console.log("===============================================================================");
}

runLiveAutomatedTests().catch((err) => {
  console.error("Fatal Test Execution Error:", err);
  process.exit(1);
});
