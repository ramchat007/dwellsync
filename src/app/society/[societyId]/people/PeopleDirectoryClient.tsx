"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SocietyMembership, Profile, RoleId } from "@/lib/types/database";
import {
  Users,
  Search,
  Shield,
  Building2,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Send,
  Plus,
  Loader2,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

const ROLE_OPTIONS: { label: string; value: RoleId; category: string }[] = [
  { label: "Society Admin", value: "SOCIETY_ADMIN", category: "Committee" },
  { label: "Secretary", value: "SECRETARY", category: "Committee" },
  { label: "Treasurer", value: "TREASURER", category: "Committee" },
  { label: "Committee Member", value: "COMMITTEE_MEMBER", category: "Committee" },
  { label: "Facility Manager", value: "MANAGER", category: "Staff" },
  { label: "Property Owner", value: "OWNER", category: "Owners" },
  { label: "Resident", value: "RESIDENT", category: "Residents" },
  { label: "Tenant", value: "TENANT", category: "Tenants" },
  { label: "Security Guard", value: "SECURITY", category: "Security" },
  { label: "Staff / Housekeeping", value: "STAFF", category: "Staff" },
  { label: "Vendor Service Provider", value: "VENDOR", category: "Vendors" },
  { label: "Auditor", value: "AUDITOR", category: "Staff" },
];

export function PeopleDirectoryClient({
  societyId,
  initialMembers,
}: {
  societyId: string;
  initialMembers: (SocietyMembership & { profile: Profile })[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<(SocietyMembership & { profile: Profile })[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteSuccessToken, setInviteSuccessToken] = useState<string | null>(null);

  // Forms
  const [addForm, setAddForm] = useState<{
    full_name: string;
    email: string;
    role_id: RoleId;
    unit_number: string;
  }>({
    full_name: "",
    email: "",
    role_id: "RESIDENT",
    unit_number: "",
  });

  const [inviteForm, setInviteForm] = useState<{
    email: string;
    role_id: RoleId;
    unit_number: string;
  }>({
    email: "",
    role_id: "RESIDENT",
    unit_number: "",
  });

  const filtered = members.filter((m) => {
    const name = m.profile?.full_name || m.profile?.display_name || "";
    const email = m.profile?.email || "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      (m.unit_number && m.unit_number.toLowerCase().includes(search.toLowerCase()));

    let matchesTab = true;
    if (activeTab === "owners") matchesTab = m.role_id === "OWNER";
    else if (activeTab === "residents") matchesTab = m.role_id === "RESIDENT";
    else if (activeTab === "tenants") matchesTab = m.role_id === "TENANT";
    else if (activeTab === "committee") {
      matchesTab = ["SOCIETY_ADMIN", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(m.role_id);
    } else if (activeTab === "staff") {
      matchesTab = ["MANAGER", "STAFF", "AUDITOR"].includes(m.role_id);
    } else if (activeTab === "security") matchesTab = m.role_id === "SECURITY";
    else if (activeTab === "vendors") matchesTab = m.role_id === "VENDOR";

    return matchesSearch && matchesTab;
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/society/${societyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddMemberOpen(false);
        setAddForm({ full_name: "", email: "", role_id: "RESIDENT", unit_number: "" });
        router.refresh();
      } else {
        setActionError(data.error || "Failed to add member");
      }
    } catch (err) {
      console.error(err);
      setActionError("Error saving member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/society/${societyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteSuccessToken(data.data.token);
      } else {
        setActionError(data.error || "Failed to send invitation");
      }
    } catch (err) {
      console.error(err);
      setActionError("Error dispatching invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">People & Society Directory</h1>
          <p className="text-xs text-slate-500">
            Resident directory, committee members, owners, tenants, and staff roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setActionError(null);
              setInviteSuccessToken(null);
              setIsInviteOpen(true);
            }}
            variant="outline"
            className="text-xs gap-1.5 border-slate-300"
          >
            <Send className="w-3.5 h-3.5" /> Invite Person
          </Button>

          <Button
            onClick={() => {
              setActionError(null);
              setIsAddMemberOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Member
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 p-1 flex-wrap">
            <TabsTrigger value="all">All ({members.length})</TabsTrigger>
            <TabsTrigger value="owners">Owners</TabsTrigger>
            <TabsTrigger value="residents">Residents</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="committee">Committee</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search by name, email, flat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member Name & Email</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Unit / Flat</TableHead>
              <TableHead>Membership Status</TableHead>
              <TableHead className="text-right">Joined Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {member.profile?.full_name?.[0]?.toUpperCase() ||
                          member.profile?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {member.profile?.full_name || member.profile?.display_name || "Member"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {member.profile?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="default" className="font-mono text-[10px]">
                      {member.role_id}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs font-mono font-medium text-slate-700">
                    {member.unit_number || "—"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={member.status === "ACTIVE" ? "success" : "secondary"}
                      className="font-mono text-[10px]"
                    >
                      {member.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs text-slate-500">
                    {formatDate(member.joined_at || member.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  {search || activeTab !== "all"
                    ? "No matching people found."
                    : "No members registered in this society."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogHeader>
          <DialogTitle>Add Person / Society Member</DialogTitle>
          <DialogDescription>
            Register a resident, property owner, committee official or staff member.
          </DialogDescription>
        </DialogHeader>

        {actionError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
            {actionError}
          </div>
        )}

        <form onSubmit={handleAddMember} className="space-y-3.5 mt-2 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Full Name *</label>
            <Input
              required
              placeholder="e.g. Anand Mahindra"
              value={addForm.full_name}
              onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Email Address *</label>
            <Input
              type="email"
              required
              placeholder="anand@dwellsync.internal"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Society Role *</label>
              <Select
                value={addForm.role_id}
                onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value as RoleId })}
                className="text-xs"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Unit / Flat (Optional)</label>
              <Input
                placeholder="e.g. A-302"
                value={addForm.unit_number}
                onChange={(e) => setAddForm({ ...addForm, unit_number: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddMemberOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Add Member
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Invite Person Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogHeader>
          <DialogTitle>Invite Person to {societyId ? "Society" : "DwellSync"}</DialogTitle>
          <DialogDescription>
            Generates a single-use invitation token with a 7-day expiration.
          </DialogDescription>
        </DialogHeader>

        {inviteSuccessToken ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Invitation Token Generated!</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Share this secure token or invitation link with the recipient to complete their onboarding:
            </p>
            <div className="font-mono bg-white p-2.5 rounded border border-emerald-300 text-slate-800 break-all select-all text-[10px]">
              {inviteSuccessToken}
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteSuccessToken(null);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-3.5 mt-2 text-xs">
            {actionError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
                {actionError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Recipient Email *</label>
              <Input
                type="email"
                required
                placeholder="resident@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Target Role *</label>
                <Select
                  value={inviteForm.role_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value as RoleId })}
                  className="text-xs"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Unit / Flat (Optional)</label>
                <Input
                  placeholder="e.g. B-104"
                  value={inviteForm.unit_number}
                  onChange={(e) => setInviteForm({ ...inviteForm, unit_number: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}

