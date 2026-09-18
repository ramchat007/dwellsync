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

const DEFAULT_PASSWORD = "TestPassword@123";
const UAT_SOCIETY_CODE = "UAT001";
const UAT_SOCIETY_NAME = "[UAT] DwellSync Grand Residency";
const UAT_PMC_CODE = "APEX-PMC-UAT";

async function main() {
  console.log("===============================================================================");
  console.log("DWELLSYNC FULL AUTOMATED UAT DATA SEEDER");
  console.log("Target Environment:", supabaseUrl);
  console.log("Target Society Code:", UAT_SOCIETY_CODE);
  console.log("===============================================================================\n");

  // 1. Clean up any existing UAT test society to guarantee idempotency
  console.log("1. Checking for existing UAT test society and PMC to reset...");
  const { data: existingSoc } = await adminClient
    .from("societies")
    .select("id")
    .eq("code", UAT_SOCIETY_CODE)
    .maybeSingle();

  if (existingSoc) {
    console.log(`   Found previous UAT society (${existingSoc.id}), cleaning up...`);
    await adminClient.from("societies").delete().eq("id", existingSoc.id);
    console.log("   ✓ Cleaned previous UAT society.");
  }

  const { data: existingPmc } = await adminClient
    .from("management_companies")
    .select("id")
    .eq("code", UAT_PMC_CODE)
    .maybeSingle();

  if (existingPmc) {
    console.log(`   Found previous UAT PMC (${existingPmc.id}), cleaning up...`);
    await adminClient.from("management_companies").delete().eq("id", existingPmc.id);
    console.log("   ✓ Cleaned previous UAT PMC.");
  }

  // 2. Create the UAT Society
  console.log("\n2. Creating UAT Test Society...");
  const { data: society, error: socErr } = await adminClient
    .from("societies")
    .insert({
      name: UAT_SOCIETY_NAME,
      code: UAT_SOCIETY_CODE,
      society_type: "COOPERATIVE_HOUSING",
      address_line_1: "77 Heritage Boulevard, Sector 14",
      city: "Mumbai",
      district: "Mumbai Suburban",
      state: "Maharashtra",
      pincode: "400076",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      contact_email: "office@grandresidency-uat.com",
      contact_phone: "+91 98200 99887",
      status: "ACTIVE",
    })
    .select()
    .single();

  if (socErr || !society) {
    console.error("❌ Failed to create UAT society:", socErr?.message);
    process.exit(1);
  }
  console.log(`   ✓ Created Society: ${society.name} (ID: ${society.id})`);

  // 3. Physical Structural Hierarchy (Tower A & Tower B)
  console.log("\n3. Creating Buildings, Wings, Floors & Units...");
  const { data: towerA } = await adminClient
    .from("buildings")
    .insert({
      society_id: society.id,
      name: "Tower A (Sunrise)",
      code: "TWR-A",
      description: "5-Storey Residential Tower",
      number_of_floors: 5,
      status: "ACTIVE",
    })
    .select()
    .single();

  const { data: towerB } = await adminClient
    .from("buildings")
    .insert({
      society_id: society.id,
      name: "Tower B (Sunset)",
      code: "TWR-B",
      description: "5-Storey Residential Tower",
      number_of_floors: 5,
      status: "ACTIVE",
    })
    .select()
    .single();

  const { data: wingA } = await adminClient
    .from("wings")
    .insert({
      society_id: society.id,
      building_id: towerA.id,
      name: "Wing A",
      code: "W-A",
      status: "ACTIVE",
    })
    .select()
    .single();

  const { data: wingB } = await adminClient
    .from("wings")
    .insert({
      society_id: society.id,
      building_id: towerB.id,
      name: "Wing B",
      code: "W-B",
      status: "ACTIVE",
    })
    .select()
    .single();

  const unitMap = new Map<string, string>();
  const unitsToCreate = [
    { building_id: towerA.id, wing_id: wingA.id, unit_number: "A-101", unit_type: "2_BHK", area_sqft: 980, status: "OCCUPIED" },
    { building_id: towerA.id, wing_id: wingA.id, unit_number: "A-102", unit_type: "2_BHK", area_sqft: 980, status: "VACANT" },
    { building_id: towerA.id, wing_id: wingA.id, unit_number: "A-201", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
    { building_id: towerA.id, wing_id: wingA.id, unit_number: "A-301", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
    { building_id: towerA.id, wing_id: wingA.id, unit_number: "A-502", unit_type: "PENTHOUSE", area_sqft: 2150, status: "OCCUPIED" },
    { building_id: towerB.id, wing_id: wingB.id, unit_number: "B-101", unit_type: "1_BHK", area_sqft: 650, status: "VACANT" },
    { building_id: towerB.id, wing_id: wingB.id, unit_number: "B-102", unit_type: "2_BHK", area_sqft: 980, status: "OCCUPIED" },
    { building_id: towerB.id, wing_id: wingB.id, unit_number: "B-201", unit_type: "2_BHK", area_sqft: 980, status: "OCCUPIED" },
    { building_id: towerB.id, wing_id: wingB.id, unit_number: "B-204", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
    { building_id: towerB.id, wing_id: wingB.id, unit_number: "B-501", unit_type: "PENTHOUSE", area_sqft: 2150, status: "OCCUPIED" },
  ];

  for (const u of unitsToCreate) {
    const { data: createdUnit } = await adminClient
      .from("units")
      .insert({ society_id: society.id, ...u })
      .select()
      .single();
    if (createdUnit) unitMap.set(u.unit_number, createdUnit.id);
  }
  console.log(`   ✓ Created 2 Buildings, 2 Wings, and ${unitMap.size} Units.`);

  // 4. Personas & Memberships
  console.log("\n4. Provisioning UAT Personas & Roles...");
  const personas = [
    { email: "admin@uat.internal", fullName: "Vikram Malhotra (UAT Admin)", role: "SOCIETY_ADMIN", unit: "A-101" },
    { email: "secretary@uat.internal", fullName: "Ananya Deshmukh (UAT Secretary)", role: "SECRETARY", unit: "B-204" },
    { email: "treasurer@uat.internal", fullName: "Rajesh Iyer (UAT Treasurer)", role: "TREASURER", unit: "A-502" },
    { email: "committee@uat.internal", fullName: "Sunita Kulkarni (UAT Committee)", role: "COMMITTEE_MEMBER", unit: "A-301" },
    { email: "manager@uat.internal", fullName: "Manoj Sawant (UAT Manager)", role: "MANAGER" },
    { email: "owner@uat.internal", fullName: "Priya Nair (UAT Owner)", role: "OWNER", unit: "A-201" },
    { email: "resident@uat.internal", fullName: "Rahul Sharma (UAT Resident)", role: "RESIDENT", unit: "B-102" },
    { email: "tenant@uat.internal", fullName: "Amit Patel (UAT Tenant)", role: "TENANT", unit: "B-201" },
    { email: "security@uat.internal", fullName: "Ramesh Shinde (UAT Security)", role: "SECURITY" },
    { email: "staff@uat.internal", fullName: "Kishan Lal (UAT Staff)", role: "STAFF" },
    { email: "vendor@uat.internal", fullName: "Apex Elevators (UAT Vendor)", role: "VENDOR" },
    { email: "auditor@uat.internal", fullName: "K.V. Mehta & Co (UAT Auditor)", role: "AUDITOR" },
  ];

  const { data: existingAuth } = await adminClient.auth.admin.listUsers();
  const authUserMap = new Map((existingAuth?.users || []).map((u) => [u.email?.toLowerCase(), u.id]));
  const userMap = new Map<string, string>();

  for (const p of personas) {
    let uid = authUserMap.get(p.email.toLowerCase());
    if (!uid) {
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: p.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: p.fullName, display_name: p.fullName.split(" (")[0] },
      });
      if (createErr || !newUser.user) {
        console.warn(`   ⚠️ Warning on creating auth user ${p.email}:`, createErr?.message);
        continue;
      }
      uid = newUser.user.id;
    }
    userMap.set(p.email, uid);

    // Profile
    await adminClient.from("profiles").upsert(
      { id: uid, email: p.email, full_name: p.fullName, display_name: p.fullName.split(" (")[0], status: "ACTIVE", updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

    // Membership
    await adminClient.from("society_memberships").upsert(
      { society_id: society.id, user_id: uid, role_id: p.role, unit_number: p.unit || null, status: "ACTIVE", updated_at: new Date().toISOString() },
      { onConflict: "society_id,user_id,role_id" }
    );
    console.log(`   ✓ [${p.role.padEnd(16)}] ${p.email}`);
  }

  // Also link primary user (ramchat007@gmail.com) as SOCIETY_ADMIN to this UAT society so they can access it immediately!
  const ramchatUserId = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  await adminClient.from("society_memberships").upsert(
    { society_id: society.id, user_id: ramchatUserId, role_id: "SOCIETY_ADMIN", status: "ACTIVE", updated_at: new Date().toISOString() },
    { onConflict: "society_id,user_id,role_id" }
  );
  console.log(`   ✓ Linked primary developer user (ramchat007@gmail.com) as SOCIETY_ADMIN to UAT society.`);

  const priyaId = userMap.get("owner@uat.internal") || ramchatUserId;
  const rahulId = userMap.get("resident@uat.internal") || ramchatUserId;
  const amitId = userMap.get("tenant@uat.internal") || ramchatUserId;
  const vikramId = userMap.get("admin@uat.internal") || ramchatUserId;
  const secId = userMap.get("secretary@uat.internal") || ramchatUserId;
  const trsId = userMap.get("treasurer@uat.internal") || ramchatUserId;

  const uA101 = unitMap.get("A-101")!;
  const uA201 = unitMap.get("A-201")!;
  const uB102 = unitMap.get("B-102")!;
  const uB201 = unitMap.get("B-201")!;

  // 5. Ownerships & Occupancies
  console.log("\n5. Provisioning Ownership & Occupancies...");
  await adminClient.from("unit_owners").insert([
    { society_id: society.id, unit_id: uA101, user_id: vikramId, is_primary: true, ownership_percentage: 100.0, ownership_type: "PRIMARY", status: "ACTIVE" },
    { society_id: society.id, unit_id: uA201, user_id: priyaId, is_primary: true, ownership_percentage: 100.0, ownership_type: "PRIMARY", status: "ACTIVE" },
  ]);

  await adminClient.from("unit_occupancies").insert([
    { society_id: society.id, unit_id: uA101, user_id: vikramId, occupancy_type: "OWNER_OCCUPIED", move_in_date: "2026-01-01", status: "ACTIVE" },
    { society_id: society.id, unit_id: uB102, user_id: rahulId, occupancy_type: "FAMILY_OCCUPIED", move_in_date: "2026-02-01", status: "ACTIVE" },
    { society_id: society.id, unit_id: uB201, user_id: amitId, occupancy_type: "TENANT_OCCUPIED", move_in_date: "2026-03-01", lease_start_date: "2026-03-01", lease_end_date: "2027-02-28", status: "ACTIVE" },
  ]);

  await adminClient.from("family_members").insert({
    society_id: society.id,
    unit_id: uB102,
    primary_resident_user_id: rahulId,
    full_name: "Chirayu Sharma",
    relationship: "CHILD",
    phone: "+91 98200 11223",
    email: "chirayu@uat.internal",
    is_minor: false,
    gate_access_allowed: true,
  });
  console.log("   ✓ Ownership and Occupancy links established with family members.");

  // 6. Notices (Announcements)
  console.log("\n6. Creating Notices...");
  await adminClient.from("notices").insert([
    {
      society_id: society.id,
      title: "Annual Water Overhead Tank Cleaning",
      description: "Please note that water supply will be suspended on Sunday from 9:00 AM to 3:00 PM for hydraulic pressure cleaning.",
      category: "MAINTENANCE",
      priority: "HIGH",
      published_by: vikramId,
      status: "PUBLISHED",
    },
    {
      society_id: society.id,
      title: "Notice of Extraordinary General Meeting (EGM)",
      description: "The Managing Committee hereby convenes an EGM on October 10 at 10:30 AM to ratify the Solar Panel installation vendor bid.",
      category: "GENERAL",
      priority: "EMERGENCY",
      published_by: vikramId,
      status: "PUBLISHED",
    },
  ]);
  console.log("   ✓ Created 2 notices.");

  // 7. Amenities & Bookings
  console.log("\n7. Provisioning Amenities & Bookings...");
  const { data: clubhouse } = await adminClient
    .from("amenities")
    .insert({
      society_id: society.id,
      name: "Clubhouse & Community Hall",
      description: "Air-conditioned banquet space for family functions and community gatherings.",
      category: "CLUBHOUSE",
      capacity: 120,
      status: "AVAILABLE",
    })
    .select()
    .single();

  await adminClient
    .from("amenities")
    .insert({
      society_id: society.id,
      name: "Olympic Swimming Pool",
      description: "25-meter chlorinated pool with certified lifeguard on duty.",
      category: "SWIMMING_POOL",
      capacity: 30,
      status: "AVAILABLE",
    });

  if (clubhouse) {
    await adminClient.from("amenity_bookings").insert({
      society_id: society.id,
      amenity_id: clubhouse.id,
      unit_id: uB102,
      booked_by: rahulId,
      booking_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      start_time: "10:00:00",
      end_time: "14:00:00",
      status: "CONFIRMED",
    });
  }
  console.log("   ✓ Created 2 amenities and 1 reservation.");

  // 8. Maintenance Billing & Payments
  console.log("\n8. Generating Billing Cycle, Invoices & Payments...");
  const { data: billingCycle } = await adminClient
    .from("billing_cycles")
    .insert({
      society_id: society.id,
      name: "September 2026 Billing",
      period_start: "2026-09-01",
      period_end: "2026-09-30",
      due_date: "2026-09-25",
      status: "GENERATED",
      created_by: vikramId,
    })
    .select()
    .single();

  const { data: invPaid } = await adminClient
    .from("invoices")
    .insert({
      society_id: society.id,
      unit_id: uA101,
      billing_cycle_id: billingCycle?.id,
      invoice_number: `INV-2026-09-${Date.now().toString().slice(-4)}-01`,
      invoice_date: "2026-09-01",
      due_date: "2026-09-25",
      subtotal: 4500.0,
      total_amount: 4500.0,
      amount_paid: 4500.0,
      balance_due: 0.0,
      status: "PAID",
    })
    .select()
    .single();

  if (invPaid) {
    await adminClient.from("payments").insert({
      society_id: society.id,
      invoice_id: invPaid.id,
      unit_id: uA101,
      amount: 4500.0,
      payment_date: "2026-09-12",
      payment_method: "BANK_TRANSFER",
      reference_number: "NEFT-HDFC-9918231",
      status: "COMPLETED",
      recorded_by: vikramId,
    });
  }

  await adminClient.from("invoices").insert({
    society_id: society.id,
    unit_id: uA201,
    billing_cycle_id: billingCycle?.id,
    invoice_number: `INV-2026-09-${Date.now().toString().slice(-4)}-02`,
    invoice_date: "2026-09-01",
    due_date: "2026-09-25",
    subtotal: 6200.0,
    total_amount: 6200.0,
    amount_paid: 0.0,
    balance_due: 6200.0,
    status: "UNPAID",
  });

  await adminClient.from("invoices").insert({
    society_id: society.id,
    unit_id: uB102,
    billing_cycle_id: billingCycle?.id,
    invoice_number: `INV-2026-08-${Date.now().toString().slice(-4)}-03`,
    invoice_date: "2026-08-01",
    due_date: "2026-08-25",
    subtotal: 4500.0,
    total_amount: 4500.0,
    amount_paid: 0.0,
    balance_due: 4500.0,
    status: "OVERDUE",
  });
  console.log("   ✓ Created 1 billing cycle, 3 invoices, and 1 reconciled payment.");

  // 9. Visitors & Gate Security
  console.log("\n9. Provisioning Gate Visitors...");
  await adminClient.from("visitors").insert([
    {
      society_id: society.id,
      unit_id: uA101,
      visitor_name: "Rajesh Verma (Amazon Delivery)",
      visitor_phone: "+91 98920 44556",
      purpose: "DELIVERY",
      pass_code: "9981",
      status: "CHECKED_IN",
      check_in_at: new Date().toISOString(),
      gate_number: "Gate 1",
      created_by: vikramId,
    },
    {
      society_id: society.id,
      unit_id: uA201,
      visitor_name: "Amit Sharma (Guest)",
      visitor_phone: "+91 98111 22334",
      purpose: "GUEST",
      pass_code: "4421",
      status: "EXPECTED",
      gate_number: "Gate 1",
      created_by: priyaId,
    },
    {
      society_id: society.id,
      unit_id: uB102,
      visitor_name: "Deepak Joshi (Plumber)",
      visitor_phone: "+91 97000 88991",
      purpose: "SERVICE",
      pass_code: "1289",
      status: "CHECKED_OUT",
      check_in_at: new Date(Date.now() - 3600000).toISOString(),
      check_out_at: new Date().toISOString(),
      gate_number: "Service Gate",
      created_by: rahulId,
    },
  ]);
  console.log("   ✓ Created 3 visitor security records.");

  // 10. Helpdesk Complaints & SLA
  console.log("\n10. Logging Complaints & SLA Timeline...");
  const { data: comp1 } = await adminClient
    .from("complaints")
    .insert({
      society_id: society.id,
      unit_id: uA201,
      created_by: priyaId,
      title: "Tower A Passenger Elevator Door Sensor Erratic",
      description: "Elevator door reopens multiple times on 2nd floor before closing. Requires technician inspection.",
      category: "ELEVATOR",
      priority: "HIGH",
      status: "IN_PROGRESS",
    })
    .select()
    .single();

  if (comp1) {
    await adminClient.from("complaint_sla_events").insert([
      { society_id: society.id, complaint_id: comp1.id, event_type: "CREATED", actor_id: priyaId, notes: "Ticket logged by resident." },
      { society_id: society.id, complaint_id: comp1.id, event_type: "ASSIGNED", actor_id: vikramId, notes: "Assigned to Apex Elevators for repair." },
    ]);
  }
  console.log("   ✓ Created 1 complaint with SLA timeline history.");

  // 11. Documents & Folders
  console.log("\n11. Creating Document Folders & Categories...");
  await adminClient.from("document_folders").insert([
    {
      society_id: society.id,
      name: "Society Bylaws & Registration",
      description: "Official society registration deed and enacted bylaws.",
      created_by: vikramId,
    },
    {
      society_id: society.id,
      name: "Statutory Financial Audit Reports",
      description: "Audited financial balance sheets and auditor notes.",
      created_by: vikramId,
    },
  ]);

  await adminClient.from("documents").insert({
    society_id: society.id,
    title: "DwellSync Society Model Bylaws 2026",
    description: "Official adopted bylaws",
    category: "SOCIETY_BYLAWS",
    file_url: "https://example.com/docs/bylaws.pdf",
    visibility: "ALL_RESIDENTS",
    uploaded_by: vikramId,
  });
  console.log("   ✓ Created 2 document folders and 1 document.");

  // 12. Governance: Committees, Meetings & Resolutions
  console.log("\n12. Provisioning Governance Committees, Meetings & Resolutions...");
  const { data: comm } = await adminClient
    .from("committees")
    .insert({
      society_id: society.id,
      name: "Managing Committee (2026 - 2028)",
      description: "Statutory elected governing committee of Grand Residency.",
      committee_type: "MANAGING_COMMITTEE",
      term_start_date: "2026-04-01",
      term_end_date: "2028-03-31",
      status: "ACTIVE",
      created_by: vikramId,
    })
    .select()
    .single();

  if (comm) {
    await adminClient.from("committee_members").insert([
      { society_id: society.id, committee_id: comm.id, user_id: secId, designation: "SECRETARY", status: "ACTIVE" },
      { society_id: society.id, committee_id: comm.id, user_id: trsId, designation: "TREASURER", status: "ACTIVE" },
    ]);
  }

  const { data: mtg } = await adminClient
    .from("society_meetings")
    .insert({
      society_id: society.id,
      title: "Annual General Body Meeting (AGM 2026)",
      meeting_type: "AGM",
      location_type: "PHYSICAL",
      location_details: "Grand Residency Clubhouse Hall",
      scheduled_at: "2026-10-15T10:00:00Z",
      status: "SCHEDULED",
      organized_by: vikramId,
    })
    .select()
    .single();

  await adminClient
    .from("governance_resolutions")
    .insert({
      society_id: society.id,
      meeting_id: mtg?.id,
      resolution_number: "RES-2026-04",
      title: "Resolution #04/2026: Rooftop Solar Power Plant Installation",
      description: "Resolved to sanction ₹14,50,000 for a 40kW grid-connected rooftop solar installation to reduce common area electricity bills.",
      resolution_type: "ORDINARY",
      status: "PASSED",
      votes_for: 35,
      votes_against: 2,
      votes_abstained: 1,
      passed_date: "2026-09-10",
      effective_date: "2026-09-15",
      created_by: vikramId,
    });

  console.log("   ✓ Created Committee with Members, AGM Meeting, and Formal Resolution.");

  // 13. Builder Handover Project
  console.log("\n13. Provisioning Builder Handover Project...");
  const { data: hProject } = await adminClient
    .from("handover_projects")
    .insert({
      society_id: society.id,
      title: "Prestige Developers Phase 1 Handover",
      builder_name: "Prestige Infrastructure Ltd.",
      status: "IN_PROGRESS",
      created_by: vikramId,
    })
    .select()
    .single();

  if (hProject) {
    await adminClient.from("handover_checklist_items").insert([
      {
        handover_project_id: hProject.id,
        society_id: society.id,
        category: "STATUTORY",
        title: "Fire Safety Compliance & Final NOC Verification",
        priority: "CRITICAL",
        status: "COMPLETED",
        created_by: vikramId,
      },
      {
        handover_project_id: hProject.id,
        society_id: society.id,
        category: "ELECTRICAL",
        title: "DG Set 125 KVA Synchronization Panel Testing",
        priority: "HIGH",
        status: "PENDING",
        created_by: vikramId,
      },
    ]);

    await adminClient.from("handover_defects").insert({
      handover_project_id: hProject.id,
      society_id: society.id,
      title: "Basement 2 Stormwater Sump Pump Seepage",
      description: "Water seepage observed around mounting flange during heavy rainfall.",
      category: "PLUMBING",
      severity: "CRITICAL",
      status: "OPEN",
      created_by: vikramId,
    });
  }
  console.log("   ✓ Created Builder Handover project with checklist and defect snagging.");

  // 14. Assets & Inventory
  console.log("\n14. Registering Society Assets & Inventory...");
  await adminClient.from("assets").insert([
    {
      society_id: society.id,
      asset_code: "AST-GEN-01",
      name: "Kirloskar 125 KVA Silent Diesel Generator",
      category: "DG_POWER",
      location_description: "DG Yard Behind Tower A",
      status: "ACTIVE",
      condition: "EXCELLENT",
    },
    {
      society_id: society.id,
      asset_code: "AST-LFT-01",
      name: "Otis V3F 8-Passenger Automatic Elevator #1",
      category: "HVAC_LIFTS",
      location_description: "Tower A Core",
      status: "ACTIVE",
      condition: "GOOD",
    },
  ]);

  await adminClient.from("inventory_items").insert({
    society_id: society.id,
    item_code: "INV-ELEC-01",
    name: "40W LED Batten Tubelights (Cool White)",
    category: "ELECTRICAL",
    unit_of_measure: "PIECES",
    opening_quantity: 100,
    current_quantity: 65,
    min_reorder_level: 20,
    unit_cost: 250,
  });
  console.log("   ✓ Created Assets and Inventory items.");

  // 15. Finance & Treasury
  console.log("\n15. Setting up Chart of Accounts & Bank Accounts...");
  const { data: coaAccounts } = await adminClient.from("chart_of_accounts").insert([
    { society_id: society.id, account_code: "1001", account_name: "Cash in Hand", account_type: "ASSET", category: "CASH", is_active: true },
    { society_id: society.id, account_code: "1002", account_name: "HDFC Bank Account", account_type: "ASSET", category: "BANK", is_active: true },
    { society_id: society.id, account_code: "4001", account_name: "Maintenance Charges Collection", account_type: "INCOME", category: "OPERATING_INCOME", is_active: true },
    { society_id: society.id, account_code: "5001", account_name: "Security Guard Service Charges", account_type: "EXPENSE", category: "OPERATING_EXPENSE", is_active: true },
  ]).select();

  const hdfcCoa = coaAccounts?.find((a) => a.account_code === "1002");
  if (hdfcCoa) {
    await adminClient.from("society_bank_accounts").insert({
      society_id: society.id,
      account_id: hdfcCoa.id,
      bank_name: "HDFC Bank Ltd",
      account_number: "50200088992211",
      account_type: "CURRENT",
      opening_balance: 500000.0,
      current_balance: 500000.0,
      is_primary: true,
      is_active: true,
    });
  }
  console.log("   ✓ Created Chart of Accounts and linked Society Bank Account.");

  // 16. Property Management Company (PMC) Binding
  console.log("\n16. Provisioning Property Management Company (PMC)...");
  const { data: pmc } = await adminClient
    .from("management_companies")
    .insert({
      name: "Apex Integrated Facility Management Ltd.",
      code: UAT_PMC_CODE,
      contact_email: "support@apexpmc.internal",
      contact_phone: "+91 22 4455 6677",
      status: "ACTIVE",
    })
    .select()
    .single();

  if (pmc) {
    await adminClient.from("management_company_societies").insert({
      management_company_id: pmc.id,
      society_id: society.id,
      status: "ACTIVE",
    });
  }
  console.log("   ✓ Created PMC and bound to UAT society.");

  console.log("\n===============================================================================");
  console.log("🎉 COMPREHENSIVE UAT SEED COMPLETED SUCCESSFULLY!");
  console.log(`Society Name:      ${society.name} (Code: ${society.code})`);
  console.log(`Society ID:        ${society.id}`);
  console.log("Buildings/Units:   Tower A & Tower B (10 Units)");
  console.log(`All Personas Pass: ${DEFAULT_PASSWORD}`);
  console.log("Developer User:    ramchat007@gmail.com (Linked as SOCIETY_ADMIN)");
  console.log("===============================================================================");
}

main().catch((err) => {
  console.error("Fatal Seeder Error:", err);
  process.exit(1);
});
