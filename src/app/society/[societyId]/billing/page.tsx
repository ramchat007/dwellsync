"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Receipt,
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  CreditCard,
  Building2,
  X,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SummaryMetrics {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
  unpaidCount: number;
  paidCount: number;
  overdueCount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  unit?: {
    id: string;
    unit_number: string;
    building?: { name: string };
    wing?: { name: string };
  };
  billing_cycle?: {
    id: string;
    name: string;
  };
  charge_config?: {
    name: string;
    charge_type: string;
  };
}

interface BillingCycle {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  notes?: string;
  creator?: { full_name?: string; display_name?: string };
}

interface MaintenanceConfig {
  id: string;
  name: string;
  description?: string;
  charge_type: "FLAT_RATE" | "AREA_BASED" | "UNIT_TYPE_BASED";
  rate: number;
  unit_type_rates?: Record<string, number>;
  frequency: string;
  effective_from: string;
  is_active: boolean;
}

interface ReceiptItem {
  id: string;
  receipt_number: string;
  amount: number;
  receipt_date: string;
  unit?: { unit_number: string };
  invoice?: { invoice_number: string };
  payment?: { payment_method: string; reference_number?: string };
  issuer?: { full_name?: string; display_name?: string };
}

export default function SocietyBillingPage() {
  const params = useParams();
  const societyId = params.societyId as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"INVOICES" | "CYCLES" | "CONFIGS" | "RECEIPTS">("INVOICES");
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
    unpaidCount: 0,
    paidCount: 0,
    overdueCount: 0,
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [configs, setConfigs] = useState<MaintenanceConfig[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Cycle Modal
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleName, setCycleName] = useState("");
  const [cycleStart, setCycleStart] = useState("");
  const [cycleEnd, setCycleEnd] = useState("");
  const [cycleDue, setCycleDue] = useState("");
  const [cycleConfigId, setCycleConfigId] = useState("");
  const [cycleSubmitting, setCycleSubmitting] = useState(false);
  const [cycleError, setCycleError] = useState<string | null>(null);

  // Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [cfgName, setCfgName] = useState("");
  const [cfgType, setCfgType] = useState<"FLAT_RATE" | "AREA_BASED" | "UNIT_TYPE_BASED">("FLAT_RATE");
  const [cfgRate, setCfgRate] = useState("2500");
  const [cfgFreq, setCfgFreq] = useState("MONTHLY");
  const [cfgEffectiveFrom, setCfgEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [cfgSubmitting, setCfgSubmitting] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, cycRes, cfgRes, recRes] = await Promise.all([
        fetch(`/api/society/${societyId}/billing/summary`),
        fetch(`/api/society/${societyId}/billing/invoices`),
        fetch(`/api/society/${societyId}/billing/cycles`),
        fetch(`/api/society/${societyId}/billing/configs`),
        fetch(`/api/society/${societyId}/billing/receipts`),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData.summary);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices);
      }
      if (cycRes.ok) {
        const cycData = await cycRes.json();
        setCycles(cycData.cycles);
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfigs(cfgData.configs);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        setReceipts(recData.receipts);
      }
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId, loadData]);

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
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Unpaid</Badge>;
    }
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.balance_due));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentRef("");
    setPaymentNotes("");
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setPaymentSubmitting(true);
    setPaymentError(null);

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Amount must be greater than zero");
      setPaymentSubmitting(false);
      return;
    }
    if (amt > Number(selectedInvoice.balance_due)) {
      setPaymentError(`Amount cannot exceed remaining balance (${selectedInvoice.balance_due})`);
      setPaymentSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/society/${societyId}/billing/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount: amt,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: paymentRef || null,
          notes: paymentNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || "Failed to record payment");
      } else {
        setShowPaymentModal(false);
        loadData();
      }
    } catch (err: any) {
      setPaymentError(err?.message || "An unexpected error occurred");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCycleSubmitting(true);
    setCycleError(null);

    try {
      const res = await fetch(`/api/society/${societyId}/billing/cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cycleName,
          period_start: cycleStart,
          period_end: cycleEnd,
          due_date: cycleDue,
          charge_config_id: cycleConfigId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCycleError(data.error || "Failed to create cycle");
      } else {
        setShowCycleModal(false);
        setCycleName("");
        setCycleStart("");
        setCycleEnd("");
        setCycleDue("");
        setCycleConfigId("");
        loadData();
      }
    } catch (err: any) {
      setCycleError(err?.message || "An unexpected error occurred");
    } finally {
      setCycleSubmitting(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfgSubmitting(true);
    setCfgError(null);

    try {
      const res = await fetch(`/api/society/${societyId}/billing/configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cfgName,
          charge_type: cfgType,
          rate: parseFloat(cfgRate),
          frequency: cfgFreq,
          effective_from: cfgEffectiveFrom,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCfgError(data.error || "Failed to save configuration");
      } else {
        setShowConfigModal(false);
        setCfgName("");
        loadData();
      }
    } catch (err: any) {
      setCfgError(err?.message || "An unexpected error occurred");
    } finally {
      setCfgSubmitting(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to cancel this invoice?")) return;

    try {
      const res = await fetch(`/api/society/${societyId}/billing/invoices/${invoiceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin cancelled from console" }),
      });

      if (res.ok) {
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to cancel invoice");
      }
    } catch (err) {
      alert("Error cancelling invoice");
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoice_number.toLowerCase().includes(q);
      const unitMatch = inv.unit?.unit_number.toLowerCase().includes(q);
      return numMatch || unitMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Maintenance Billing & Financial Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure society charging rules, manage billing cycles, generate invoices, and record payments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/society/${societyId}/finance`}>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Banknote className="w-3.5 h-3.5" />
              Treasury & Accounts
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowConfigModal(true)}
            variant="outline"
            className="text-xs gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Add Charge Rule
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCycleModal(true)}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Billing Cycle
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Invoiced</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(summary.totalBilled)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">Across {summary.invoiceCount} generated invoices</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Collections</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(summary.totalCollected)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">{summary.paidCount} invoices cleared</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Outstanding</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(summary.totalOutstanding)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">{summary.unpaidCount} unpaid/partial invoices</span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Overdue Invoices</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-rose-600 mt-1">
              {summary.overdueCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500">Passed payment due date</span>
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
          onClick={() => setActiveTab("CYCLES")}
          className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${
            activeTab === "CYCLES"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Billing Cycles ({cycles.length})
        </button>
        <button
          onClick={() => setActiveTab("CONFIGS")}
          className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${
            activeTab === "CONFIGS"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          Charge Rules ({configs.length})
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
          Receipts ({receipts.length})
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === "INVOICES" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Invoice # or Unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {["ALL", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                    statusFilter === st
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <Card className="border-dashed bg-white dark:bg-slate-900 text-center py-12">
              <CardContent>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">No invoices found</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Create a billing cycle to generate invoices for this society.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Cycle</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Unit {inv.unit?.unit_number || "—"}
                        </span>
                        {inv.unit?.building && (
                          <span className="block text-[10px] text-slate-400">{inv.unit.building.name}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {inv.billing_cycle?.name || "General Maintenance"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{inv.due_date}</td>
                      <td className="p-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {formatCurrency(Number(inv.total_amount))}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(inv.balance_due))}
                      </td>
                      <td className="p-3">{getStatusBadge(inv.status)}</td>
                      <td className="p-3 text-right space-x-1">
                        {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment(inv)}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Record Payment
                          </Button>
                        )}
                        {inv.status !== "PAID" && Number(inv.amount_paid) === 0 && inv.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="h-7 px-2 text-[11px] text-slate-500 hover:text-red-600"
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BILLING CYCLES */}
      {activeTab === "CYCLES" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Configured society billing cycles</span>
            <Button
              size="sm"
              onClick={() => setShowCycleModal(true)}
              className="text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New Cycle
            </Button>
          </div>

          {cycles.length === 0 ? (
            <Card className="border-dashed bg-white dark:bg-slate-900 text-center py-12">
              <CardContent>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">No billing cycles</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Create a new monthly or quarterly billing cycle.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Cycle Name</th>
                    <th className="p-3">Period Start</th>
                    <th className="p-3">Period End</th>
                    <th className="p-3">Payment Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{c.period_start}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{c.period_end}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{c.due_date}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500">{c.creator?.display_name || c.creator?.full_name || "Admin"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHARGE CONFIGURATIONS */}
      {activeTab === "CONFIGS" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Maintenance charging models & rates</span>
            <Button
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((cfg) => (
              <Card key={cfg.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cfg.name}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1 font-mono uppercase">
                      {cfg.charge_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    {cfg.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base Rate:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {cfg.charge_type === "AREA_BASED"
                        ? `₹${cfg.rate} / sq.ft`
                        : formatCurrency(Number(cfg.rate))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Frequency:</span>
                    <span className="capitalize">{cfg.frequency.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effective:</span>
                    <span>{cfg.effective_from}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECEIPTS */}
      {activeTab === "RECEIPTS" && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">Official issued society payment receipts</div>
          {receipts.length === 0 ? (
            <Card className="border-dashed bg-white dark:bg-slate-900 text-center py-12">
              <CardContent>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">No receipts recorded</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Receipts will appear here when manual payments are recorded.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Receipt #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {receipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {rec.receipt_number}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{rec.receipt_date}</td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        Unit {rec.unit?.unit_number || "—"}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{rec.invoice?.invoice_number || "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {rec.payment?.payment_method || "DIRECT"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(Number(rec.amount))}
                      </td>
                      <td className="p-3 text-slate-500">{rec.issuer?.display_name || rec.issuer?.full_name || "Staff"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RECORD PAYMENT */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record Manual Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedInvoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unit:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Unit {selectedInvoice.unit?.unit_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatCurrency(Number(selectedInvoice.balance_due))}
                </span>
              </div>
            </div>

            {paymentError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">{paymentError}</div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Reference / UTR / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678 or Cheque #987654"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handed over at clubhouse office"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={paymentSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {paymentSubmitting ? "Issuing Receipt..." : "Record & Issue Receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE BILLING CYCLE */}
      {showCycleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Billing Cycle</h3>
              <button
                onClick={() => setShowCycleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cycleError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">{cycleError}</div>
            )}

            <form onSubmit={handleCreateCycle} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Cycle Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 Maintenance"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    required
                    value={cycleStart}
                    onChange={(e) => setCycleStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    required
                    value={cycleEnd}
                    onChange={(e) => setCycleEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  required
                  value={cycleDue}
                  onChange={(e) => setCycleDue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Apply Charge Rule (Optional auto-generate bills)
                </label>
                <select
                  value={cycleConfigId}
                  onChange={(e) => setCycleConfigId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Do not generate now (Draft only)</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.charge_type.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCycleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cycleSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {cycleSubmitting ? "Creating..." : "Create Cycle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE CHARGE RULE */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add Maintenance Charge Rule</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cfgError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">{cfgError}</div>
            )}

            <form onSubmit={handleCreateConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Society Maintenance 2026-27"
                  value={cfgName}
                  onChange={(e) => setCfgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Calculation Model
                </label>
                <select
                  value={cfgType}
                  onChange={(e) => setCfgType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="FLAT_RATE">Flat Fixed Rate Per Flat</option>
                  <option value="AREA_BASED">Area-Based (Rate per Sq.Ft)</option>
                  <option value="UNIT_TYPE_BASED">Unit Type Tiered (1BHK / 2BHK / 3BHK)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {cfgType === "AREA_BASED" ? "Rate per Sq.Ft (₹)" : "Amount / Base Rate (₹)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cfgRate}
                  onChange={(e) => setCfgRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={cfgFreq}
                    onChange={(e) => setCfgFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Effective From
                  </label>
                  <input
                    type="date"
                    required
                    value={cfgEffectiveFrom}
                    onChange={(e) => setCfgEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cfgSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {cfgSubmitting ? "Saving..." : "Save Rule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
