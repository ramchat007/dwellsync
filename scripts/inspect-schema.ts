import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testAllRemaining() {
  const { data: soc } = await adminClient.from("societies").select("id").eq("code", "UAT001").single();
  const { data: units } = await adminClient.from("units").select("id, unit_number").eq("society_id", soc?.id);
  const { data: profile } = await adminClient.from("profiles").select("id").limit(1).single();

  const sid = soc!.id;
  const uid = profile!.id;
  const unit1 = units![0].id;
  const unit2 = units![1].id;

  // 1. Notices
  const notRes = await adminClient.from("notices").insert([
    { society_id: sid, title: "Water Tank Cleaning Notice", description: "Water supply suspended Sunday 9am-3pm.", category: "MAINTENANCE", priority: "HIGH", published_by: uid, status: "PUBLISHED" },
    { society_id: sid, title: "General Body EGM Notice", description: "EGM scheduled for solar installation ratification.", category: "GENERAL", priority: "MEDIUM", published_by: uid, status: "PUBLISHED" },
  ]).select();
  console.log("Notices:", notRes.error ? notRes.error.message : `Inserted ${notRes.data.length}`);

  // 2. Document Folders & Documents
  const fRes = await adminClient.from("document_folders").insert([
    { society_id: sid, name: "Bylaws & Statutory", description: "Official rules and registration documents.", created_by: uid },
    { society_id: sid, name: "Financial Audits", description: "Audited balance sheets.", created_by: uid },
  ]).select();
  console.log("Folders:", fRes.error ? fRes.error.message : `Inserted ${fRes.data.length}`);

  const dRes = await adminClient.from("documents").insert({
    society_id: sid,
    title: "DwellSync Society Model Bylaws 2026",
    description: "Official adopted bylaws",
    category: "SOCIETY_BYLAWS",
    file_url: "https://example.com/docs/bylaws.pdf",
    visibility: "ALL_RESIDENTS",
    uploaded_by: uid,
  }).select();
  console.log("Documents:", dRes.error ? dRes.error.message : `Inserted ${dRes.data.length}`);

  // 3. Billing Cycles & Invoices & Payments
  const bcRes = await adminClient.from("billing_cycles").insert({
    society_id: sid,
    name: "September 2026 Billing",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    due_date: "2026-09-25",
    status: "GENERATED",
    created_by: uid,
  }).select().single();
  console.log("Billing Cycle:", bcRes.error ? bcRes.error.message : `ID ${bcRes.data.id}`);

  if (bcRes.data) {
    const invRes = await adminClient.from("invoices").insert([
      {
        society_id: sid,
        unit_id: unit1,
        billing_cycle_id: bcRes.data.id,
        invoice_number: `INV-2026-09-${Date.now().toString().slice(-4)}-1`,
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 4500,
        total_amount: 4500,
        amount_paid: 4500,
        balance_due: 0,
        status: "PAID",
      },
      {
        society_id: sid,
        unit_id: unit2,
        billing_cycle_id: bcRes.data.id,
        invoice_number: `INV-2026-09-${Date.now().toString().slice(-4)}-2`,
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 6200,
        total_amount: 6200,
        amount_paid: 0,
        balance_due: 6200,
        status: "UNPAID",
      },
    ]).select();
    console.log("Invoices:", invRes.error ? invRes.error.message : `Inserted ${invRes.data.length}`);

    if (invRes.data && invRes.data[0]) {
      const pRes = await adminClient.from("payments").insert({
        society_id: sid,
        invoice_id: invRes.data[0].id,
        unit_id: unit1,
        amount: 4500,
        payment_date: "2026-09-12",
        payment_method: "BANK_TRANSFER",
        reference_number: "NEFT-HDFC-9918231",
        status: "COMPLETED",
        recorded_by: uid,
      }).select();
      console.log("Payments:", pRes.error ? pRes.error.message : `Inserted ${pRes.data.length}`);
    }
  }

  // 4. Visitors
  const vRes = await adminClient.from("visitors").insert([
    {
      society_id: sid,
      unit_id: unit1,
      visitor_name: "Rajesh Verma (Amazon Delivery)",
      visitor_phone: "+91 98920 44556",
      purpose: "DELIVERY",
      pass_code: "9981",
      status: "CHECKED_IN",
      check_in_at: new Date().toISOString(),
      created_by: uid,
    },
    {
      society_id: sid,
      unit_id: unit2,
      visitor_name: "Amit Sharma (Guest)",
      visitor_phone: "+91 98111 22334",
      purpose: "GUEST",
      pass_code: "4421",
      status: "EXPECTED",
      created_by: uid,
    },
  ]).select();
  console.log("Visitors:", vRes.error ? vRes.error.message : `Inserted ${vRes.data.length}`);

  // 5. Amenities & Bookings
  const amRes = await adminClient.from("amenities").insert([
    { society_id: sid, name: "Clubhouse Banquet Hall", category: "CLUBHOUSE", capacity: 120, status: "AVAILABLE" },
    { society_id: sid, name: "Olympic Swimming Pool", category: "SWIMMING_POOL", capacity: 30, status: "AVAILABLE" },
  ]).select();
  console.log("Amenities:", amRes.error ? amRes.error.message : `Inserted ${amRes.data.length}`);

  if (amRes.data && amRes.data[0]) {
    const abRes = await adminClient.from("amenity_bookings").insert({
      society_id: sid,
      amenity_id: amRes.data[0].id,
      unit_id: unit1,
      booked_by: uid,
      booking_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      start_time: "10:00:00",
      end_time: "14:00:00",
      status: "CONFIRMED",
    }).select();
    console.log("Amenity Bookings:", abRes.error ? abRes.error.message : `Inserted ${abRes.data.length}`);
  }

  // 6. Complaints & SLA Events
  const cRes = await adminClient.from("complaints").insert({
    society_id: sid,
    unit_id: unit1,
    created_by: uid,
    title: "Passenger Elevator Door Sensor Misaligned",
    description: "Door reopens repeatedly on 2nd floor before closing.",
    category: "ELEVATOR",
    priority: "HIGH",
    status: "IN_PROGRESS",
  }).select().single();
  console.log("Complaint:", cRes.error ? cRes.error.message : `ID ${cRes.data.id}`);

  if (cRes.data) {
    const ceRes = await adminClient.from("complaint_sla_events").insert([
      { society_id: sid, complaint_id: cRes.data.id, event_type: "CREATED", actor_id: uid, notes: "Ticket logged." },
      { society_id: sid, complaint_id: cRes.data.id, event_type: "ASSIGNED", actor_id: uid, notes: "Assigned to elevator vendor." },
    ]).select();
    console.log("Complaint SLA Events:", ceRes.error ? ceRes.error.message : `Inserted ${ceRes.data.length}`);
  }

  // 7. Society Meetings & Governance Resolutions
  const smRes = await adminClient.from("society_meetings").insert({
    society_id: sid,
    title: "Annual General Meeting (AGM 2026)",
    meeting_type: "AGM",
    location_type: "PHYSICAL",
    location_details: "Clubhouse Banquet Hall",
    scheduled_at: "2026-10-15T10:00:00Z",
    status: "SCHEDULED",
    organized_by: uid,
  }).select().single();
  console.log("Society Meetings:", smRes.error ? smRes.error.message : `ID ${smRes.data.id}`);

  const grRes = await adminClient.from("governance_resolutions").insert({
    society_id: sid,
    meeting_id: smRes.data?.id,
    resolution_number: "RES-2026-04",
    title: "Sanction of 40kW Rooftop Solar Installation",
    description: "Sanction ₹14,50,000 for 40kW rooftop solar power.",
    resolution_type: "ORDINARY",
    status: "PASSED",
    votes_for: 35,
    votes_against: 2,
    votes_abstained: 1,
    passed_date: "2026-09-10",
    effective_date: "2026-09-15",
    created_by: uid,
  }).select();
  console.log("Governance Resolutions:", grRes.error ? grRes.error.message : `Inserted ${grRes.data.length}`);

  // 8. Committees & Committee Members
  const comRes = await adminClient.from("committees").insert({
    society_id: sid,
    name: "Managing Committee 2026-2028",
    committee_type: "MANAGING_COMMITTEE",
    term_start_date: "2026-04-01",
    term_end_date: "2028-03-31",
    status: "ACTIVE",
    description: "Statutory elected governing committee.",
    created_by: uid,
  }).select().single();
  console.log("Committees:", comRes.error ? comRes.error.message : `ID ${comRes.data.id}`);

  if (comRes.data) {
    const cmRes = await adminClient.from("committee_members").insert([
      { society_id: sid, committee_id: comRes.data.id, user_id: uid, designation: "SECRETARY", status: "ACTIVE" },
    ]).select();
    console.log("Committee Members:", cmRes.error ? cmRes.error.message : `Inserted ${cmRes.data.length}`);
  }

  // 9. Builder Handover
  const hpRes = await adminClient.from("handover_projects").insert({
    society_id: sid,
    title: "Prestige Developers Phase 1 Handover",
    builder_name: "Prestige Infrastructure Ltd.",
    status: "IN_PROGRESS",
    created_by: uid,
  }).select().single();
  console.log("Handover Project:", hpRes.error ? hpRes.error.message : `ID ${hpRes.data.id}`);

  if (hpRes.data) {
    const hchkRes = await adminClient.from("handover_checklist_items").insert({
      society_id: sid,
      handover_project_id: hpRes.data.id,
      category: "STATUTORY",
      title: "Fire Safety Compliance & Final NOC Verification",
      priority: "CRITICAL",
      status: "COMPLETED",
      created_by: uid,
    }).select();
    console.log("Handover Checklist:", hchkRes.error ? hchkRes.error.message : `Inserted ${hchkRes.data.length}`);

    const hdefRes = await adminClient.from("handover_defects").insert({
      society_id: sid,
      handover_project_id: hpRes.data.id,
      title: "Basement 2 Stormwater Sump Pump Seepage",
      description: "Water seepage observed around mounting flange.",
      category: "PLUMBING",
      severity: "CRITICAL",
      status: "OPEN",
      created_by: uid,
    }).select();
    console.log("Handover Defects:", hdefRes.error ? hdefRes.error.message : `Inserted ${hdefRes.data.length}`);
  }

  // 10. Assets & Inventory
  const astRes = await adminClient.from("assets").insert([
    {
      society_id: sid,
      asset_code: "AST-GEN-01",
      name: "Kirloskar 125 KVA Silent Diesel Generator",
      category: "DG_POWER",
      location_description: "DG Yard Behind Tower A",
      status: "ACTIVE",
      condition: "EXCELLENT",
    },
    {
      society_id: sid,
      asset_code: "AST-LFT-01",
      name: "Otis V3F 8-Passenger Automatic Elevator #1",
      category: "HVAC_LIFTS",
      location_description: "Tower A Core",
      status: "ACTIVE",
      condition: "GOOD",
    },
  ]).select();
  console.log("Assets:", astRes.error ? astRes.error.message : `Inserted ${astRes.data.length}`);

  const invRes = await adminClient.from("inventory_items").insert({
    society_id: sid,
    item_code: "INV-ELEC-01",
    name: "40W LED Batten Tubelights (Cool White)",
    category: "ELECTRICAL",
    unit_of_measure: "PIECES",
    opening_quantity: 100,
    current_quantity: 65,
    min_reorder_level: 20,
    unit_cost: 250,
  }).select();
  console.log("Inventory:", invRes.error ? invRes.error.message : `Inserted ${invRes.data.length}`);

  // 11. PMC
  const pmcRes = await adminClient.from("management_companies").insert({
    name: "Apex Integrated Facility Management Ltd.",
    code: "APEX-PMC-UAT",
    contact_email: "support@apexpmc.internal",
    contact_phone: "+91 22 4455 6677",
    status: "ACTIVE",
  }).select().single();
  console.log("PMC:", pmcRes.error ? pmcRes.error.message : `ID ${pmcRes.data.id}`);

  if (pmcRes.data) {
    const pmcSocRes = await adminClient.from("management_company_societies").insert({
      management_company_id: pmcRes.data.id,
      society_id: sid,
      status: "ACTIVE",
    }).select();
    console.log("PMC Society:", pmcSocRes.error ? pmcSocRes.error.message : `Inserted ${pmcSocRes.data.length}`);
  }
}

testAllRemaining().catch(console.error);

