process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupHierarchy() {
  const societyId = "07ae6307-13cb-4d14-a547-27914536fc62";

  console.log("Checking building for SVAC01...");
  let { data: bldgs } = await client
    .from("buildings")
    .select("id")
    .eq("society_id", societyId)
    .eq("code", "BLDG-1");

  let bldgId = bldgs && bldgs.length > 0 ? bldgs[0].id : null;

  if (!bldgId) {
    const { data: bldg, error: bErr } = await client
      .from("buildings")
      .insert({
        society_id: societyId,
        name: "Building 1",
        code: "BLDG-1",
        number_of_floors: 7,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (bErr) {
      console.error("Building insert error:", bErr);
      return;
    }
    bldgId = bldg.id;
    console.log("Created Building 1:", bldgId);
  } else {
    console.log("Found Building 1:", bldgId);
  }

  // Check Wing B
  let { data: wings } = await client
    .from("wings")
    .select("id")
    .eq("society_id", societyId)
    .eq("code", "WING-B");

  let wingId = wings && wings.length > 0 ? wings[0].id : null;

  if (!wingId) {
    const { data: wing, error: wErr } = await client
      .from("wings")
      .insert({
        society_id: societyId,
        building_id: bldgId,
        name: "Wing B",
        code: "WING-B",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (wErr) {
      console.error("Wing insert error:", wErr);
      return;
    }
    wingId = wing.id;
    console.log("Created Wing B:", wingId);
  } else {
    console.log("Found Wing B:", wingId);
  }

  // Units
  const unitsToInsert = [];
  for (let f = 1; f <= 7; f++) {
    for (let u = 1; u <= 4; u++) {
      const uNum = `${f}0${u}`;
      unitsToInsert.push({
        society_id: societyId,
        building_id: bldgId,
        wing_id: wingId,
        unit_number: `B-${uNum}`,
        unit_type: "2_BHK",
        status: "VACANT",
      });
    }
  }

  const { data: createdUnits, error: uErr } = await client
    .from("units")
    .insert(unitsToInsert)
    .select();

  if (uErr) {
    console.error("Units insert error:", uErr);
    return;
  }

  console.log(`✓ Successfully seeded ${createdUnits?.length} units for SVAC01!`);
}

setupHierarchy().catch(console.error);

