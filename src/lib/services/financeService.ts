import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendNotification } from "@/lib/services/notificationService";
import {
  ChartOfAccount,
  FinancialYear,
  FinancialPeriod,
  SocietyBankAccount,
  JournalEntry,
  JournalLine,
  ExpenseVoucher,
  BankReconciliation,
  FinancialReport,
  AccountType,
  AccountCategory,
} from "@/lib/types/database";

// ==========================================
// 1. CHART OF ACCOUNTS (COA)
// ==========================================

export const DEFAULT_STANDARD_COA: Array<{
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  description: string;
  is_system: boolean;
}> = [
  // Assets
  { code: "1010", name: "Cash in Hand / Petty Cash", type: "ASSET", category: "CASH", description: "Society cash box and petty cash float", is_system: true },
  { code: "1020", name: "Operating Bank Account", type: "ASSET", category: "BANK", description: "Primary operational bank account for collections & payouts", is_system: true },
  { code: "1030", name: "Sinking Fund Bank Account", type: "ASSET", category: "BANK", description: "Designated bank account for statutory sinking reserve", is_system: true },
  { code: "1110", name: "Accounts Receivable - Maintenance", type: "ASSET", category: "CURRENT_ASSET", description: "Dues receivable from flat residents", is_system: true },
  { code: "1120", name: "Other Receivables & Advances", type: "ASSET", category: "CURRENT_ASSET", description: "Vendor advances, deposits, and sundry receivables", is_system: false },
  { code: "1510", name: "Society Fixed Assets & Infrastructure", type: "ASSET", category: "FIXED_ASSET", description: "Clubhouse, pumps, generators, solar plant, gym equipment", is_system: false },

  // Liabilities
  { code: "2010", name: "Accounts Payable / Vendor Liabilities", type: "LIABILITY", category: "CURRENT_LIABILITY", description: "Outstanding unpaid bills to service vendors", is_system: true },
  { code: "2020", name: "Advance Maintenance Received", type: "LIABILITY", category: "CURRENT_LIABILITY", description: "Advance dues paid by residents prior to billing", is_system: true },
  { code: "2030", name: "Statutory Dues Payable (GST / TDS)", type: "LIABILITY", category: "CURRENT_LIABILITY", description: "Statutory tax liabilities pending remittance", is_system: false },
  { code: "2040", name: "Security Deposits from Contractors", type: "LIABILITY", category: "CURRENT_LIABILITY", description: "Security deposits held from vendors and tenants", is_system: false },

  // Equity / Reserves
  { code: "3010", name: "Sinking Fund Reserve", type: "EQUITY", category: "RESERVE_FUND", description: "Statutory sinking fund for structural reconstruction", is_system: true },
  { code: "3020", name: "Major Repair & Replacement Reserve", type: "EQUITY", category: "RESERVE_FUND", description: "Reserve for painting, lift replacement, waterproofing", is_system: true },
  { code: "3030", name: "General Reserve Fund", type: "EQUITY", category: "RESERVE_FUND", description: "General community surplus and reserves", is_system: true },
  { code: "3040", name: "Accumulated Surplus / (Deficit)", type: "EQUITY", category: "RESERVE_FUND", description: "Net surplus or deficit carried forward from operations", is_system: true },

  // Income
  { code: "4010", name: "Maintenance Charges Income", type: "INCOME", category: "OPERATING_INCOME", description: "Regular monthly maintenance billed to flats", is_system: true },
  { code: "4020", name: "Sinking Fund Contributions", type: "INCOME", category: "OPERATING_INCOME", description: "Sinking fund billed to flats", is_system: true },
  { code: "4030", name: "Parking Slot Charges", type: "INCOME", category: "OPERATING_INCOME", description: "Stilt / open parking slot fees", is_system: false },
  { code: "4040", name: "Non-Occupancy Charges", type: "INCOME", category: "OPERATING_INCOME", description: "Charges for rented/tenanted units per bylaws", is_system: false },
  { code: "4050", name: "Amenity & Clubhouse Fees", type: "INCOME", category: "OTHER_INCOME", description: "Booking fees for party hall, clubhouse, sports courts", is_system: false },
  { code: "4060", name: "Interest on Bank Deposits", type: "INCOME", category: "OTHER_INCOME", description: "Interest accrued on savings accounts and fixed deposits", is_system: false },
  { code: "4070", name: "Late Payment Penalties & Interest", type: "INCOME", category: "OTHER_INCOME", description: "Penal interest levied on overdue maintenance dues", is_system: false },
  { code: "4080", name: "Sundry Income & Transfer Fees", type: "INCOME", category: "OTHER_INCOME", description: "Flat transfer premiums, NOC fees, visitor vehicle charges", is_system: false },

  // Expenses
  { code: "5010", name: "Security Guard Services", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Monthly contract charges for security personnel", is_system: true },
  { code: "5020", name: "Housekeeping & Cleaning", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Common area sweeping, trash disposal, housekeeping staff", is_system: true },
  { code: "5030", name: "Common Electricity Charges", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Electricity bill for corridor lights, lifts, water pumps", is_system: true },
  { code: "5040", name: "Water Charges & Tankers", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Municipal water bill and external water tanker supplies", is_system: false },
  { code: "5050", name: "Lift Maintenance AMC", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Annual maintenance contracts for passenger & service lifts", is_system: false },
  { code: "5060", name: "Generator Fuel & AMC", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Diesel and maintenance for backup power generators", is_system: false },
  { code: "5070", name: "General Repairs & Maintenance", type: "EXPENSE", category: "OPERATING_EXPENSE", description: "Plumbing, electrical, intercom, CCTV repairs", is_system: false },
  { code: "5080", name: "Society Management & Software", type: "EXPENSE", category: "ADMINISTRATIVE_EXPENSE", description: "Accounting software, manager salary, office stationery", is_system: false },
  { code: "5090", name: "Audit & Legal Fees", type: "EXPENSE", category: "ADMINISTRATIVE_EXPENSE", description: "Statutory auditor remuneration and legal compliance costs", is_system: false },
  { code: "5100", name: "Property & Fire Insurance", type: "EXPENSE", category: "ADMINISTRATIVE_EXPENSE", description: "Annual building and asset insurance premiums", is_system: false },
  { code: "5110", name: "Bank & Payment Gateway Charges", type: "EXPENSE", category: "ADMINISTRATIVE_EXPENSE", description: "Online collection convenience fees and bank ledger charges", is_system: false },
];

export async function getChartOfAccounts(societyId: string): Promise<ChartOfAccount[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("chart_of_accounts")
    .select("*")
    .eq("society_id", societyId)
    .order("account_code", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch Chart of Accounts: ${error.message}`);
  }

  return (data || []) as ChartOfAccount[];
}

export async function seedDefaultChartOfAccounts(
  societyId: string,
  actorId?: string
): Promise<ChartOfAccount[]> {
  const adminClient = createAdminClient();
  const existing = await getChartOfAccounts(societyId);

  if (existing.length > 0) {
    return existing;
  }

  const recordsToInsert = DEFAULT_STANDARD_COA.map((item) => ({
    society_id: societyId,
    account_code: item.code,
    account_name: item.name,
    account_type: item.type,
    category: item.category,
    description: item.description,
    is_active: true,
    is_system: item.is_system,
  }));

  const { data, error } = await adminClient
    .from("chart_of_accounts")
    .insert(recordsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to seed Chart of Accounts: ${error.message}`);
  }

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "COA_SEEDED",
      resourceType: "chart_of_accounts",
      resourceId: societyId,
      metadata: { count: recordsToInsert.length },
    });
  }

  return (data || []) as ChartOfAccount[];
}

export async function createAccount(
  societyId: string,
  params: {
    account_code: string;
    account_name: string;
    account_type: AccountType;
    category: AccountCategory;
    parent_account_id?: string | null;
    description?: string | null;
  },
  actorId?: string
): Promise<ChartOfAccount> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("chart_of_accounts")
    .insert({
      society_id: societyId,
      ...params,
      is_active: true,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create account: ${error.message}`);
  }

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "COA_ACCOUNT_CREATED",
      resourceType: "chart_of_accounts",
      resourceId: data.id,
      metadata: { code: params.account_code, name: params.account_name },
    });
  }

  return data as ChartOfAccount;
}

// ==========================================
// 2. FINANCIAL YEARS & PERIODS
// ==========================================

export async function getFinancialYears(societyId: string): Promise<FinancialYear[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("financial_years")
    .select("*")
    .eq("society_id", societyId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as FinancialYear[];
}

export async function createFinancialYear(
  societyId: string,
  params: {
    name: string;
    start_date: string;
    end_date: string;
    is_current?: boolean;
  },
  actorId?: string
): Promise<{ year: FinancialYear; periods: FinancialPeriod[] }> {
  const adminClient = createAdminClient();

  // If marked current, unset current on other years
  if (params.is_current) {
    await adminClient
      .from("financial_years")
      .update({ is_current: false })
      .eq("society_id", societyId);
  }

  const { data: year, error: yearErr } = await adminClient
    .from("financial_years")
    .insert({
      society_id: societyId,
      name: params.name,
      start_date: params.start_date,
      end_date: params.end_date,
      is_current: params.is_current ?? true,
      is_closed: false,
    })
    .select()
    .single();

  if (yearErr || !year) {
    throw new Error(`Failed to create financial year: ${yearErr?.message}`);
  }

  // Auto-generate 12 monthly financial periods
  const periodsToInsert: any[] = [];
  const start = new Date(params.start_date);

  for (let i = 1; i <= 12; i++) {
    const pStart = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
    const pEnd = new Date(start.getFullYear(), start.getMonth() + i, 0); // Last day of month
    const pName = pStart.toLocaleString("default", { month: "long", year: "numeric" });

    periodsToInsert.push({
      society_id: societyId,
      financial_year_id: year.id,
      period_number: i,
      name: pName,
      start_date: pStart.toISOString().slice(0, 10),
      end_date: pEnd.toISOString().slice(0, 10),
      status: "OPEN",
    });
  }

  const { data: periods, error: periodsErr } = await adminClient
    .from("financial_periods")
    .insert(periodsToInsert)
    .select();

  if (periodsErr) {
    console.error("Failed to generate financial periods:", periodsErr);
  }

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "FINANCIAL_YEAR_CREATED",
      resourceType: "financial_year",
      resourceId: year.id,
      metadata: { name: year.name, periods_count: periodsToInsert.length },
    });
  }

  return {
    year: year as FinancialYear,
    periods: (periods || []) as FinancialPeriod[],
  };
}

export async function getFinancialPeriods(societyId: string, yearId?: string): Promise<FinancialPeriod[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("financial_periods")
    .select("*, financial_year:financial_years(name, is_current)")
    .eq("society_id", societyId)
    .order("period_number", { ascending: true });

  if (yearId) {
    query = query.eq("financial_year_id", yearId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as FinancialPeriod[];
}

export async function lockFinancialPeriod(
  societyId: string,
  periodId: string,
  lockReason: string,
  actorId?: string
): Promise<FinancialPeriod> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("financial_periods")
    .update({
      status: "LOCKED",
      locked_at: new Date().toISOString(),
      locked_by: actorId || null,
      lock_reason: lockReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to lock period: ${error.message}`);

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "FINANCIAL_PERIOD_LOCKED",
      resourceType: "financial_period",
      resourceId: periodId,
      metadata: { lock_reason: lockReason, period_name: data.name },
    });
  }

  return data as FinancialPeriod;
}

