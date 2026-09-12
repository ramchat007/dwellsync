"use client";

import React, { useState } from "react";
import {
  ManagementCompany,
  ManagementCompanyMember,
  CompanyRole,
  CompanyMemberStatus,
} from "@/lib/types/company";
import {
  Settings,
  Building,
  Users,
  Shield,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CompanySettingsClient({
  company: initialCompany,
  members: initialMembers,
  role,
}: {
  company: ManagementCompany;
  members: ManagementCompanyMember[];
  role: CompanyRole | "SUPER_ADMIN";
}) {
  const [company, setCompany] = useState<ManagementCompany>(initialCompany);
  const [members, setMembers] = useState<ManagementCompanyMember[]>(initialMembers);

  // Company Profile form state
  const [name, setName] = useState(company.name);
  const [legalName, setLegalName] = useState(company.legal_name || "");
  const [contactEmail, setContactEmail] = useState(company.contact_email || "");
  const [contactPhone, setContactPhone] = useState(company.contact_phone || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  // Add Member modal state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<CompanyRole>("COMPANY_OPERATIONS");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberErrorMsg, setMemberErrorMsg] = useState("");

  const isCompanyAdmin = role === "COMPANY_ADMIN" || role === "SUPER_ADMIN";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompanyAdmin) return;

    try {
      setIsSavingProfile(true);
      setProfileSuccessMsg("");
      setProfileErrorMsg("");

      const res = await fetch(`/api/company/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legal_name: legalName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update company profile");

      setCompany(data.company);
      setProfileSuccessMsg("Company settings saved successfully.");
    } catch (err: any) {
      setProfileErrorMsg(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) return;

    try {
      setIsSubmittingMember(true);
      setMemberErrorMsg("");

      const res = await fetch(`/api/company/${company.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");

      setMembers([data.member, ...members]);
      setIsAddMemberModalOpen(false);
      setNewMemberEmail("");
    } catch (err: any) {
      setMemberErrorMsg(err.message);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, nextRole: CompanyRole) => {
    try {
      const res = await fetch(`/api/company/${company.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setMembers(members.map((m) => (m.id === memberId ? data.member : m)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to revoke this member's access to the management company?")) {
      return;
    }

    try {
      const res = await fetch(`/api/company/${company.id}/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke member");

      setMembers(members.map((m) => (m.id === memberId ? data.member : m)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Company Settings & Administration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage company profile, contact channels, and organizational members.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600" />
          Company Profile
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!isCompanyAdmin}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Legal Entity Name</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={!isCompanyAdmin}
                className="mt-1 text-xs"
                placeholder="e.g. Acme Property Management Private Limited"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Company Code</label>
              <Input
                value={company.code}
                disabled
                className="mt-1 text-xs font-mono bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Contact Email</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!isCompanyAdmin}
                className="mt-1 text-xs"
                placeholder="ops@company.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!isCompanyAdmin}
                className="mt-1 text-xs"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {profileSuccessMsg && (
            <div className="p-2.5 rounded bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          {isCompanyAdmin && (
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSavingProfile}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
              >
                {isSavingProfile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Settings
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Member Administration Card */}
      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Company Members & Role Administration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized users with management company administrative or operational privileges.
            </p>
          </div>

          {isCompanyAdmin && (
            <Button
              size="sm"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Member
            </Button>
          )}
        </div>

        <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
          {members.map((m) => {
            const isActive = m.status === "ACTIVE";
            return (
              <div
                key={m.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {m.profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {m.profile?.full_name || "Company Member"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          isActive
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-slate-500 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {m.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.profile?.email || m.user_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCompanyAdmin && isActive ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as CompanyRole)}
                        className="text-xs border rounded-md px-2 py-1 bg-white border-slate-300 font-medium text-slate-700"
                      >
                        <option value="COMPANY_ADMIN">COMPANY_ADMIN (Rank 90)</option>
                        <option value="COMPANY_MANAGER">COMPANY_MANAGER (Rank 70)</option>
                        <option value="COMPANY_OPERATIONS">COMPANY_OPERATIONS (Rank 50)</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeMember(m.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                        title="Revoke Member Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs font-mono">
                      {m.role}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Member Modal */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Add Member to Management Company
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Registered Email Address</label>
              <Input
                type="email"
                placeholder="user@dwellsync.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
                className="mt-1 text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                User must already possess a registered DwellSync profile.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Assigned Company Role</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as CompanyRole)}
                className="w-full mt-1 text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300"
              >
                <option value="COMPANY_OPERATIONS">COMPANY_OPERATIONS (Operational View & Staff Access)</option>
                <option value="COMPANY_MANAGER">COMPANY_MANAGER (Staff & Operations Management)</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN (Full Company & Member Administration)</option>
              </select>
            </div>

            {memberErrorMsg && (
              <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{memberErrorMsg}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingMember || !newMemberEmail}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
              >
                {isSubmittingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

