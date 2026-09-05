"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Society, Building, Unit, SocietyMembership, Profile, AuditLog, SocietyStatus } from "@/lib/types/database";
import {
  Building2,
  Users,
  Layers,
  DoorOpen,
  UserCheck,
  FileText,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Lock,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Settings,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export function SocietyDetailClient({
  society,
  buildings,
  units,
  members,
  admins,
  auditLogs,
}: {
  society: Society;
  buildings: Building[];
  units: Unit[];
  members: (SocietyMembership & { profile?: Profile })[];
  admins: (SocietyMembership & { profile?: Profile })[];
  auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const [currentSociety, setSociety] = useState<Society>(society);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const handleImpersonateAdmin = async () => {
    const targetAdmin = admins[0];
    if (!targetAdmin) {
      alert("No active Society Administrator registered for this society to impersonate.");
      return;
    }

    try {
      setIsImpersonating(true);
      const res = await fetch("/api/auth/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetAdmin.user_id,
          targetSocietyId: currentSociety.id,
          targetRoleId: "SOCIETY_ADMIN",
          reason: `Super Admin troubleshooting society: ${currentSociety.name}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = `/society/${currentSociety.id}/dashboard`;
      } else {
        alert(data.error || "Failed to start impersonation");
        setIsImpersonating(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error starting impersonation session");
      setIsImpersonating(false);
    }
  };

  const handleToggleStatus = async (nextStatus: SocietyStatus) => {
    if (!confirm(`Are you sure you want to change status to ${nextStatus}?`)) return;

    try {
      setIsStatusChanging(true);
      const res = await fetch(`/api/superadmin/societies/${currentSociety.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSociety({ ...currentSociety, status: nextStatus });
        router.refresh();
      } else {
        alert(data.error || "Failed to update society status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    } finally {
      setIsStatusChanging(false);
    }
  };

  const primaryAdmin = admins[0]?.profile;

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/societies">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{currentSociety.name}</h1>
                <Badge
                  variant={currentSociety.status === "ACTIVE" ? "success" : "warning"}
                  className="font-mono text-[10px]"
                >
                  {currentSociety.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Code: {currentSociety.code} &middot; Type: {currentSociety.society_type}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href={`/society/${currentSociety.id}/buildings`}>
            <Button variant="outline" className="text-xs h-9 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Layers className="w-4 h-4" /> Manage Hierarchy
            </Button>
          </Link>

          {admins.length > 0 && (
            <Button
              onClick={handleImpersonateAdmin}
              disabled={isImpersonating}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow"
            >
              {isImpersonating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              Login As Admin
            </Button>
          )}

          {currentSociety.status === "ACTIVE" ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={isStatusChanging}
              onClick={() => handleToggleStatus("SUSPENDED")}
              className="text-xs h-9"
            >
              Suspend Society
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isStatusChanging}
              onClick={() => handleToggleStatus("ACTIVE")}
              className="text-xs h-9 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              Activate Society
            </Button>
          )}
        </div>
      </div>

      {/* Onboarding In-Progress Banner */}
      {currentSociety.status === "ONBOARDING" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs">Onboarding In Progress: Physical Hierarchy Required</div>
              <div className="text-[11px] text-amber-700">
                Configure buildings, wings, floor plans, and residential units to complete onboarding and activate this society.
              </div>
            </div>
          </div>
          <Link href={`/society/${currentSociety.id}/buildings`}>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1 font-semibold shrink-0">
              Configure Hierarchy &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* Real Structural Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase">Buildings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{buildings.length}</div>
            <p className="text-[11px] text-slate-400">Registered towers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{units.length}</div>
            <p className="text-[11px] text-slate-400">Apartments & flats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{members.length}</div>
            <p className="text-[11px] text-slate-400">Active profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{admins.length}</div>
            <p className="text-[11px] text-slate-400">Society Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="buildings">Buildings ({buildings.length})</TabsTrigger>
          <TabsTrigger value="units">Units ({units.length})</TabsTrigger>
          <TabsTrigger value="people">People & Members ({members.length})</TabsTrigger>
          <TabsTrigger value="admins">Administrators ({admins.length})</TabsTrigger>
          <TabsTrigger value="activity">Audit Activity</TabsTrigger>
          <TabsTrigger value="future" className="text-slate-400">
            Billing & Features (Phase 2+)
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase text-slate-500">
                  Location & Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      {currentSociety.address_line_1 || currentSociety.address || "Address not specified"}
                    </div>
                    {currentSociety.address_line_2 && <div>{currentSociety.address_line_2}</div>}
                    <div>
                      {[currentSociety.city, currentSociety.district, currentSociety.state, currentSociety.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="text-slate-400">{currentSociety.country}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-700">
                    {currentSociety.contact_email || "No email specified"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-700">
                    {currentSociety.contact_phone || "No phone specified"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase text-slate-500">
                  Primary Society Administrator
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-3">
                {primaryAdmin ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                      {primaryAdmin.full_name?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{primaryAdmin.full_name}</div>
                      <div className="text-slate-500 font-mono">{primaryAdmin.email}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{primaryAdmin.phone || "No phone"}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No Society Admin registered.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BUILDINGS TAB */}
        <TabsContent value="buildings">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Buildings & Towers</CardTitle>
                <CardDescription className="text-xs">Physical towers and blocks registered for this society.</CardDescription>
              </div>
              <Link href={`/society/${currentSociety.id}/buildings`}>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Plus className="w-3.5 h-3.5" /> Add / Manage Hierarchy
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Floors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildings.length > 0 ? (
                    buildings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-semibold text-xs text-slate-900">{b.name}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">{b.code}</TableCell>
                        <TableCell className="text-xs text-slate-600">{b.number_of_floors}</TableCell>
                        <TableCell>
                          <Badge variant="success" className="font-mono text-[10px]">
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {formatDate(b.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No buildings configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UNITS TAB */}
        <TabsContent value="units">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Units & Flats</CardTitle>
                <CardDescription className="text-xs">Residential and commercial units across all buildings.</CardDescription>
              </div>
              <Link href={`/society/${currentSociety.id}/buildings`}>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Plus className="w-3.5 h-3.5" /> Add / Generate Units
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Area (Sq. Ft.)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.length > 0 ? (
                    units.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold text-xs text-slate-900 font-mono">
                          {u.unit_number}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{u.unit_type}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {u.area_sqft ? `${u.area_sqft} sq. ft.` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === "OCCUPIED" ? "success" : "secondary"}
                            className="font-mono text-[10px]"
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {formatDate(u.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No units created.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PEOPLE TAB */}
        <TabsContent value="people">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold">People & Memberships</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length > 0 ? (
                    members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900">
                            {m.profile?.full_name || "Member"}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">{m.profile?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="font-mono text-[10px]">
                            {m.role_id}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {m.unit_number || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success" className="font-mono text-[10px]">
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {formatDate(m.joined_at || m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No members registered.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMINS TAB */}
        <TabsContent value="admins">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold">Society Administrators</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrator</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-bold text-xs text-slate-900">
                        {admin.profile?.full_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {admin.profile?.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="purple" className="font-mono text-[10px]">
                          {admin.role_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={handleImpersonateAdmin}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5 gap-1"
                        >
                          <UserCheck className="w-3 h-3" /> Impersonate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT ACTIVITY TAB */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold">Society Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-slate-100 rounded text-slate-700 font-mono text-[10px]">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{log.action}</span> &middot;{" "}
                        <span className="text-slate-500 font-mono">{log.resource_type}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{formatDate(log.created_at)}</span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No audit events recorded yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUTURE PLACEHOLDERS TAB */}
        <TabsContent value="future">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Subscription & Billing</CardTitle>
                <CardDescription className="text-xs">
                  SaaS billing tier, per-unit subscription pricing, invoice history. (Phase 2)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Tenant Feature Flags</CardTitle>
                <CardDescription className="text-xs">
                  Enable/disable visitor check-in, WhatsApp alerts, digital payment gateways. (Phase 2)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Platform Analytics</CardTitle>
                <CardDescription className="text-xs">
                  App usage metrics, daily gate entries, ticket resolution velocity. (Phase 2)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