export async function unlockFinancialPeriod(
  societyId: string,
  periodId: string,
  actorId?: string
): Promise<FinancialPeriod> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("financial_periods")
    .update({
      status: "OPEN",
      locked_at: null,
      locked_by: null,
      lock_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to unlock period: ${error.message}`);

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "FINANCIAL_PERIOD_UNLOCKED",
      resourceType: "financial_period",
      resourceId: periodId,
      metadata: { period_name: data.name },
    });
  }

  return data as FinancialPeriod;
}

// ==========================================
// 3. DOUBLE-ENTRY JOURNAL & GENERAL LEDGER
// ==========================================

export async function generateJournalEntryNumber(societyId: string, date: string): Promise<string> {
  const yearStr = date ? date.slice(0, 4) : new Date().getFullYear().toString();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const adminClient = createAdminClient();
  const { count } = await adminClient
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("society_id", societyId);

  const seq = String((count || 0) + 1).padStart(4, "0");
  return `JV-${yearStr}-${seq}-${rand}`;
}

export async function createJournalEntry(
  societyId: string,
  params: {
    entry_date: string;
    entry_type?: string;
    narration: string;
    is_backdated?: boolean;
    backdated_reason?: string | null;
    source_reference_type?: string | null;
    source_reference_id?: string | null;
    lines: Array<{
      account_id: string;
      debit_amount: number;
      credit_amount: number;
      description?: string | null;
      unit_id?: string | null;
    }>;
  },
  actorId?: string
): Promise<JournalEntry> {
  const adminClient = createAdminClient();

  // 1. Strict Balance Verification: Debit Total must equal Credit Total
  const totalDebit = params.lines.reduce((acc, l) => acc + Number(l.debit_amount || 0), 0);
  const totalCredit = params.lines.reduce((acc, l) => acc + Number(l.credit_amount || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Double-entry violation: Total Debits (₹${totalDebit}) does not equal Total Credits (₹${totalCredit})`);
  }

  // 2. Identify corresponding financial period & year
  const { data: period } = await adminClient
    .from("financial_periods")
    .select("id, financial_year_id, status, name")
    .eq("society_id", societyId)
    .lte("start_date", params.entry_date)
    .gte("end_date", params.entry_date)
    .maybeSingle();

  // 3. Period Lock Protection: Block standard entries into locked/closed periods
  if (period && (period.status === "LOCKED" || period.status === "CLOSED")) {
    const isAdjustment = params.entry_type === "ADJUSTMENT" || params.entry_type === "REVERSAL";
    if (!isAdjustment || !params.backdated_reason) {
      throw new Error(`Financial period '${period.name}' is ${period.status}. Standard postings are prohibited. Adjustments require an authorized reason.`);
    }
  }

  // 4. Back-dated Entry Control: Mandatory justification if entry is in the past
  const isBackdated = params.is_backdated || (period && period.status !== "OPEN");
  if (isBackdated && (!params.backdated_reason || params.backdated_reason.trim().length < 3)) {
    throw new Error("A mandatory justification reason is required for back-dated journal entries.");
  }

  const entryNumber = await generateJournalEntryNumber(societyId, params.entry_date);

  // 5. Insert Header
  const { data: header, error: headerErr } = await adminClient
    .from("journal_entries")
    .insert({
      society_id: societyId,
      financial_year_id: period?.financial_year_id || null,
      financial_period_id: period?.id || null,
      entry_number: entryNumber,
      entry_date: params.entry_date,
      entry_type: params.entry_type || "STANDARD",
      narration: params.narration,
      status: "POSTED",
      is_backdated: !!isBackdated,
      backdated_reason: params.backdated_reason || null,
      source_reference_type: params.source_reference_type || null,
      source_reference_id: params.source_reference_id || null,
      total_debit: Math.round(totalDebit * 100) / 100,
      total_credit: Math.round(totalCredit * 100) / 100,
      created_by: actorId || null,
    })
    .select()
    .single();

  if (headerErr || !header) {
    throw new Error(`Failed to create journal entry: ${headerErr?.message}`);
  }

  // 6. Insert Lines
  const linesToInsert = params.lines.map((l, index) => ({
    society_id: societyId,
    journal_entry_id: header.id,
    account_id: l.account_id,
    line_number: index + 1,
    debit_amount: Math.round(Number(l.debit_amount || 0) * 100) / 100,
    credit_amount: Math.round(Number(l.credit_amount || 0) * 100) / 100,
    description: l.description || null,
    unit_id: l.unit_id || null,
  }));

  const { data: lines, error: linesErr } = await adminClient
    .from("journal_lines")
    .insert(linesToInsert)
    .select();

  if (linesErr) {
    // Rollback header on failure
    await adminClient.from("journal_entries").delete().eq("id", header.id);
    throw new Error(`Failed to insert journal lines: ${linesErr.message}`);
  }

  // 7. Audit Log
  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "JOURNAL_ENTRY_POSTED",
      resourceType: "journal_entry",
      resourceId: header.id,
      metadata: {
        entry_number: header.entry_number,
        total_amount: header.total_debit,
        is_backdated: header.is_backdated,
        entry_type: header.entry_type,
      },
    });
  }

  return {
    ...(header as JournalEntry),
    lines: (lines || []) as JournalLine[],
  };
}

