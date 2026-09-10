import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runVerification() {
  console.log("================================================================================");
  console.log("DWELLSYNC REMEDIATED MIGRATION VERIFICATION SUITE");
  console.log("Remote Target:", supabaseUrl);
  console.log("================================================================================\n");

  const results: { category: string; test: string; status: "PASS" | "FAIL"; details?: string }[] = [];

  function record(category: string, test: string, pass: boolean, details?: string) {
    results.push({ category, test, status: pass ? "PASS" : "FAIL", details });
    const icon = pass ? "[PASS]" : "[FAIL]";
    console.log(`${icon} [${category}] ${test}${details ? ` -> ${details}` : ""}`);
  }

  // ---------------------------------------------------------------------------
  // 1. Fetch OpenAPI Definitions to inspect schema, columns, definitions
  // ---------------------------------------------------------------------------
  console.log("\n--- 1. PostgREST OpenAPI Introspection ---");
  const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
  const spec: any = await openapiRes.json();

  const expectedTables = {
    Finance: [
      "financial_years",
      "financial_periods",
      "chart_of_accounts",
      "account_opening_balances",
      "society_bank_accounts",
      "bank_transactions",
      "bank_reconciliations",
      "journal_entries",
      "journal_lines",
      "expense_vouchers",
      "receipts",
      "financial_reports",
      "unit_charge_overrides",
    ],
    DocumentManagement: [
      "documents",
      "document_folders",
      "document_versions",
      "document_entity_links",
    ],
    AssetsInventory: [
      "assets",
      "asset_maintenance_records",
      "inventory_items",
      "inventory_stock_movements",
    ],
  };

  // Check all Finance tables in definitions
  for (const table of expectedTables.Finance) {
    const existsInPaths = !!spec.paths[`/${table}`];
    const existsInDef = !!spec.definitions?.[table];
    record("Finance Tables", `Table '${table}' exists in API schema`, existsInPaths && existsInDef);
  }

  // Check all Document Management tables in definitions
  for (const table of expectedTables.DocumentManagement) {
    const existsInPaths = !!spec.paths[`/${table}`];
    const existsInDef = !!spec.definitions?.[table];
    record("Document Tables", `Table '${table}' exists in API schema`, existsInPaths && existsInDef);
  }

  // Check all Assets & Inventory tables in definitions
  for (const table of expectedTables.AssetsInventory) {
    const existsInPaths = !!spec.paths[`/${table}`];
    const existsInDef = !!spec.definitions?.[table];
    record("Assets & Inventory Tables", `Table '${table}' exists in API schema`, existsInPaths && existsInDef);
  }

  // ---------------------------------------------------------------------------
  // 2. Specific Column Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Key Column & Structure Verification ---");

  // Verify document_entity_links columns
  const docEntityProps = spec.definitions?.["document_entity_links"]?.properties || {};
  const docEntityCols = Object.keys(docEntityProps);
  const requiredDocEntityCols = ["id", "society_id", "document_id", "entity_type", "entity_id", "relationship_type", "notes", "linked_by", "created_at"];
  const hasAllDocEntityCols = requiredDocEntityCols.every(col => docEntityCols.includes(col));
  record("Document Schema", "document_entity_links has all expected columns", hasAllDocEntityCols, `Columns: ${docEntityCols.join(", ")}`);

  // Verify assets columns
  const assetProps = spec.definitions?.["assets"]?.properties || {};
  const assetCols = Object.keys(assetProps);
  const requiredAssetCols = ["id", "society_id", "asset_code", "name", "category", "subcategory", "status", "condition", "purchase_cost", "purchase_date", "expense_voucher_id", "created_at"];
  const hasAllAssetCols = requiredAssetCols.every(col => assetCols.includes(col));
  record("Assets Schema", "assets has all required columns including expense_voucher_id", hasAllAssetCols, `Columns: ${assetCols.join(", ")}`);

  // Verify asset_maintenance_records columns
  const maintProps = spec.definitions?.["asset_maintenance_records"]?.properties || {};
  const maintCols = Object.keys(maintProps);
  record("Assets Schema", "asset_maintenance_records columns verified", maintCols.includes("asset_id") && maintCols.includes("maintenance_type"));

  // Verify inventory_items & inventory_stock_movements columns
  const invProps = spec.definitions?.["inventory_items"]?.properties || {};
  const stockProps = spec.definitions?.["inventory_stock_movements"]?.properties || {};
  record("Inventory Schema", "inventory_items and stock_movements columns verified",
    Object.keys(invProps).includes("item_code") && Object.keys(stockProps).includes("movement_type")
  );

  // Verify unit_charge_overrides columns
  const overrideProps = spec.definitions?.["unit_charge_overrides"]?.properties || {};
  const overrideCols = Object.keys(overrideProps);
  record("Finance Schema", "unit_charge_overrides columns verified", overrideCols.includes("override_type") && overrideCols.includes("amount"));

  // Verify journal_lines columns
  const journalLineProps = spec.definitions?.["journal_lines"]?.properties || {};
  const journalLineCols = Object.keys(journalLineProps);
  record("Finance Schema", "journal_lines columns verified", journalLineCols.includes("journal_entry_id") && journalLineCols.includes("account_id") && journalLineCols.includes("debit_amount") && journalLineCols.includes("credit_amount"));

  // ---------------------------------------------------------------------------
  // 3. Foreign Key / Dependency Verification via Query
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Foreign Key & Cross-Module Dependency Verification ---");

  // Check society exists
  const { data: societies, error: socErr } = await adminClient
    .from("societies")
    .select("id, name, code")
    .limit(5);

  if (socErr || !societies || societies.length === 0) {
    record("Dependencies", "Find existing test society", false, socErr?.message);
    return;
  }
  const testSociety = societies[0];
  record("Dependencies", `Found test society '${testSociety.name}' (${testSociety.code})`, true, `ID: ${testSociety.id}`);

  // Test admin query on each new table with limit 1
  const allTables = [
    ...expectedTables.Finance,
    ...expectedTables.DocumentManagement,
    ...expectedTables.AssetsInventory,
  ];

  for (const table of allTables) {
    const { error } = await adminClient.from(table).select("*").eq("society_id", testSociety.id).limit(1);
    record("Table Query Test", `Admin client query table '${table}'`, !error, error ? error.message : "Query executed successfully");
  }

  // ---------------------------------------------------------------------------
  // 4. RLS & Tenant Isolation Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. RLS & Tenant Isolation Verification ---");

  // An unauthenticated (anon) client MUST NOT be able to view private tenant records
  const sampleTables = [
    "chart_of_accounts",
    "society_bank_accounts",
    "expense_vouchers",
    "unit_charge_overrides",
    "documents",
    "document_folders",
    "document_entity_links",
    "assets",
    "inventory_items",
  ];

  for (const table of sampleTables) {
    const { data: anonData, error: anonErr } = await anonClient.from(table).select("*").limit(5);
    // Anon query should return empty array [] because RLS blocks access, or an auth error
    const blocked = (!anonData || anonData.length === 0) || !!anonErr;
    record("RLS Enforcement", `Anon access blocked on '${table}'`, blocked, anonErr ? `Blocked with code: ${anonErr.code}` : `Returned 0 rows (RLS filtered)`);
  }

  // ---------------------------------------------------------------------------
  // 5. Existing Production Data Integrity Check
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Existing Production Data Integrity Check ---");

  // Storage bucket check
  const { data: buckets, error: bucketErr } = await adminClient.storage.listBuckets();
  const hasDocBucket = buckets?.some(b => b.id === "society-documents" || b.name === "society-documents");
  record("Storage Bucket", "Private bucket 'society-documents' exists", !!hasDocBucket, hasDocBucket ? "Found private bucket" : (bucketErr?.message || "Not found"));

  const coreTables = [
    "societies",
    "profiles",
    "units",
    "buildings",
    "invoices",
    "complaints",
    "handover_projects",
    "handover_checklist_items",
    "handover_defects",
  ];

  for (const table of coreTables) {
    const { count, error } = await adminClient.from(table).select("*", { count: "exact", head: true });
    if (error) {
      record("Data Integrity", `Core table '${table}' accessible`, false, error.message);
    } else {
      record("Data Integrity", `Core table '${table}' preserved`, true, `Current row count: ${count}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Check unit_owners.user_id and unit_occupancies schema
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. unit_owners and unit_occupancies Verification ---");
  const unitOwnerProps = spec.definitions?.["unit_owners"]?.properties || {};
  record("Schema Integrity", "unit_owners has 'user_id' column", "user_id" in unitOwnerProps, `Cols: ${Object.keys(unitOwnerProps).join(", ")}`);

  const unitOccupancyProps = spec.definitions?.["unit_occupancies"]?.properties || {};
  record("Schema Integrity", "unit_occupancies has 'status' and 'user_id' columns", "status" in unitOccupancyProps && "user_id" in unitOccupancyProps, `Cols: ${Object.keys(unitOccupancyProps).join(", ")}`);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`VERIFICATION COMPLETE: ${passed}/${total} checks PASSED (${failed} failures)`);
  console.log("================================================================================");
}

runVerification().catch(console.error);
