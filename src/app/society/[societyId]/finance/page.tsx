import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { PERMISSIONS, roleHasPermission } from "@/lib/auth/permissions";
import {
  getChartOfAccounts,
  seedDefaultChartOfAccounts,
  getFinancialYears,
  getSocietyBankAccounts,
  getExpenseVouchers,
  getJournalEntries,
  getTrialBalance,
} from "@/lib/services/financeService";
import { FinanceHubClient } from "./FinanceHubClient";

export const dynamic = "force-dynamic";

export default async function SocietyFinancePage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  const canView = roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_VIEW);
  if (!canView) {
    redirect("/unauthorized");
  }

  // Auto-seed standard COA if not yet seeded
  let coa = await getChartOfAccounts(societyId);
  if (coa.length === 0) {
    coa = await seedDefaultChartOfAccounts(societyId, identity.effectiveUser.id);
  }

  const [financialYears, bankAccounts, expenseVouchers, journalEntries, trialBalance] = await Promise.all([
    getFinancialYears(societyId),
    getSocietyBankAccounts(societyId),
    getExpenseVouchers(societyId),
    getJournalEntries(societyId),
    getTrialBalance(societyId),
  ]);

  const formattedTrialBalance = {
    as_of_date: trialBalance.asOfDate,
    total_debit: trialBalance.totalDebit,
    total_credit: trialBalance.totalCredit,
    is_balanced: trialBalance.isBalanced,
    rows: trialBalance.rows.map((r) => ({
      account_id: r.accountId,
      account_code: r.code,
      account_name: r.name,
      account_type: r.type,
      category: r.category,
      debit: r.debit,
      credit: r.credit,
    })),
  };

  return (
    <FinanceHubClient
      societyId={societyId}
      society={society}
      userRole={identity.currentRole || "TREASURER"}
      userId={identity.effectiveUser.id}
      initialCoa={coa}
      initialFinancialYears={financialYears}
      initialBankAccounts={bankAccounts}
      initialExpenseVouchers={expenseVouchers}
      initialJournalEntries={journalEntries}
      initialTrialBalance={formattedTrialBalance}
    />
  );
}

