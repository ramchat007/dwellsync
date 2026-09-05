import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { RoleId, SocietyType } from "../src/lib/types/database";

if (process.env.NODE_ENV === "production") {
  console.error("🛑 FATAL: Development seed script cannot be executed in production environment.");
  process.exit(1);
}

const DEFAULT_TEST_PASSWORD = "TestPassword@123";

const PERSONAS: {
  email: string;
  fullName: string;
  role: RoleId;
  unitNumber?: string;
  isSuperAdmin?: boolean;
}[] = [
  {
    email: "superadmin@DwellSyncHub.internal",
    fullName: "Rupesh Mestry (Platform Super Admin)",
    role: "SUPER_ADMIN",
    isSuperAdmin: true,
  },
  {
    email: "admin@greenvalley.internal",
    fullName: "Vikram Malhotra (Society Admin)",
    role: "SOCIETY_ADMIN",
    unitNumber: "A-101",
  },
  {
    email: "secretary@greenvalley.internal",
    fullName: "Ananya Deshmukh (Secretary)",
    role: "SECRETARY",
    unitNumber: "B-204",
  },
  {
    email: "treasurer@greenvalley.internal",
    fullName: "Rajesh Iyer (Treasurer)",
    role: "TREASURER",
    unitNumber: "A-502",
  },
  {
    email: "committee@greenvalley.internal",
    fullName: "Sunita Kulkarni (Committee Member)",
    role: "COMMITTEE_MEMBER",
    unitNumber: "A-301",
  },
  {
    email: "manager@greenvalley.internal",
    fullName: "Manoj Sawant (Facility Manager)",
    role: "MANAGER",
  },
  {
    email: "resident@greenvalley.internal",
    fullName: "Rahul Sharma (Resident)",
    role: "RESIDENT",
    unitNumber: "B-102",
  },
  {
    email: "owner@greenvalley.internal",
    fullName: "Priya Nair (Property Owner)",
    role: "OWNER",
    unitNumber: "A-201",
  },
  {
    email: "tenant@greenvalley.internal",
    fullName: "Amit Patel (Tenant)",
    role: "TENANT",
    unitNumber: "B-201",
  },
  {
    email: "security@greenvalley.internal",
    fullName: "Ramesh Shinde (Security Guard)",
    role: "SECURITY",
  },
  {
    email: "staff@greenvalley.internal",
    fullName: "Kishan Lal (Staff / Maintenance)",
    role: "STAFF",
  },
  {
    email: "vendor@greenvalley.internal",
    fullName: "Apex Elevators & Services (Vendor)",
    role: "VENDOR",
  },
  {
    email: "auditor@greenvalley.internal",
    fullName: "K.V. Mehta & Co (Auditor)",
    role: "AUDITOR",
  },
];