export async function reverseJournalEntry(
  societyId: string,
  entryId: string,
  reason: string,
  actorId?: string
): Promise<JournalEntry> {
  const adminClient = createAdminClient();

  const { data: original, error: origErr } = await adminClient
    .from("journal_entries")
    .select("*, lines:journal_lines(*)")
    .eq("id", entryId)
    .eq("society_id", societyId)
    .single();

  if (origErr || !original) {
    throw new Error("Original journal entry not found");
  }

  if (original.status === "REVERSED") {
    throw new Error("This journal entry has already been reversed");
  }

  // Create inverted lines: swap debits and credits
  const reversedLines = (original.lines || []).map((l: any) => ({
    account_id: l.account_id,
    debit_amount: Number(l.credit_amount || 0),
    credit_amount: Number(l.debit_amount || 0),
    description: `Reversal of ${original.entry_number}: ${l.description || ""}`,
    unit_id: l.unit_id,
  }));

  const reversalEntry = await createJournalEntry(
    societyId,
    {
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: "REVERSAL",
      narration: `Reversal of ${original.entry_number}. Reason: ${reason}`,
      is_backdated: false,
      source_reference_type: "JOURNAL_ENTRY",
      source_reference_id: original.id,
      lines: reversedLines,
    },
    actorId
  );

  // Mark original entry as REVERSED
  await adminClient
    .from("journal_entries")
    .update({ status: "REVERSED", updated_at: new Date().toISOString() })
    .eq("id", original.id);

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "JOURNAL_ENTRY_REVERSED",
      resourceType: "journal_entry",
      resourceId: original.id,
      metadata: {
        original_entry: original.entry_number,
        reversal_entry: reversalEntry.entry_number,
        reason,
      },
    });
  }

  return reversalEntry;
}

