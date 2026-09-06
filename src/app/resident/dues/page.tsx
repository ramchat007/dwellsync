"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Calendar,
  IndianRupee,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  line_items: Array<{ description: string; amount: number; category?: string }>;
  unit?: {
    unit_number: string;
    building?: { name: string };
  };
  billing_cycle?: {
    name: string;
    period_start: string;
    period_end: string;
  };
}

interface OfficialReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  receipt_date: string;
  unit?: { unit_number: string };
  invoice?: { invoice_number: string };
  payment?: { payment_method: string; reference_number?: string };
}

interface DuesSummary {
  totalOutstanding: number;
  totalPaid: number;
  unpaidCount: number;
  overdueCount: number;
}

export default function ResidentDuesPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DuesSummary>({
    totalOutstanding: 0,
    totalPaid: 0,
    unpaidCount: 0,
    overdueCount: 0,
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<OfficialReceipt[]>([]);
  const [activeTab, setActiveTab] = useState<"INVOICES" | "RECEIPTS">("INVOICES");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const fetchDuesData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resident/dues");
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || { totalOutstanding: 0, totalPaid: 0, unpaidCount: 0, overdueCount: 0 });
        setInvoices(data.invoices || []);
        setReceipts(data.receipts || []);
      }
    } catch (err) {
      console.error("Failed to load resident dues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuesData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid in Full</Badge>;
      case "PARTIALLY_PAID":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Partially Paid</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
      case "CANCELLED":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Payment Due</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Maintenance Dues & Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative society billing history, verified receipts, and outstanding balances.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDuesData}
          disabled={loading}
          className="self-start sm:self-auto gap-1.5 text-xs text-slate-700 dark:text-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Outstanding Dues</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(summary.totalOutstanding)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">
              {summary.totalOutstanding > 0 ? "Payment pending" : "All current bills cleared"}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Paid to Date</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">Verified receipts recorded</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Pending Invoices</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {summary.unpaidCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">Awaiting clearance</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Overdue Invoices</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {summary.overdueCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">
              {summary.overdueCount > 0 ? "Action required" : "No overdue items"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("INVOICES")}
          className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${
            activeTab === "INVOICES"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("RECEIPTS")}
          className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${
            activeTab === "RECEIPTS"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Official Receipts ({receipts.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Loading verified financial records...</p>
        </div>
      ) : activeTab === "INVOICES" ? (
        invoices.length === 0 ? (
          <Card className="border-dashed bg-white dark:bg-slate-900 text-center py-12">
            <CardContent>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Invoices Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are currently no maintenance invoices generated for your assigned unit(s).
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const isExpanded = expandedInvoiceId === invoice.id;
              return (
                <Card
                  key={invoice.id}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {invoice.invoice_number}
                        </span>
                        {getStatusBadge(invoice.status)}
                        {invoice.unit && (
                          <Badge variant="outline" className="text-[10px] text-slate-600">
                            Unit {invoice.unit.unit_number}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Issued: {invoice.invoice_date}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Due Date: {invoice.due_date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Balance Due</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(Number(invoice.balance_due))}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total: {formatCurrency(Number(invoice.total_amount))}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                        className="text-xs text-slate-600 dark:text-slate-300 gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Breakdown <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Line Items Expansion */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 sm:p-5">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Charge Line Items
                      </h4>
                      <div className="space-y-2">
                        {invoice.line_items && invoice.line_items.length > 0 ? (
                          invoice.line_items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60 dark:border-slate-800 last:border-0"
                            >
                              <span className="text-slate-700 dark:text-slate-300">{item.description}</span>
                              <span className="font-mono font-medium text-slate-900 dark:text-white">
                                {formatCurrency(Number(item.amount))}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">Standard monthly maintenance charges.</p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-500">
                          Amount Paid: {formatCurrency(Number(invoice.amount_paid))}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Net Payable: {formatCurrency(Number(invoice.balance_due))}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* Receipts Tab */
        receipts.length === 0 ? (
          <Card className="border-dashed bg-white dark:bg-slate-900 text-center py-12">
            <CardContent>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Receipts Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Official society receipts will appear here once payment has been received and verified.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {receipt.receipt_number}
                      </span>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Verified Receipt
                      </Badge>
                      {receipt.unit && (
                        <Badge variant="outline" className="text-[10px]">
                          Unit {receipt.unit.unit_number}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>Date: {receipt.receipt_date}</span>
                      <span>•</span>
                      <span>Method: {receipt.payment?.payment_method || "Direct"}</span>
                      {receipt.payment?.reference_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono">Ref: {receipt.payment.reference_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Amount Cleared</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(receipt.amount))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
