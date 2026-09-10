"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChartOfAccount,
  FinancialYear,
  SocietyBankAccount,
  ExpenseVoucher,
  JournalEntry,
  RoleId,
  Society,
} from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DoorOpen,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  Lock,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Unlock,
  Users,
  X,
} from "lucide-react";

interface FinanceHubClientProps {
  societyId: string;
  society: Society | null;
  userRole: RoleId;
  userId: string;
  initialCoa: ChartOfAccount[];
  initialFinancialYears: FinancialYear[];
  initialBankAccounts: SocietyBankAccount[];
  initialExpenseVouchers: ExpenseVoucher[];
  initialJournalEntries: JournalEntry[];
  initialTrialBalance: {
    as_of_date: string;
    rows: Array<{
      account_id: string;
      account_code: string;
      account_name: string;
      account_type: string;
      category: string;
      debit: number;
      credit: number;
    }>;
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
  };
}

type FinanceTab =
  | "OVERVIEW"
  | "COA"
  | "JOURNAL"
  | "LEDGER"
  | "BANK_CASH"
  | "EXPENSES"
  | "PERIODS";

export function FinanceHubClient({
  societyId,
  society,
  userRole,
  userId,
  initialCoa,
  initialFinancialYears,
  initialBankAccounts,
  initialExpenseVouchers,
  initialJournalEntries,
  initialTrialBalance,
}: FinanceHubClientProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>("OVERVIEW");
  const [coa, setCoa] = useState<ChartOfAccount[]>(initialCoa);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(initialFinancialYears);
  const [bankAccounts, setBankAccounts] = useState<SocietyBankAccount[]>(initialBankAccounts);
  const [expenseVouchers, setExpenseVouchers] = useState<ExpenseVoucher[]>(initialExpenseVouchers);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournalEntries);
  const [trialBalance, setTrialBalance] = useState(initialTrialBalance);

  // General Ledger state
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>(
    initialCoa[0]?.account_code || "1010"
  );
  const [ledgerData, setLedgerData] = useState<{
    account: ChartOfAccount | null;
    opening_balance: number;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
    entries: Array<{
      entry_id: string;
      entry_number: string;
      entry_date: string;
      narration: string;
      reference_number?: string;
      debit: number;
      credit: number;
      running_balance: number;
    }>;
  } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Financial statements state
  const [statementType, setStatementType] = useState<"TRIAL_BALANCE" | "INCOME_EXPENDITURE" | "BALANCE_SHEET">("TRIAL_BALANCE");
  const [incomeExpenditure, setIncomeExpenditure] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Modal States
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isPeriodLockModalOpen, setIsPeriodLockModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Action status / errors
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Journal form state
  const [journalForm, setJournalForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    narration: "",
    reference_number: "",
    backdated_reason: "",
    lines: [
      { account_id: initialCoa[0]?.id || "", debit: 0, credit: 0, description: "" },
      { account_id: initialCoa[1]?.id || "", debit: 0, credit: 0, description: "" },
    ],
  });

  // Reversal target
  const [targetReverseEntry, setTargetReverseEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Period lock target
  const [targetPeriod, setTargetPeriod] = useState<{ id: string; name: string; current_status: string } | null>(null);
  const [periodNewStatus, setPeriodNewStatus] = useState<"LOCKED" | "CLOSED" | "OPEN">("LOCKED");
  const [periodLockReason, setPeriodLockReason] = useState("");

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    voucher_number: `EV-${Date.now().toString().slice(-6)}`,
    voucher_date: new Date().toISOString().split("T")[0],
    payee_name: "",
    expense_account_id: initialCoa.find((c) => c.account_type === "EXPENSE")?.id || "",
    paid_from_account_id: initialCoa.find((c) => c.category === "BANK" || c.category === "CASH")?.id || "",
    amount: 0,
    tax_amount: 0,
    tds_amount: 0,
    invoice_reference: "",
    narration: "",
  });

  // Bank account form state
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_number: "",
    account_type: "OPERATING" as "OPERATING" | "SINKING_FUND" | "FIXED_DEPOSIT" | "PETTY_CASH",
    branch_name: "",
    ifsc_code: "",
    opening_balance: 0,
    opening_balance_date: new Date().toISOString().split("T")[0],
  });

  // COA form state
  const [coaForm, setCoaForm] = useState({
    account_code: "",
    account_name: "",
    account_type: "EXPENSE" as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
    category: "OPERATING_EXPENSE" as any,
    description: "",
  });

  // Year form state
  const [yearForm, setYearForm] = useState({
    name: `FY ${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
    start_date: `${new Date().getFullYear()}-04-01`,
    end_date: `${new Date().getFullYear() + 1}-03-31`,
  });

  // Publish report form
  const [publishForm, setPublishForm] = useState({
    report_type: "INCOME_EXPENDITURE" as "BALANCE_SHEET" | "INCOME_EXPENDITURE" | "TRIAL_BALANCE",
    notes: "",
    confirmConsolidatedNotice: true,
  });

  const canManage = ["SUPER_ADMIN", "SOCIETY_ADMIN", "TREASURER"].includes(userRole);
  const canPublish = ["SUPER_ADMIN", "SOCIETY_ADMIN", "TREASURER"].includes(userRole);

  // Journal line calculations
  const totalDebit = journalForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = journalForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  // Refresh functions
  const fetchLedger = async (accountCode: string) => {
    try {
      setLedgerLoading(true);
      const res = await fetch(`/api/society/${societyId}/finance/ledger?account_code=${accountCode}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const fetchStatements = async (type: "TRIAL_BALANCE" | "INCOME_EXPENDITURE" | "BALANCE_SHEET") => {
    try {
      setStatementLoading(true);
      const res = await fetch(`/api/society/${societyId}/finance/reports?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "TRIAL_BALANCE") setTrialBalance(data.data);
        if (type === "INCOME_EXPENDITURE") setIncomeExpenditure(data.data);
        if (type === "BALANCE_SHEET") setBalanceSheet(data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setStatementLoading(false);
    }
  };

  // Submit handlers
  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) {
      setActionError("Journal entry is not balanced. Total Debits must equal Total Credits.");
      return;
    }
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/society/${societyId}/finance/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journalForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post journal entry");
      }
      setActionSuccess(`Journal Entry ${data.data.entry_number} posted successfully.`);
      setIsJournalModalOpen(false);
      // Reload entries
      const entriesRes = await fetch(`/api/society/${societyId}/finance/journal`);
      if (entriesRes.ok) {
        const d = await entriesRes.json();
        setJournalEntries(d.data);
      }
      // Reload statements
      fetchStatements("TRIAL_BALANCE");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReverseEntry || !reversalReason) return;
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(
        `/api/society/${societyId}/finance/journal/${targetReverseEntry.id}/reverse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reversal_reason: reversalReason }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reverse journal entry");
      }
      setActionSuccess(`Reversal entry ${data.data.reversal_entry.entry_number} created.`);
      setIsReverseModalOpen(false);
      setTargetReverseEntry(null);
      setReversalReason("");
      // Refresh
      const entriesRes = await fetch(`/api/society/${societyId}/finance/journal`);
      if (entriesRes.ok) {
        const d = await entriesRes.json();
        setJournalEntries(d.data);
      }
      fetchStatements("TRIAL_BALANCE");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/society/${societyId}/finance/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record expense voucher");
      }
      setActionSuccess(`Expense voucher ${data.data.voucher_number} recorded & journal posted.`);
      setIsExpenseModalOpen(false);
      // Reload expenses
      const expRes = await fetch(`/api/society/${societyId}/finance/expenses`);
      if (expRes.ok) {
        const d = await expRes.json();
        setExpenseVouchers(d.data);
      }
      fetchStatements("TRIAL_BALANCE");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/society/${societyId}/finance/bank-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create bank account");
      }
      setActionSuccess(`Account ${data.data.bank_name} added successfully.`);
      setIsBankModalOpen(false);
      // Reload bank accounts
      const bRes = await fetch(`/api/society/${societyId}/finance/bank-accounts`);
      if (bRes.ok) {
        const d = await bRes.json();
        setBankAccounts(d.data);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/society/${societyId}/finance/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coaForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account in COA");
      }
      setActionSuccess(`Account ${data.data.account_code} - ${data.data.account_name} created.`);
      setIsCoaModalOpen(false);
      // Reload COA
      const coaRes = await fetch(`/api/society/${societyId}/finance/accounts`);
      if (coaRes.ok) {
        const d = await coaRes.json();
        setCoa(d.data);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPeriod) return;
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await fetch(`/api/society/${societyId}/finance/periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_id: targetPeriod.id,
          status: periodNewStatus,
          reason: periodLockReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update period status");
      }
      setActionSuccess(`Period status updated to ${periodNewStatus}.`);
      setIsPeriodLockModalOpen(false);
      setTargetPeriod(null);
      setPeriodLockReason("");
      // Reload periods
      const pRes = await fetch(`/api/society/${societyId}/finance/periods`);
      if (pRes.ok) {
        const d = await pRes.json();
        setFinancialYears(d.data);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      const currentYear = financialYears.find((y) => y.is_current) || financialYears[0];
      const res = await fetch(`/api/society/${societyId}/finance/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_year_id: currentYear?.id,
          report_type: publishForm.report_type,
          title: `Annual Statement — ${publishForm.report_type.replace("_", " ")} (${currentYear?.name || "Current Year"})`,
          notes: publishForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish report");
      }
      setActionSuccess(
        `Financial statement formally published. A single consolidated notification was sent to verified members.`
      );
      setIsPublishModalOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Alert Banners */}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="success" className="font-mono text-[10px] px-2.5 py-0.5">
              DOUBLE-ENTRY GENERAL LEDGER
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society Finance"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-400" />
            Treasury & Accounting Hub
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Chart of Accounts (1010–5110), balanced journal entries, vendor payables, bank accounts,
            financial period locking, and statutory balance sheet generation.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsJournalModalOpen(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Journal Voucher</span>
            </Button>
            <Button
              onClick={() => setIsExpenseModalOpen(true)}
              size="sm"
              variant="secondary"
              className="text-xs font-semibold gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Record Expense</span>
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Bank Accounts</div>
              <div className="text-base font-bold text-slate-900">{bankAccounts.length} Registered</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">COA Accounts</div>
              <div className="text-base font-bold text-slate-900">{coa.length} Heads</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Journal Entries</div>
              <div className="text-base font-bold text-slate-900">{journalEntries.length} Vouchers</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active Year</div>
              <div className="text-base font-bold text-slate-900 truncate">
                {financialYears.find((y) => y.is_current)?.name || "Not Initialized"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto text-xs font-medium scrollbar-none">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "OVERVIEW"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Statements & Reports</span>
        </button>

        <button
          onClick={() => setActiveTab("COA")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "COA"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Chart of Accounts</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0">{coa.length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab("JOURNAL")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "JOURNAL"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Journal Vouchers</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0">{journalEntries.length}</Badge>
        </button>

        <button
          onClick={() => {
            setActiveTab("LEDGER");
            if (!ledgerData) fetchLedger(selectedLedgerAccount);
          }}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "LEDGER"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>General Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("BANK_CASH")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "BANK_CASH"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bank & Petty Cash</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0">{bankAccounts.length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "EXPENSES"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expense Vouchers</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0">{expenseVouchers.length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab("PERIODS")}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === "PERIODS"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Financial Periods & Controls</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATEMENTS */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Statement:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                {(["TRIAL_BALANCE", "INCOME_EXPENDITURE", "BALANCE_SHEET"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setStatementType(type);
                      fetchStatements(type);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      statementType === type
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {canPublish && (
              <Button
                onClick={() => setIsPublishModalOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Publish Statement to Members</span>
              </Button>
            )}
          </div>

          {/* Trial Balance View */}
          {statementType === "TRIAL_BALANCE" && (
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Trial Balance</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    As of {trialBalance.as_of_date || new Date().toISOString().split("T")[0]}
                  </CardDescription>
                </div>
                <Badge variant={trialBalance.is_balanced ? "success" : "destructive"}>
                  {trialBalance.is_balanced ? "Balanced (Debits = Credits)" : "Unbalanced"}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4">Account Name</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-4 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {trialBalance.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                            No journal transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        trialBalance.rows.map((r) => (
                          <tr key={r.account_id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-4 font-bold text-slate-700">{r.account_code}</td>
                            <td className="py-2 px-4 font-sans font-medium text-slate-900">{r.account_name}</td>
                            <td className="py-2 px-4 font-sans text-slate-500">
                              <Badge variant="outline" className="text-[10px] font-normal">{r.account_type}</Badge>
                            </td>
                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">
                              {r.debit > 0 ? r.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                            </td>
                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">
                              {r.credit > 0 ? r.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td colSpan={3} className="py-3 px-4 text-slate-800 font-sans">
                          Total General Ledger Balances
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          ₹{trialBalance.total_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          ₹{trialBalance.total_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Income & Expenditure View */}
          {statementType === "INCOME_EXPENDITURE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-emerald-800">Income / Revenues</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs font-mono">
                  {incomeExpenditure?.income_items?.length === 0 || !incomeExpenditure ? (
                    <div className="text-slate-400 py-6 text-center font-sans">No income recorded for this period.</div>
                  ) : (
                    incomeExpenditure.income_items.map((item: any) => (
                      <div key={item.account_code} className="flex justify-between py-1 border-b border-slate-50">
                        <span className="font-sans text-slate-700">{item.account_code} — {item.account_name}</span>
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-3 font-bold border-t border-slate-200 text-emerald-700 text-sm">
                    <span className="font-sans">Total Operating Income:</span>
                    <span>₹{(incomeExpenditure?.total_income || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-rose-800">Expenditure / Expenses</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs font-mono">
                  {incomeExpenditure?.expense_items?.length === 0 || !incomeExpenditure ? (
                    <div className="text-slate-400 py-6 text-center font-sans">No expenses recorded for this period.</div>
                  ) : (
                    incomeExpenditure.expense_items.map((item: any) => (
                      <div key={item.account_code} className="flex justify-between py-1 border-b border-slate-50">
                        <span className="font-sans text-slate-700">{item.account_code} — {item.account_name}</span>
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-3 font-bold border-t border-slate-200 text-rose-700 text-sm">
                    <span className="font-sans">Total Expenses:</span>
                    <span>₹{(incomeExpenditure?.total_expense || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-900 font-bold text-sm bg-slate-50 p-2 rounded-lg mt-2">
                    <span className="font-sans">Net Operating Surplus / (Deficit):</span>
                    <span className={(incomeExpenditure?.net_surplus || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      ₹{(incomeExpenditure?.net_surplus || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Balance Sheet View */}
          {statementType === "BALANCE_SHEET" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">Assets</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs font-mono">
                  {balanceSheet?.assets?.length === 0 || !balanceSheet ? (
                    <div className="text-slate-400 py-6 text-center font-sans">No assets ledger balances recorded.</div>
                  ) : (
                    balanceSheet.assets.map((item: any) => (
                      <div key={item.account_code} className="flex justify-between py-1 border-b border-slate-50">
                        <span className="font-sans text-slate-700">{item.account_code} — {item.account_name}</span>
                        <span className="font-bold text-slate-900">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-3 font-bold border-t-2 border-slate-200 text-slate-900 text-sm">
                    <span className="font-sans">Total Assets:</span>
                    <span>₹{(balanceSheet?.total_assets || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">Liabilities & Reserves</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs font-mono">
                  <div className="text-[11px] font-bold font-sans text-slate-400 uppercase tracking-wider">Liabilities</div>
                  {balanceSheet?.liabilities?.map((item: any) => (
                    <div key={item.account_code} className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-sans text-slate-700">{item.account_code} — {item.account_name}</span>
                      <span className="font-bold text-slate-900">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}

                  <div className="text-[11px] font-bold font-sans text-slate-400 uppercase tracking-wider pt-2">Reserves & Surplus</div>
                  {balanceSheet?.equity?.map((item: any) => (
                    <div key={item.account_code} className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-sans text-slate-700">{item.account_code} — {item.account_name}</span>
                      <span className="font-bold text-slate-900">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}

                  <div className="flex justify-between pt-3 font-bold border-t-2 border-slate-200 text-slate-900 text-sm">
                    <span className="font-sans">Total Liabilities & Equity:</span>
                    <span>₹{(balanceSheet?.total_liabilities_and_equity || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS */}
      {activeTab === "COA" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Standard Chart of Accounts (COA)</h2>
              <p className="text-xs text-slate-500">
                Categorized standard accounts (1010–5110) for society bookkeeping and audit compliance.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsCoaModalOpen(true)}
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Account</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const).map((accType) => {
              const accountsInGroup = coa.filter((c) => c.account_type === accType);
              return (
                <Card key={accType} className="border-slate-200 shadow-xs bg-white">
                  <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {accType} Accounts
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {accountsInGroup.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                            <th className="py-2 px-4 w-24">Code</th>
                            <th className="py-2 px-4">Account Name</th>
                            <th className="py-2 px-4">Category</th>
                            <th className="py-2 px-4">Description</th>
                            <th className="py-2 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accountsInGroup.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-4 font-mono font-bold text-slate-700">{acc.account_code}</td>
                              <td className="py-2 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                {acc.account_name}
                                {acc.is_system && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-normal">
                                    System
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-4 text-slate-500">{acc.category}</td>
                              <td className="py-2 px-4 text-slate-400 max-w-xs truncate">{acc.description || "-"}</td>
                              <td className="py-2 px-4 text-center">
                                <Badge variant={acc.is_active ? "success" : "secondary"} className="text-[10px]">
                                  {acc.is_active ? "Active" : "Archived"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: JOURNAL VOUCHERS */}
      {activeTab === "JOURNAL" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Journal Entries Register</h2>
              <p className="text-xs text-slate-500">
                Audited double-entry journal vouchers with balanced debit and credit legs.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsJournalModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Journal Voucher</span>
              </Button>
            )}
          </div>

          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Entry Number</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Narration</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-4 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          No journal entries posted yet.
                        </td>
                      </tr>
                    ) : (
                      journalEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{entry.entry_number}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{entry.entry_date}</td>
                          <td className="py-2.5 px-4 max-w-sm">
                            <div className="text-slate-900 font-medium truncate">{entry.narration}</div>
                            {entry.backdated_reason && (
                              <div className="text-[10px] text-amber-700 mt-0.5">
                                Justification: {entry.backdated_reason}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">{entry.source_reference_type}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {Number(entry.total_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {Number(entry.total_credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {entry.status === "REVERSED" ? (
                              <Badge variant="destructive" className="text-[10px]">Reversed</Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px]">Posted</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {entry.status !== "REVERSED" && canManage && (
                              <Button
                                onClick={() => {
                                  setTargetReverseEntry(entry);
                                  setIsReverseModalOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-slate-600 hover:text-rose-600"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reverse
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: GENERAL LEDGER */}
      {activeTab === "LEDGER" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase">Select Account:</span>
              <select
                value={selectedLedgerAccount}
                onChange={(e) => {
                  setSelectedLedgerAccount(e.target.value);
                  fetchLedger(e.target.value);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {coa.map((acc) => (
                  <option key={acc.id} value={acc.account_code}>
                    {acc.account_code} — {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => fetchLedger(selectedLedgerAccount)}
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ledgerLoading ? "animate-spin" : ""}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>

          {ledgerData && (
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    {ledgerData.account?.account_code} — {ledgerData.account?.account_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Type: {ledgerData.account?.account_type} | Category: {ledgerData.account?.category}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Closing Balance</div>
                  <div className="text-base font-bold font-mono text-emerald-700">
                    ₹{ledgerData.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Entry #</th>
                        <th className="py-2.5 px-4">Narration</th>
                        <th className="py-2.5 px-4 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-4 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-4 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {ledgerData.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                            No ledger activity recorded for this account.
                          </td>
                        </tr>
                      ) : (
                        ledgerData.entries.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-4 text-slate-600">{entry.entry_date}</td>
                            <td className="py-2 px-4 font-bold text-slate-800">{entry.entry_number}</td>
                            <td className="py-2 px-4 font-sans text-slate-700">{entry.narration}</td>
                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">
                              {entry.debit > 0 ? entry.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                            </td>
                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">
                              {entry.credit > 0 ? entry.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-emerald-800">
                              ₹{entry.running_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 5: BANK & CASH REGISTER */}
      {activeTab === "BANK_CASH" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Society Bank Accounts & Petty Cash Register</h2>
              <p className="text-xs text-slate-500">
                Operational accounts, designated sinking reserves, and petty cash floats.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsBankModalOpen(true)}
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bank / Cash Account</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                No bank accounts registered. Add your primary society operating account to begin.
              </div>
            ) : (
              bankAccounts.map((acc) => (
                <Card key={acc.id} className="border-slate-200 shadow-xs bg-white">
                  <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{acc.bank_name}</CardTitle>
                        <CardDescription className="text-xs text-slate-500">{acc.account_type}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={acc.is_active ? "success" : "secondary"}>
                      {acc.is_active ? "Active" : "Closed"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account #:</span>
                      <span className="font-mono font-bold text-slate-800">{acc.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IFSC / Branch:</span>
                      <span className="text-slate-700">{acc.ifsc_code || "-"} ({acc.branch_name || "-"})</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Opening Balance:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{Number(acc.opening_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: EXPENSE VOUCHERS */}
      {activeTab === "EXPENSES" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expense Vouchers Register</h2>
              <p className="text-xs text-slate-500">
                Vendor disbursements, utility payments, repair expenses, and TDS deductions.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsExpenseModalOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense Voucher</span>
              </Button>
            )}
          </div>

          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Voucher #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Payee / Vendor</th>
                      <th className="py-2.5 px-4">Expense Head</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4 text-right">Mode</th>
                      <th className="py-2.5 px-4 text-right">Ref #</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          No expense vouchers recorded yet.
                        </td>
                      </tr>
                    ) : (
                      expenseVouchers.map((voucher) => (
                        <tr key={voucher.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{voucher.voucher_number}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{voucher.voucher_date}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{voucher.vendor_name}</td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {voucher.expense_account?.account_name || "General Expense"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                            ₹{Number(voucher.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                            {voucher.payment_mode || "BANK_TRANSFER"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {voucher.reference_number || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge variant={voucher.payment_status === "PAID" ? "success" : "secondary"} className="text-[10px]">
                              {voucher.payment_status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 7: FINANCIAL PERIODS & CONTROLS */}
      {activeTab === "PERIODS" && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Financial Years & Period Locking Controls</h2>
              <p className="text-xs text-slate-500">
                Lock monthly periods to prevent unauthorized back-dated entries and preserve historical integrity.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsYearModalOpen(true)}
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Financial Year</span>
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {financialYears.map((year) => (
              <Card key={year.id} className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-bold text-slate-900">{year.name}</CardTitle>
                    <span className="text-xs text-slate-400 font-mono">
                      {year.start_date} to {year.end_date}
                    </span>
                    {year.is_current && (
                      <Badge variant="success" className="text-[10px]">Current Active Year</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="py-2 px-4">Period #</th>
                          <th className="py-2 px-4">Month / Period Name</th>
                          <th className="py-2 px-4">Date Range</th>
                          <th className="py-2 px-4 text-center">Status</th>
                          <th className="py-2 px-4">Lock Reason</th>
                          <th className="py-2 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {year.periods?.map((period) => (
                          <tr key={period.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-4 font-mono font-bold text-slate-600">P{period.period_number}</td>
                            <td className="py-2 px-4 font-medium text-slate-900">{period.name}</td>
                            <td className="py-2 px-4 font-mono text-slate-500">
                              {period.start_date} to {period.end_date}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {period.status === "LOCKED" && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </Badge>
                              )}
                              {period.status === "CLOSED" && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Closed
                                </Badge>
                              )}
                              {period.status === "OPEN" && (
                                <Badge variant="success" className="text-[10px] gap-1">
                                  <Unlock className="w-2.5 h-2.5" /> Open
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-4 text-slate-500 max-w-xs truncate">
                              {period.lock_reason || "-"}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {canManage && (
                                <Button
                                  onClick={() => {
                                    setTargetPeriod({
                                      id: period.id,
                                      name: period.name,
                                      current_status: period.status,
                                    });
                                    setPeriodNewStatus(period.status === "OPEN" ? "LOCKED" : "OPEN");
                                    setIsPeriodLockModalOpen(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] text-slate-600 hover:text-slate-900"
                                >
                                  {period.status === "OPEN" ? "Lock Period" : "Unlock Period"}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: POST JOURNAL ENTRY VOUCHER */}
      {/* ==================================================== */}
      <Dialog open={isJournalModalOpen} onOpenChange={setIsJournalModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Post Balanced Double-Entry Journal Voucher
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ensure total debits equal total credits. Historical entries into locked periods require a mandatory justification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePostJournal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Entry Date *</label>
                <Input
                  type="date"
                  value={journalForm.entry_date}
                  onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                  required
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Reference Number</label>
                <Input
                  placeholder="e.g. CHQ-9912 / INV-04"
                  value={journalForm.reference_number}
                  onChange={(e) => setJournalForm({ ...journalForm, reference_number: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Backdated Reason (if period locked)</label>
                <Input
                  placeholder="Mandatory if period is locked"
                  value={journalForm.backdated_reason}
                  onChange={(e) => setJournalForm({ ...journalForm, backdated_reason: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Narration *</label>
              <Input
                placeholder="Comprehensive description of this journal transaction"
                value={journalForm.narration}
                onChange={(e) => setJournalForm({ ...journalForm, narration: e.target.value })}
                required
                className="text-xs h-8"
              />
            </div>

            {/* Line items */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Journal Lines</span>
                <Button
                  type="button"
                  onClick={() =>
                    setJournalForm({
                      ...journalForm,
                      lines: [
                        ...journalForm.lines,
                        { account_id: coa[0]?.id || "", debit: 0, credit: 0, description: "" },
                      ],
                    })
                  }
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {journalForm.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="col-span-5">
                      <select
                        value={line.account_id}
                        onChange={(e) => {
                          const updated = [...journalForm.lines];
                          updated[idx].account_id = e.target.value;
                          setJournalForm({ ...journalForm, lines: updated });
                        }}
                        className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
                        required
                      >
                        {coa.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.account_code} — {c.account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Debit ₹"
                        value={line.debit || ""}
                        onChange={(e) => {
                          const updated = [...journalForm.lines];
                          updated[idx].debit = parseFloat(e.target.value) || 0;
                          if (parseFloat(e.target.value) > 0) updated[idx].credit = 0;
                          setJournalForm({ ...journalForm, lines: updated });
                        }}
                        className="text-xs h-8 text-right font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Credit ₹"
                        value={line.credit || ""}
                        onChange={(e) => {
                          const updated = [...journalForm.lines];
                          updated[idx].credit = parseFloat(e.target.value) || 0;
                          if (parseFloat(e.target.value) > 0) updated[idx].debit = 0;
                          setJournalForm({ ...journalForm, lines: updated });
                        }}
                        className="text-xs h-8 text-right font-mono"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {journalForm.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = journalForm.lines.filter((_, i) => i !== idx);
                            setJournalForm({ ...journalForm, lines: updated });
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Balance verification */}
              <div className="flex justify-between items-center pt-2 font-mono text-xs border-t border-slate-200">
                <div className="flex gap-4">
                  <span>Total Debit: <b className="text-slate-900">₹{totalDebit.toFixed(2)}</b></span>
                  <span>Total Credit: <b className="text-slate-900">₹{totalCredit.toFixed(2)}</b></span>
                </div>
                <div>
                  {isJournalBalanced ? (
                    <Badge variant="success" className="text-[10px]">Balanced</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsJournalModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isJournalBalanced || isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {isSubmitting ? "Posting..." : "Confirm & Post Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 2: RECORD EXPENSE VOUCHER */}
      {/* ==================================================== */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Record Expense Voucher
            </DialogTitle>
            <DialogDescription className="text-xs">
              Records vendor payout, deducts TDS if applicable, and automatically posts the double-entry voucher.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Voucher Number *</label>
                <Input
                  value={expenseForm.voucher_number}
                  onChange={(e) => setExpenseForm({ ...expenseForm, voucher_number: e.target.value })}
                  required
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Voucher Date *</label>
                <Input
                  type="date"
                  value={expenseForm.voucher_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, voucher_date: e.target.value })}
                  required
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Payee / Vendor Name *</label>
              <Input
                placeholder="e.g. Apex Security Services Ltd"
                value={expenseForm.payee_name}
                onChange={(e) => setExpenseForm({ ...expenseForm, payee_name: e.target.value })}
                required
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Account (Debit) *</label>
                <select
                  value={expenseForm.expense_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_account_id: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
                  required
                >
                  {coa
                    .filter((c) => c.account_type === "EXPENSE")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.account_code} — {c.account_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paid From (Credit) *</label>
                <select
                  value={expenseForm.paid_from_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paid_from_account_id: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
                  required
                >
                  {coa
                    .filter((c) => c.category === "BANK" || c.category === "CASH")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.account_code} — {c.account_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Base Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount || ""}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="text-xs h-8 font-mono text-right"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tax / GST (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.tax_amount || ""}
                  onChange={(e) => setExpenseForm({ ...expenseForm, tax_amount: parseFloat(e.target.value) || 0 })}
                  className="text-xs h-8 font-mono text-right"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">TDS Deducted (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.tds_amount || ""}
                  onChange={(e) => setExpenseForm({ ...expenseForm, tds_amount: parseFloat(e.target.value) || 0 })}
                  className="text-xs h-8 font-mono text-right"
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-100 font-mono">
              <span className="font-bold font-sans">Net Cash Outflow:</span>
              <span className="font-bold text-emerald-800 text-sm">
                ₹{Math.max(0, (expenseForm.amount + expenseForm.tax_amount - expenseForm.tds_amount)).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Narration / Notes *</label>
              <Input
                placeholder="Details of the service or invoice"
                value={expenseForm.narration}
                onChange={(e) => setExpenseForm({ ...expenseForm, narration: e.target.value })}
                required
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSubmitting ? "Recording..." : "Record & Post Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 3: ADD BANK ACCOUNT */}
      {/* ==================================================== */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Add Society Bank Account / Petty Cash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register society bank account or cash-in-hand register for collections and disbursements.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBankAccount} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bank Name / Ledger Title *</label>
              <Input
                placeholder="e.g. State Bank of India"
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                required
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Number *</label>
                <Input
                  placeholder="e.g. 40128912903"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  required
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Type *</label>
                <select
                  value={bankForm.account_type}
                  onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value as any })}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
                >
                  <option value="OPERATING">Operating Account</option>
                  <option value="SINKING_FUND">Sinking Reserve</option>
                  <option value="FIXED_DEPOSIT">Fixed Deposit</option>
                  <option value="PETTY_CASH">Petty Cash Box</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch Name</label>
                <Input
                  placeholder="e.g. Bandra West"
                  value={bankForm.branch_name}
                  onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">IFSC Code</label>
                <Input
                  placeholder="e.g. SBIN0001234"
                  value={bankForm.ifsc_code}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })}
                  className="text-xs h-8 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Opening Balance (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={bankForm.opening_balance || ""}
                  onChange={(e) => setBankForm({ ...bankForm, opening_balance: parseFloat(e.target.value) || 0 })}
                  className="text-xs h-8 font-mono text-right"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">As Of Date</label>
                <Input
                  type="date"
                  value={bankForm.opening_balance_date}
                  onChange={(e) => setBankForm({ ...bankForm, opening_balance_date: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBankModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {isSubmitting ? "Adding..." : "Add Bank Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 4: ADD COA ACCOUNT */}
      {/* ==================================================== */}
      <Dialog open={isCoaModalOpen} onOpenChange={setIsCoaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-700" />
              Add Chart of Accounts Head
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new account head in the general ledger.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoa} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Code *</label>
                <Input
                  placeholder="e.g. 5120"
                  value={coaForm.account_code}
                  onChange={(e) => setCoaForm({ ...coaForm, account_code: e.target.value })}
                  required
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Type *</label>
                <select
                  value={coaForm.account_type}
                  onChange={(e) => setCoaForm({ ...coaForm, account_type: e.target.value as any })}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Account Name *</label>
              <Input
                placeholder="e.g. Swimming Pool Chemical Maintenance"
                value={coaForm.account_name}
                onChange={(e) => setCoaForm({ ...coaForm, account_name: e.target.value })}
                required
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description</label>
              <Input
                placeholder="Purpose of this account"
                value={coaForm.description}
                onChange={(e) => setCoaForm({ ...coaForm, description: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCoaModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white">
                {isSubmitting ? "Creating..." : "Save Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 5: LOCK / UNLOCK PERIOD */}
      {/* ==================================================== */}
      <Dialog open={isPeriodLockModalOpen} onOpenChange={setIsPeriodLockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Manage Financial Period Status: {targetPeriod?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              When a period is LOCKED, standard posting is restricted and requires explicit justification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLockPeriod} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Status *</label>
              <select
                value={periodNewStatus}
                onChange={(e) => setPeriodNewStatus(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
              >
                <option value="LOCKED">LOCKED (Restricts standard entries)</option>
                <option value="CLOSED">CLOSED (Finalized by statutory auditor)</option>
                <option value="OPEN">OPEN (Active posting permitted)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reason / Justification *</label>
              <Input
                placeholder="e.g. Monthly books reconciled & closed for audit"
                value={periodLockReason}
                onChange={(e) => setPeriodLockReason(e.target.value)}
                required
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPeriodLockModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-500 text-white">
                {isSubmitting ? "Updating..." : "Update Period Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 6: REVERSE JOURNAL ENTRY */}
      {/* ==================================================== */}
      <Dialog open={isReverseModalOpen} onOpenChange={setIsReverseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Reverse Journal Voucher {targetReverseEntry?.entry_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will create an inverted adjustment voucher without deleting the original entry, preserving audit logs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReverseJournal} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Reversal Justification *</label>
              <Input
                placeholder="e.g. Correcting mistaken duplicate billing entry"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                required
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsReverseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-500 text-white">
                {isSubmitting ? "Reversing..." : "Confirm Reversal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 7: PUBLISH FINANCIAL REPORT */}
      {/* ==================================================== */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              Publish Audited Statement to Society Members
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish an audited financial report. A single consolidated notification will be dispatched to society members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePublishReport} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Statement Type *</label>
              <select
                value={publishForm.report_type}
                onChange={(e) => setPublishForm({ ...publishForm, report_type: e.target.value as any })}
                className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-none"
              >
                <option value="INCOME_EXPENDITURE">Income & Expenditure Statement</option>
                <option value="BALANCE_SHEET">Balance Sheet</option>
                <option value="TRIAL_BALANCE">Trial Balance</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Auditor / Committee Notes</label>
              <Input
                placeholder="e.g. Approved by Managing Committee at meeting on 15th"
                value={publishForm.notes}
                onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirmConsolidated"
                  checked={publishForm.confirmConsolidatedNotice}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, confirmConsolidatedNotice: e.target.checked })
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="confirmConsolidated" className="font-semibold text-slate-900 text-[11px]">
                  Zero-Spam Notification Policy
                </label>
              </div>
              <p className="text-[10px] text-slate-500 pl-5">
                Only a single consolidated notification will be dispatched to members. Internal journal entries and ledger operations do not spam residents.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!publishForm.confirmConsolidatedNotice || isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isSubmitting ? "Publishing..." : "Publish & Notify"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