async function seedDevEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("==================================================");
  console.log("DwellSyncHub Phase 1 — Multi-Tenant Seed Generator");
  console.log("==================================================");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Primary Society: Green Valley CHS
  console.log("1. Setting up Primary Test Society: Green Valley CHS (GVS001)...");
  let { data: society } = await adminClient
    .from("societies")
    .select("*")
    .eq("code", "GVS001")
    .maybeSingle();

  if (!society) {
    const { data: newSociety, error: societyError } = await adminClient
      .from("societies")
      .insert({
        name: "Green Valley Co-operative Housing Society",
        code: "GVS001",
        registration_number: "MUM/HSG/TC/10294/2012",
        society_type: "COOPERATIVE_HOUSING" as SocietyType,
        address_line_1: "104 Palm Grove Road",
        address_line_2: "Goregaon West",
        landmark: "Near City Center Mall",
        city: "Mumbai",
        district: "Mumbai Suburban",
        state: "Maharashtra",
        pincode: "400062",
        country: "India",
        contact_email: "office@greenvalley.internal",
        contact_phone: "+91 98200 12345",
        timezone: "Asia/Kolkata",
        currency: "INR",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (societyError || !newSociety) {
      console.error("❌ Failed to create Test Society:", societyError?.message);
      process.exit(1);
    }
    society = newSociety;
    console.log(`✓ Created Test Society: ${society.name} (ID: ${society.id})`);
  } else {
    console.log(`✓ Found existing Test Society: ${society.name} (ID: ${society.id})`);
  }

  // 2. Secondary Society: Royal Heights CHS (for tenant isolation tests)
  let { data: societyB } = await adminClient
    .from("societies")
    .select("*")
    .eq("code", "RHC002")
    .maybeSingle();

  if (!societyB) {
    const { data: newSocietyB } = await adminClient
      .from("societies")
      .insert({
        name: "Royal Heights CHS",
        code: "RHC002",
        registration_number: "MUM/HSG/TC/9812/2018",
        society_type: "APARTMENT_SOCIETY" as SocietyType,
        address_line_1: "42 Linking Road",
        city: "Mumbai",
        district: "Mumbai Suburban",
        state: "Maharashtra",
        pincode: "400050",
        country: "India",
        status: "ACTIVE",
      })
      .select()
      .single();
    societyB = newSocietyB;
    console.log(`✓ Created Secondary Society: Royal Heights (ID: ${societyB?.id})`);
  }

  // 3. Physical Structural Hierarchy (Tower A & Tower B)
  console.log("\n2. Provisioning Buildings, Wings, Floors & Units for Green Valley CHS...");

  // Tower A
  let { data: towerA } = await adminClient
    .from("buildings")
    .select("*")
    .eq("society_id", society.id)
    .eq("code", "TWR-A")
    .maybeSingle();

  if (!towerA) {
    const { data: newTowerA } = await adminClient
      .from("buildings")
      .insert({
        society_id: society.id,
        name: "Tower A (Sunrise)",
        code: "TWR-A",
        description: "Residential 5-storey residential tower",
        number_of_floors: 5,
        status: "ACTIVE",
      })
      .select()
      .single();
    towerA = newTowerA;
    console.log(`  ✓ Created Building: ${towerA?.name}`);
  }

  // Tower B
  let { data: towerB } = await adminClient
    .from("buildings")
    .select("*")
    .eq("society_id", society.id)
    .eq("code", "TWR-B")
    .maybeSingle();

  if (!towerB) {
    const { data: newTowerB } = await adminClient
      .from("buildings")
      .insert({
        society_id: society.id,
        name: "Tower B (Sunset)",
        code: "TWR-B",
        description: "Residential 5-storey tower with retail shops",
        number_of_floors: 5,
        status: "ACTIVE",
      })
      .select()
      .single();
    towerB = newTowerB;
    console.log(`  ✓ Created Building: ${towerB?.name}`);
  }

  // Units Map
  const unitMap = new Map<string, string>();

  // Ensure Tower A units
  if (towerA) {
    const sampleUnitsA = [
      { unit_number: "A-101", unit_type: "2_BHK", area_sqft: 950, status: "OCCUPIED" },
      { unit_number: "A-102", unit_type: "2_BHK", area_sqft: 950, status: "VACANT" },
      { unit_number: "A-201", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
      { unit_number: "A-301", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
      { unit_number: "A-502", unit_type: "PENTHOUSE", area_sqft: 2100, status: "OCCUPIED" },
    ];

    for (const u of sampleUnitsA) {
      const { data: unitRecord } = await adminClient
        .from("units")
        .upsert(
          {
            society_id: society.id,
            building_id: towerA.id,
            unit_number: u.unit_number,
            unit_type: u.unit_type,
            area_sqft: u.area_sqft,
            status: u.status,
          },
          { onConflict: "society_id,building_id,unit_number" }
        )
        .select()
        .single();

      if (unitRecord) unitMap.set(u.unit_number, unitRecord.id);
    }
  }

  // Ensure Tower B units
  if (towerB) {
    const sampleUnitsB = [
      { unit_number: "B-101", unit_type: "1_BHK", area_sqft: 650, status: "VACANT" },
      { unit_number: "B-102", unit_type: "2_BHK", area_sqft: 950, status: "OCCUPIED" },
      { unit_number: "B-201", unit_type: "2_BHK", area_sqft: 950, status: "OCCUPIED" },
      { unit_number: "B-204", unit_type: "3_BHK", area_sqft: 1350, status: "OCCUPIED" },
    ];

    for (const u of sampleUnitsB) {
      const { data: unitRecord } = await adminClient
        .from("units")
        .upsert(
          {
            society_id: society.id,
            building_id: towerB.id,
            unit_number: u.unit_number,
            unit_type: u.unit_type,
            area_sqft: u.area_sqft,
            status: u.status,
          },
          { onConflict: "society_id,building_id,unit_number" }
        )
        .select()
        .single();

      if (unitRecord) unitMap.set(u.unit_number, unitRecord.id);
    }
  }

  // 4. Provisioning 13 Real Persona Users
  console.log("\n3. Provisioning 13 Real Persona Users with Memberships & Occupancies...");

  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUserMap = new Map((existingUsers?.users || []).map((u) => [u.email?.toLowerCase(), u]));
  const personaUserIdMap = new Map<string, string>();

  for (const persona of PERSONAS) {
    let authUser = existingUserMap.get(persona.email.toLowerCase());

    if (!authUser) {
      const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
        email: persona.email,
        password: DEFAULT_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: persona.fullName,
          display_name: persona.fullName.split(" (")[0],
        },
      });

      if (authError || !newAuthUser.user) {
        console.error(`❌ Failed to create user ${persona.email}:`, authError?.message);
        continue;
      }
      authUser = newAuthUser.user;
    }

    personaUserIdMap.set(persona.email, authUser.id);

    await adminClient.from("profiles").upsert(
      {
        id: authUser.id,
        email: persona.email,
        full_name: persona.fullName,
        display_name: persona.fullName.split(" (")[0],
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (persona.isSuperAdmin) {
      await adminClient.from("platform_admins").upsert(
        {
          user_id: authUser.id,
          role_id: "SUPER_ADMIN",
        },
        { onConflict: "user_id" }
      );
      console.log(`  ✓ [SUPER_ADMIN] ${persona.email} -> Platform Owner`);
    }

    if (persona.role !== "SUPER_ADMIN") {
      await adminClient.from("society_memberships").upsert(
        {
          society_id: society.id,
          user_id: authUser.id,
          role_id: persona.role,
          unit_number: persona.unitNumber || null,
          status: "ACTIVE",
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "society_id,user_id,role_id" }
      );
      console.log(`  ✓ [${persona.role}] ${persona.email} -> ${society.name} (${persona.unitNumber || "Staff"})`);
    }
  }

  // 5. Phase 1 Ownership & Occupancy Associations
  console.log("\n4. Linking Phase 1 Multi-Ownership & Occupancy Records...");

  const priyaNairId = personaUserIdMap.get("owner@greenvalley.internal");
  const rahulSharmaId = personaUserIdMap.get("resident@greenvalley.internal");
  const amitPatelId = personaUserIdMap.get("tenant@greenvalley.internal");
  const vikramMalhotraId = personaUserIdMap.get("admin@greenvalley.internal");

  const unitA201Id = unitMap.get("A-201");
  const unitB102Id = unitMap.get("B-102");
  const unitB201Id = unitMap.get("B-201");
  const unitA101Id = unitMap.get("A-101");

  // A-201 Owner (Priya Nair, 100% Primary Owner)
  if (priyaNairId && unitA201Id) {
    await adminClient.from("unit_owners").upsert(
      {
        society_id: society.id,
        unit_id: unitA201Id,
        user_id: priyaNairId,
        is_primary: true,
        ownership_percentage: 100.0,
        ownership_type: "PRIMARY",
        status: "ACTIVE",
      },
      { onConflict: "unit_id,user_id" }
    );
    console.log(`  ✓ Unit A-201: Owner Priya Nair (100%)`);
  }

  // A-101 Owner & Occupant (Vikram Malhotra)
  if (vikramMalhotraId && unitA101Id) {
    await adminClient.from("unit_owners").upsert(
      {
        society_id: society.id,
        unit_id: unitA101Id,
        user_id: vikramMalhotraId,
        is_primary: true,
        ownership_percentage: 100.0,
        ownership_type: "PRIMARY",
        status: "ACTIVE",
      },
      { onConflict: "unit_id,user_id" }
    );

    await adminClient.from("unit_occupancies").upsert(
      {
        society_id: society.id,
        unit_id: unitA101Id,
        user_id: vikramMalhotraId,
        occupancy_type: "OWNER_OCCUPIED",
        is_primary_tenant: true,
        status: "ACTIVE",
      },
      { onConflict: "unit_id,user_id" }
    );
    console.log(`  ✓ Unit A-101: Owner-Occupied by Vikram Malhotra`);
  }

  // B-102 Resident (Rahul Sharma, Resident & Family Members)
  if (rahulSharmaId && unitB102Id) {
    await adminClient.from("unit_occupancies").upsert(
      {
        society_id: society.id,
        unit_id: unitB102Id,
        user_id: rahulSharmaId,
        occupancy_type: "FAMILY_OCCUPIED",
        is_primary_tenant: true,
        status: "ACTIVE",
      },
      { onConflict: "unit_id,user_id" }
    );

    await adminClient.from("family_members").insert({
      society_id: society.id,
      unit_id: unitB102Id,
      primary_member_id: rahulSharmaId,
      full_name: "Chirayu Sharma",
      relationship: "CHILD",
      is_emergency_contact: false,
    });
    console.log(`  ✓ Unit B-102: Occupied by Rahul Sharma + Family`);
  }

  // B-201 Tenant (Amit Patel with 1-year lease)
  if (amitPatelId && unitB201Id) {
    await adminClient.from("unit_occupancies").upsert(
      {
        society_id: society.id,
        unit_id: unitB201Id,
        user_id: amitPatelId,
        occupancy_type: "TENANT_OCCUPIED",
        lease_start: "2026-01-01",
        lease_end: "2026-12-31",
        is_primary_tenant: true,
        status: "ACTIVE",
      },
      { onConflict: "unit_id,user_id" }
    );
    console.log(`  ✓ Unit B-201: Tenant Amit Patel (Lease: 2026-01-01 to 2026-12-31)`);
  }

  console.log("\n==================================================");
  console.log("🎉 PHASE 1 SEED COMPLETE!");
  console.log(`Primary Society:   ${society.name} (Code: ${society.code})`);
  console.log(`Secondary Society: ${societyB?.name} (Code: ${societyB?.code})`);
  console.log("Buildings:         Tower A (5 floors), Tower B (5 floors)");
  console.log(`Default Password:  ${DEFAULT_TEST_PASSWORD}`);
  console.log("==================================================");
}

seedDevEnvironment().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
