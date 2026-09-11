"use client";

import React from "react";
import {
  CreditCard,
  Shield,
  Layers,
  Sparkles,
  Building2,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Calendar,
  Users,
  MessageSquare,
  Receipt,
  CheckSquare,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocietyEntitlementSummary } from "@/lib/services/entitlementService";

interface SubscriptionClientProps {
  summary: SocietyEntitlementSummary;
  societyName: string;
}

export function SubscriptionClient({ summary, societyName }: SubscriptionClientProps) {
  const { subscription, metrics, enabledFeatures } = summary;
  const plan = subscription.plan;

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
        return <Badge variant="secondary">Active (Free)</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Subscription & Usage Quotas
          </h1>
          {getStatusBadge(subscription.status)}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Current plan tier, capacity limits, and real-time usage for {societyName}.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white font-mono uppercase">
                  {plan?.code || "FREE"}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  {subscription.billing_cycle === "annual" ? "Annual Billing" : "Monthly Billing"}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {plan?.name || "Free Community Tier"}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg">
                {plan?.description ||
                  "Free tier for small societies to manage residents, gate access, and helpdesk with zero operational fees."}
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {plan?.monthly_price === 0
                  ? "₹0"
                  : `₹${Number(plan?.monthly_price).toLocaleString("en-IN")}`}
                <span className="text-xs font-normal text-slate-500"> /month</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Renews on: {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quota & Limit Usage Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Live Capacity & Quota Usage
          </h3>
          <span className="text-xs text-slate-500">Calculated in real-time</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <Card key={m.key} className="p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {m.label}
                </span>
                {m.isExceeded ? (
                  <Badge className="bg-rose-100 text-rose-800 text-[10px] border-rose-300">
                    Quota Full
                  </Badge>
                ) : m.isUnlimited ? (
                  <Badge variant="outline" className="text-[10px]">Unlimited</Badge>
                ) : (
                  <span className="text-xs text-slate-400">{m.percentUsed}%</span>
                )}
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {m.current}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {m.isUnlimited ? "Unlimited" : `/ ${m.limit} max`}
                </span>
              </div>

              {!m.isUnlimited && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.isExceeded
                        ? "bg-rose-500"
                        : m.percentUsed > 85
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, m.percentUsed)}%` }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Included Features Checklist */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Features Included in Your Current Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
            {enabledFeatures.map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono text-slate-700 dark:text-slate-200 capitalize">
                  {feat.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

