"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  Shield,
  Layers,
  Sparkles,
  ChevronRight,
  Edit2,
  Plus,
  RefreshCw,
  HardDrive,
  Users,
  DoorOpen,
  MessageSquare,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

interface SocietyItem {
  id: string;
  name: string;
  registration_number?: string;
  status: string;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    billing_cycle: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    plan?: SubscriptionPlan;
  } | null;
}

interface SubscriptionsAdminClientProps {
  initialPlans: SubscriptionPlan[];
  initialSocieties: SocietyItem[];
}

export function SubscriptionsAdminClient({
  initialPlans,
  initialSocieties,
}: SubscriptionsAdminClientProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [societies, setSocieties] = useState<SocietyItem[]>(initialSocieties);
  const [activeTab, setActiveTab] = useState("plans");

  // Plan Edit State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Society Subscription Assignment State
  const [assigningSociety, setAssigningSociety] = useState<SocietyItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annual">("monthly");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Society Usage Inspector State
  const [inspectingSocietyId, setInspectingSocietyId] = useState<string>(
    initialSocieties[0]?.id || ""
  );
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  const fetchUsage = async (socId: string) => {
    if (!socId) return;
    setIsLoadingUsage(true);
    try {
      const res = await fetch(`/api/society/${socId}/entitlements`);
      const data = await res.json();
      if (res.ok) {
        setUsageSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load usage:", err);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleOpenEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSavingPlan(true);

    try {
      const res = await fetch("/api/superadmin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan.");

      setPlans((prev) =>
        prev.map((p) => (p.id === data.plan.id ? data.plan : p))
      );
      setIsPlanModalOpen(false);
      setEditingPlan(null);
    } catch (err: any) {
      alert(err.message || "Failed to update plan");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleOpenAssignModal = (soc: SocietyItem) => {
    setAssigningSociety(soc);
    const existingPlanId = soc.subscription?.plan?.id || plans[0]?.id || "";
    setSelectedPlanId(existingPlanId);
    setSelectedStatus(soc.subscription?.status || "ACTIVE");
    setSelectedCycle((soc.subscription?.billing_cycle as any) || "monthly");
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSociety || !selectedPlanId) return;
    setIsAssigning(true);

    try {
      const res = await fetch("/api/superadmin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          society_id: assigningSociety.id,
          plan_id: selectedPlanId,
          status: selectedStatus,
          billing_cycle: selectedCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign subscription.");

      setSocieties((prev) =>
        prev.map((s) =>
          s.id === assigningSociety.id
            ? { ...s, subscription: data.subscription }
            : s
        )
      );
      setIsAssignModalOpen(false);
      setAssigningSociety(null);
      if (inspectingSocietyId === assigningSociety.id) {
        fetchUsage(assigningSociety.id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update subscription");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge>;
      case "TRIAL":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Trial</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Past Due</Badge>;
      case "CANCELLED":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Cancelled</Badge>;
      case "EXPIRED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Expired</Badge>;
      default:
        return <Badge variant="secondary">Free (Auto)</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Pricing & Subscription Architecture
            </h1>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              100% Free Operational Mode
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure subscription tiers, manage society plan assignments, and enforce feature limits.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          if (val === "usage" && inspectingSocietyId && !usageSummary) {
            fetchUsage(inspectingSocietyId);
          }
        }}
        className="space-y-4"
      >
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Subscription Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="societies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Society Subscriptions ({societies.length})
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <Layers className="w-4 h-4" />
            Live Quota & Usage
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Subscription Plans */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <Card
                key={p.id}
                className={`relative flex flex-col justify-between border-2 transition ${
                  p.code === "FREE"
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      className={
                        p.code === "FREE"
                          ? "bg-emerald-600 text-white"
                          : p.code === "BASIC"
                          ? "bg-blue-600 text-white"
                          : p.code === "PROFESSIONAL"
                          ? "bg-indigo-600 text-white"
                          : "bg-purple-600 text-white"
                      }
                    >
                      {p.code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditPlan(p)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {p.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-2">
                    {p.description}
                  </CardDescription>
                  <div className="pt-2">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {p.monthly_price === 0 ? "₹0" : `₹${Number(p.monthly_price).toLocaleString("en-IN")}`}
                      <span className="text-xs font-normal text-slate-500"> /month</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.annual_price === 0
                        ? "₹0 /year"
                        : `₹${Number(p.annual_price).toLocaleString("en-IN")} /year`}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 font-semibold text-slate-700 dark:text-slate-300">
                    Limits & Quotas:
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Max Units:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.feature_limits.max_units === -1 ? "Unlimited" : p.feature_limits.max_units ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Buildings:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.feature_limits.max_buildings === -1 ? "Unlimited" : p.feature_limits.max_buildings ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Quota:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.feature_limits.max_storage_mb === -1
                          ? "Unlimited"
                          : `${p.feature_limits.max_storage_mb || 0} MB`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Helpdesk:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.feature_limits.max_active_complaints === -1
                          ? "Unlimited"
                          : p.feature_limits.max_active_complaints ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 font-semibold text-slate-700 dark:text-slate-300">
                    Included Features ({p.enabled_features.length}):
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {p.enabled_features.map((feat) => (
                      <span
                        key={feat}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: Society Subscriptions */}
        <TabsContent value="societies" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">
                Societies & Assigned Subscriptions
              </CardTitle>
              <CardDescription className="text-xs">
                Manage tier allocations and subscription lifecycles across all registered tenant societies.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Society Name</TableHead>
                    <TableHead>Assigned Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societies.map((soc) => (
                    <TableRow key={soc.id}>
                      <TableCell className="font-medium">
                        <div>{soc.name}</div>
                        {soc.registration_number && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {soc.registration_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">
                          {soc.subscription?.plan?.code || "FREE"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(soc.subscription?.status)}</TableCell>
                      <TableCell className="capitalize text-xs text-slate-600">
                        {soc.subscription?.billing_cycle || "monthly"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {soc.subscription?.current_period_end
                          ? new Date(soc.subscription.current_period_end).toLocaleDateString()
                          : "Auto-renewing"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignModal(soc)}
                          className="h-8 text-xs"
                        >
                          Change Plan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInspectingSocietyId(soc.id);
                            fetchUsage(soc.id);
                            setActiveTab("usage");
                          }}
                          className="h-8 text-xs"
                        >
                          View Quota
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Live Quota & Usage Inspector */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Live Entitlements & Usage Inspector
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time metrics calculated directly against current database tables for the selected society.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Select Society"
                    value={inspectingSocietyId}
                    onChange={(e) => {
                      setInspectingSocietyId(e.target.value);
                      fetchUsage(e.target.value);
                    }}
                    className="h-9 px-3 py-1 text-xs border rounded-md bg-white dark:bg-slate-900"
                  >
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsage(inspectingSocietyId)}
                    disabled={isLoadingUsage}
                    className="h-9 w-9 p-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsage ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Calculating real-time tenant metrics...
                </div>
              ) : usageSummary ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        Current Plan
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                        {usageSummary.subscription?.plan?.name || "Free Community Tier"}
                        <Badge className="bg-emerald-600 text-white">
                          {usageSummary.subscription?.plan?.code || "FREE"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        Subscription Status
                      </div>
                      <div className="mt-1">{getStatusBadge(usageSummary.subscription?.status)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {usageSummary.metrics.map((m: any) => (
                      <div
                        key={m.key}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {m.label}
                          </span>
                          {m.isExceeded ? (
                            <Badge className="bg-rose-100 text-rose-800 text-[10px]">Limit Exceeded</Badge>
                          ) : m.isUnlimited ? (
                            <Badge variant="outline" className="text-[10px]">Unlimited</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">{m.percentUsed}% used</span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {m.current}
                          </span>
                          <span className="text-xs text-slate-400">
                            / {m.isUnlimited ? "∞" : m.limit}
                          </span>
                        </div>
                        {!m.isUnlimited && (
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                m.isExceeded
                                  ? "bg-rose-500"
                                  : m.percentUsed > 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, m.percentUsed)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Select a society to inspect its live entitlement usage.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PLAN EDIT MODAL */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
            <DialogDescription>
              Adjust pricing, feature limits, and enabled modules for this tier.
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Plan Name</label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Plan Code</label>
                  <Input value={editingPlan.code} disabled className="bg-slate-100" />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <Input
                  value={editingPlan.description || ""}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Monthly Price (₹)</label>
                  <Input
                    type="number"
                    value={editingPlan.monthly_price}
                    disabled={editingPlan.code === "FREE"}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        monthly_price: Number(e.target.value),
                      })
                    }
                  />
                  {editingPlan.code === "FREE" && (
                    <span className="text-[10px] text-emerald-600">FREE tier is locked to ₹0</span>
                  )}
                </div>
                <div>
                  <label className="font-semibold block mb-1">Annual Price (₹)</label>
                  <Input
                    type="number"
                    value={editingPlan.annual_price}
                    disabled={editingPlan.code === "FREE"}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        annual_price: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="font-bold mb-2">Key Quota Limits (-1 = Unlimited):</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 text-[11px]">Max Units</label>
                    <Input
                      type="number"
                      value={editingPlan.feature_limits.max_units ?? -1}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          feature_limits: {
                            ...editingPlan.feature_limits,
                            max_units: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px]">Max Buildings</label>
                    <Input
                      type="number"
                      value={editingPlan.feature_limits.max_buildings ?? -1}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          feature_limits: {
                            ...editingPlan.feature_limits,
                            max_buildings: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px]">Storage (MB)</label>
                    <Input
                      type="number"
                      value={editingPlan.feature_limits.max_storage_mb ?? 100}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          feature_limits: {
                            ...editingPlan.feature_limits,
                            max_storage_mb: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPlanModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingPlan}>
                  {isSavingPlan ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SOCIETY SUBSCRIPTION ASSIGNMENT MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Plan: {assigningSociety?.name}</DialogTitle>
            <DialogDescription>
              Assign a subscription tier or change subscription status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Select Tier / Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full h-9 px-3 py-1 border rounded-md bg-white dark:bg-slate-900"
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — {p.monthly_price === 0 ? "Free" : `₹${p.monthly_price}/mo`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Subscription Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as SubscriptionStatus)}
                  className="w-full h-9 px-3 py-1 border rounded-md bg-white dark:bg-slate-900"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Billing Cycle</label>
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value as "monthly" | "annual")}
                  className="w-full h-9 px-3 py-1 border rounded-md bg-white dark:bg-slate-900"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] border border-emerald-200">
              ✓ <strong>Zero-charge assignment</strong>: Plan updates take effect immediately in free operational mode with no gateway charges.
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAssigning}>
                {isAssigning ? "Updating..." : "Update Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
