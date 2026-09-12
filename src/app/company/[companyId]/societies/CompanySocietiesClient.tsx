"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ManagementCompany,
  ManagementCompanySociety,
  ManagementCompanyMember,
  CompanyRole,
} from "@/lib/types/company";
import {
  Building2,
  Plus,
  ArrowRight,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CompanySocietiesClient({
  company,
  societies: initialSocieties,
  members,
  role,
}: {
  company: ManagementCompany;
  societies: ManagementCompanySociety[];
  members: ManagementCompanyMember[];
  role: CompanyRole | "SUPER_ADMIN";
}) {
  const [societies, setSocieties] = useState<ManagementCompanySociety[]>(initialSocieties);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetSocietyId, setTargetSocietyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedSocietyForAccess, setSelectedSocietyForAccess] = useState<ManagementCompanySociety | null>(null);
  const [accessList, setAccessList] = useState<any[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState("");

  const isCompanyAdmin = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";

  const filteredSocieties = societies.filter((item) => {
    const name = item.society?.name || "";
    const code = item.society?.code || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAssignSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSocietyId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      const res = await fetch(`/api/company/${company.id}/societies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ society_id: targetSocietyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign society");

      setSocieties([data.assignment, ...societies]);
      setIsAssignModalOpen(false);
      setTargetSocietyId("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSocietyStatus = async (societyAssignmentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/company/${company.id}/societies/${societyAssignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update society status");

      setSocieties(societies.map((s) => (s.id === societyAssignmentId ? data.assignment : s)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenAccessModal = async (soc: ManagementCompanySociety) => {
    setSelectedSocietyForAccess(soc);
    if (!soc.society) return;
    try {
      setIsLoadingAccess(true);
      const res = await fetch(`/api/company/${company.id}/societies/${soc.society.id}/access`);
      const data = await res.json();
      if (res.ok) {
        setAccessList(data.access || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedSocietyForAccess || !targetMemberId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(
        `/api/company/${company.id}/societies/${selectedSocietyForAccess.society?.id}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            management_company_member_id: targetMemberId,
            management_company_society_id: selectedSocietyForAccess.id,
            status: "ACTIVE",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant access");

      // Reload access
      handleOpenAccessModal(selectedSocietyForAccess);
      setTargetMemberId("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Managed Societies
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Societies under management by {company.name}.
          </p>
        </div>

        {isCompanyAdmin && (
          <Button
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Assign Society
          </Button>
        )}
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Search societies by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{societies.length}</span> societies
        </div>
      </div>

      {/* Societies List */}
      <Card className="p-0 bg-white border-slate-200 overflow-hidden shadow-sm">
        {filteredSocieties.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No managed societies found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {isCompanyAdmin
                ? "Click 'Assign Society' above to onboard a society to this management company."
                : "No societies have been assigned or made accessible to you."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSocieties.map((item) => {
              const s = item.society;
              if (!s) return null;
              const isActive = item.status === "ACTIVE";

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{s.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {s.code}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            isActive
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 bg-slate-100 border-slate-200"
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {s.city ? `${s.city}, ${s.state || ""}` : "Housing Society"} • Assigned:{" "}
                        {new Date(item.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCompanyAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAccessModal(item)}
                          className="text-xs h-8"
                        >
                          <Users className="w-3.5 h-3.5 mr-1" />
                          Access Grants
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSocietyStatus(item.id, item.status)}
                          className="text-xs h-8 text-slate-600 hover:text-slate-900"
                        >
                          {isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </>
                    )}

                    {isActive && (
                      <Link href={`/society/${s.id}/dashboard`}>
                        <Button size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700">
                          Workspace
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Assign Society Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Assign Society to Management Company
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignSociety} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Society ID (UUID)</label>
              <Input
                placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                value={targetSocietyId}
                onChange={(e) => setTargetSocietyId(e.target.value)}
                required
                className="mt-1 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Note: A society can belong to at most one active management company at a time.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !targetSocietyId}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Assign Society"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Society Member Access Modal */}
      <Dialog open={!!selectedSocietyForAccess} onOpenChange={() => setSelectedSocietyForAccess(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Explicit Access Grants: {selectedSocietyForAccess?.society?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Only company members explicitly granted access here can view and operate inside this society.
            </p>

            {/* Grant access form */}
            {isCompanyAdmin && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="flex-1 text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300"
                >
                  <option value="">Select Company Member...</option>
                  {members
                    .filter((m) => m.status === "ACTIVE")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profile?.full_name || m.user_id} ({m.role})
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  disabled={!targetMemberId || isSubmitting}
                  onClick={handleGrantAccess}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 h-8"
                >
                  Grant Access
                </Button>
              </div>
            )}

            {/* Access List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
              {isLoadingAccess ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading access list...</div>
              ) : accessList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No explicit access grants for this society yet.
                </div>
              ) : (
                accessList.map((acc: any) => (
                  <div key={acc.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {acc.member?.profile?.full_name || acc.member?.user_id}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Role: {acc.member?.role} • Status: {acc.status}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50">
                      {acc.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSocietyForAccess(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

