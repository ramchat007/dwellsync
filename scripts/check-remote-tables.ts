import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkExistingTables() {
  const financeTables = [
    "financial_years",
    "chart_of_accounts",
    "journal_entries",
    "journal_line_items",
    "general_ledger",
    "unit_charge_overrides",
    "bank_accounts",
    "bank_transactions",
    "payment_reconciliations",
    "budget_headers",
    "budget_line_items",
    "fixed_deposit_register",
    "financial_audit_log",
  ];

  const docTables = [
    "society_documents",
    "document_folders",
    "document_categories",
    "document_versions",
    "document_entity_links",
    "document_access_logs",
    "document_review_requests",
  ];

  const assetTables = [
    "assets",
    "asset_maintenance_records",
    "inventory_items",
    "inventory_stock_movements",
  ];

  console.log("=== Checking Remote Supabase Database State ===");
  console.log("Connected to:", supabaseUrl);

  const checkList = async (category: string, tables: string[]) => {
    console.log(`\n--- ${category} Tables ---`);
    for (const t of tables) {
      const { data, error } = await client.from(t).select("*").limit(0);
      if (!error) {
        console.log(`  ✓ ${t} exists`);
      } else {
        console.log(`  ✗ ${t} NOT FOUND: ${error.message} (${error.code})`);
      }
    }
  };

  await checkList("Finance", financeTables);
  await checkList("Document Management", docTables);
  await checkList("Assets & Inventory", assetTables);
}

checkExistingTables().catch(console.error);