export async function getJournalEntries(
  societyId: string,
  options?: { limit?: number; periodId?: string }
): Promise<JournalEntry[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("journal_entries")
    .select("*, lines:journal_lines(*, account:chart_of_accounts(account_code, account_name))")
    .eq("society_id", societyId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.periodId) {
    query = query.eq("financial_period_id", options.periodId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as JournalEntry[];
}

export async function getGeneralLedger(
  societyId: string,
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  account: ChartOfAccount;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: Array<{
    id: string;
    entryDate: string;
    entryNumber: string;
    narration: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }>;
}> {
  const adminClient = createAdminClient();

  const { data: account, error: accErr } = await adminClient
    .from("chart_of_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("society_id", societyId)
    .single();

  if (accErr || !account) {
    throw new Error("Chart of accounts ledger not found");
  }

  let query = adminClient
    .from("journal_lines")
    .select("id, debit_amount, credit_amount, description, journal_entry:journal_entries(id, entry_date, entry_number, narration, status)")
    .eq("society_id", societyId)
    .eq("account_id", accountId);

  if (startDate) {
    query = query.gte("journal_entry.entry_date", startDate);
  }
  if (endDate) {
    query = query.lte("journal_entry.entry_date", endDate);
  }

  const { data: lines, error: linesErr } = await query;
  if (linesErr) throw new Error(linesErr.message);

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const isDebitNormal = account.account_type === "ASSET" || account.account_type === "EXPENSE";

  const entries = (lines || [])
    .filter((l: any) => l.journal_entry && l.journal_entry.status === "POSTED")
    .sort((a: any, b: any) => a.journal_entry.entry_date.localeCompare(b.journal_entry.entry_date))
    .map((l: any) => {
      const debit = Number(l.debit_amount || 0);
      const credit = Number(l.credit_amount || 0);
      totalDebit += debit;
      totalCredit += credit;

      if (isDebitNormal) {
        running += debit - credit;
      } else {
        running += credit - debit;
      }

      return {
        id: l.id,
        entryDate: l.journal_entry.entry_date,
        entryNumber: l.journal_entry.entry_number,
        narration: l.journal_entry.narration,
        debit,
        credit,
        runningBalance: Math.round(running * 100) / 100,
      };
    });

  return {
    account: account as ChartOfAccount,
    openingBalance: 0,
    closingBalance: Math.round(running * 100) / 100,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    entries,
  };
}

// ==========================================
// 4. SOCIETY BANK ACCOUNTS & PETTY CASH
// ==========================================

export async function getSocietyBankAccounts(societyId: string): Promise<SocietyBankAccount[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_bank_accounts")
    .select("*, coa_account:chart_of_accounts(account_code, account_name)")
    .eq("society_id", societyId)
    .order("is_primary", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as SocietyBankAccount[];
}

export async function createBankAccount(
  societyId: string,
  params: {
    account_id: string;
    bank_name: string;
    account_number: string;
    account_type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT" | "CASH_CREDIT" | "PETTY_CASH";
    branch_name?: string | null;
    ifsc_code?: string | null;
    opening_balance?: number;
    is_primary?: boolean;
  },
  actorId?: string
): Promise<SocietyBankAccount> {
  const adminClient = createAdminClient();

  if (params.is_primary) {
    await adminClient
      .from("society_bank_accounts")
      .update({ is_primary: false })
      .eq("society_id", societyId);
  }

  const { data, error } = await adminClient
    .from("society_bank_accounts")
    .insert({
      society_id: societyId,
      ...params,
      current_balance: params.opening_balance || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create bank account: ${error.message}`);

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "BANK_ACCOUNT_CREATED",
      resourceType: "society_bank_account",
      resourceId: data.id,
      metadata: { bank_name: params.bank_name, account_number: params.account_number },
    });
  }

  return data as SocietyBankAccount;
}

// ==========================================
// 5. EXPENSE VOUCHERS
// ==========================================

export async function getExpenseVouchers(
  societyId: string,
  options?: { status?: string; limit?: number }
): Promise<ExpenseVoucher[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("expense_vouchers")
    .select("*, expense_account:chart_of_accounts!expense_vouchers_expense_account_id_fkey(account_name, account_code), paid_from_account:chart_of_accounts!expense_vouchers_paid_from_account_id_fkey(account_name, account_code)")
    .eq("society_id", societyId)
    .order("voucher_date", { ascending: false });

  if (options?.status) {
    query = query.eq("payment_status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as ExpenseVoucher[];
}

export async function createExpenseVoucher(
  societyId: string,
  params: {
    voucher_date: string;
    vendor_name: string;
    vendor_id?: string | null;
    expense_account_id: string;
    paid_from_account_id?: string | null;
    amount: number;
    payment_status?: "UNPAID" | "PAID" | "CANCELLED";
    payment_mode?: "CHEQUE" | "BANK_TRANSFER" | "UPI" | "CASH" | "CREDIT";
    reference_number?: string | null;
    description: string;
  },
  actorId?: string
): Promise<ExpenseVoucher> {
  const adminClient = createAdminClient();

  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const yearStr = params.voucher_date.slice(0, 4);
  const voucherNumber = `VCH-${yearStr}-${rand}`;

  // Insert voucher
  const { data: voucher, error: vchErr } = await adminClient
    .from("expense_vouchers")
    .insert({
      society_id: societyId,
      voucher_number: voucherNumber,
      ...params,
      payment_status: params.payment_status || "PAID",
      payment_mode: params.payment_mode || "BANK_TRANSFER",
      created_by: actorId || null,
    })
    .select()
    .single();

  if (vchErr || !voucher) {
    throw new Error(`Failed to create expense voucher: ${vchErr?.message}`);
  }

  // Auto-post double-entry accounting voucher:
  // Debit: Expense Account
  // Credit: Bank/Cash Account (or Accounts Payable if UNPAID)
  let creditAccountId = params.paid_from_account_id;

  if (!creditAccountId) {
    // If unpaid or not selected, resolve 2010 Accounts Payable
    const { data: apAcc } = await adminClient
      .from("chart_of_accounts")
      .select("id")
      .eq("society_id", societyId)
      .eq("account_code", "2010")
      .maybeSingle();

    creditAccountId = apAcc?.id || null;
  }

  if (creditAccountId) {
    await createJournalEntry(
      societyId,
      {
        entry_date: params.voucher_date,
        entry_type: "VENDOR_EXPENSE",
        narration: `Expense Voucher ${voucherNumber} paid to ${params.vendor_name}: ${params.description}`,
        source_reference_type: "EXPENSE_VOUCHER",
        source_reference_id: voucher.id,
        lines: [
          {
            account_id: params.expense_account_id,
            debit_amount: params.amount,
            credit_amount: 0,
            description: params.description,
          },
          {
            account_id: creditAccountId,
            debit_amount: 0,
            credit_amount: params.amount,
            description: `Payment for ${voucherNumber} (${params.vendor_name})`,
          },
        ],
      },
      actorId
    );
  }

  if (actorId) {
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: "EXPENSE_VOUCHER_CREATED",
      resourceType: "expense_voucher",
      resourceId: voucher.id,
      metadata: {
        voucher_number: voucher.voucher_number,
        amount: voucher.amount,
        vendor: voucher.vendor_name,
      },
    });
  }

  return voucher as ExpenseVoucher;
}

// ==========================================
// 6. FINANCIAL STATEMENTS & AUDITED REPORTS
// ==========================================

export async function generateTrialBalance(societyId: string, asOfDate?: string) {
  const adminClient = createAdminClient();
  const accounts = await getChartOfAccounts(societyId);

  let query = adminClient
    .from("journal_lines")
    .select("account_id, debit_amount, credit_amount, journal_entry:journal_entries(status, entry_date)")
    .eq("society_id", societyId);

  if (asOfDate) {
    query = query.lte("journal_entry.entry_date", asOfDate);
  }

  const { data: lines } = await query;

  const balances: Record<string, { debit: number; credit: number }> = {};
  (lines || [])
    .filter((l: any) => l.journal_entry && l.journal_entry.status === "POSTED")
    .forEach((l: any) => {
      const accId = l.account_id;
      if (!balances[accId]) {
        balances[accId] = { debit: 0, credit: 0 };
      }
      balances[accId].debit += Number(l.debit_amount || 0);
      balances[accId].credit += Number(l.credit_amount || 0);
    });

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = accounts.map((acc) => {
    const raw = balances[acc.id] || { debit: 0, credit: 0 };
    const diff = raw.debit - raw.credit;

    let netDebit = 0;
    let netCredit = 0;

    if (acc.account_type === "ASSET" || acc.account_type === "EXPENSE") {
      if (diff >= 0) netDebit = diff;
      else netCredit = -diff;
    } else {
      if (diff <= 0) netCredit = -diff;
      else netDebit = diff;
    }

    totalDebit += netDebit;
    totalCredit += netCredit;

    return {
      accountId: acc.id,
      code: acc.account_code,
      name: acc.account_name,
      type: acc.account_type,
      category: acc.category,
      debit: Math.round(netDebit * 100) / 100,
      credit: Math.round(netCredit * 100) / 100,
    };
  });

  return {
    asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
    rows,
  };
}

export const getTrialBalance = generateTrialBalance;

export async function generateIncomeAndExpenditure(societyId: string, financialYearId?: string) {
  const trial = await generateTrialBalance(societyId);

  const incomeRows = trial.rows.filter((r) => r.type === "INCOME");
  const expenseRows = trial.rows.filter((r) => r.type === "EXPENSE");

  const totalIncome = incomeRows.reduce((sum, r) => sum + r.credit, 0);
  const totalExpense = expenseRows.reduce((sum, r) => sum + r.debit, 0);
  const netSurplus = totalIncome - totalExpense;

  return {
    asOfDate: trial.asOfDate,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netSurplus: Math.round(netSurplus * 100) / 100,
    incomeRows,
    expenseRows,
  };
}

export async function generateBalanceSheet(societyId: string, asOfDate?: string) {
  const trial = await generateTrialBalance(societyId, asOfDate);
  const incExp = await generateIncomeAndExpenditure(societyId);

  const assetRows = trial.rows.filter((r) => r.type === "ASSET");
  const liabilityRows = trial.rows.filter((r) => r.type === "LIABILITY");
  const equityRows = trial.rows.filter((r) => r.type === "EQUITY");

  const totalAssets = assetRows.reduce((sum, r) => sum + r.debit - r.credit, 0);
  const totalLiabilities = liabilityRows.reduce((sum, r) => sum + r.credit - r.debit, 0);
  const totalEquity = equityRows.reduce((sum, r) => sum + r.credit - r.debit, 0);

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + incExp.netSurplus;

  return {
    asOfDate: trial.asOfDate,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    currentSurplus: incExp.netSurplus,
    totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05,
    assetRows,
    liabilityRows,
    equityRows,
  };
}

export async function publishFinancialReport(
  societyId: string,
  params: {
    reportType: string;
    title: string;
    notes?: string;
  },
  actorId: string
): Promise<FinancialReport> {
  const adminClient = createAdminClient();

  // Compute the live report payload
  let reportData: Record<string, unknown> = {};
  if (params.reportType === "BALANCE_SHEET") {
    reportData = await generateBalanceSheet(societyId);
  } else if (params.reportType === "INCOME_EXPENDITURE") {
    reportData = await generateIncomeAndExpenditure(societyId);
  } else {
    reportData = await generateTrialBalance(societyId);
  }

  // Create report record as PUBLISHED
  const { data: report, error } = await adminClient
    .from("financial_reports")
    .insert({
      society_id: societyId,
      report_type: params.reportType,
      title: params.title,
      report_data: reportData,
      status: "PUBLISHED",
      generated_by: actorId,
      approved_by: actorId,
      approved_at: new Date().toISOString(),
      published_by: actorId,
      published_at: new Date().toISOString(),
      published_notes: params.notes || null,
    })
    .select()
    .single();

  if (error || !report) {
    throw new Error(`Failed to publish financial report: ${error?.message}`);
  }

  // Single consolidated community notification per strictly specified notification policy
  // Fetch active society members
  const { data: members } = await adminClient
    .from("society_memberships")
    .select("user_id")
    .eq("society_id", societyId)
    .eq("status", "ACTIVE");

  const recipientUserIds = (members || []).map((m: any) => m.user_id).filter(Boolean);

  for (const userId of recipientUserIds) {
    try {
      await sendNotification({
        societyId,
        recipient: userId,
        channel: "IN_APP",
        template: "GENERAL_ANNOUNCEMENT",
        subject: `Official Financial Statement Published: ${params.title}`,
        data: {
          title: `Official Financial Statement Published: ${params.title}`,
          body: `The society managing committee has published an approved ${params.reportType.replace("_", " ")} report for resident inspection.`,
          actionUrl: `/resident/dues`,
        },
      });
    } catch (err) {
      console.error(`Failed to send report publication notice to ${userId}`, err);
    }
  }

  await recordAuditLog({
    actorUserId: actorId,
    societyId,
    action: "FINANCIAL_REPORT_PUBLISHED",
    resourceType: "financial_report",
    resourceId: report.id,
    metadata: {
      report_type: params.reportType,
      title: params.title,
      recipients_count: recipientUserIds.length,
    },
  });

  return report as FinancialReport;
}

