"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { RoleId, MembershipStatus, Profile, SocietyMembership } from "@/lib/types/database";
import { ALLOWED_ASSIGNABLE_ROLES, VALID_MEMBERSHIP_STATUSES } from "@/lib/auth/societyAdmin";
import {
  Users,
  Search,
  Shield,
  Building2,
  Mail,
  Phone,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export interface MemberRecord {
  id: string;
  society_id: string;
  user_id: string;
  role_id: RoleId;
  unit_number?: string | null;
  status: MembershipStatus;
  joined_at?: string | null;
  left_at?: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MembersRosterClientProps {
  societyId: string;
  societyName: string;
  currentUserId: string;
  currentUserRole: string;
  initialMembers: any[];
  initialPagination: PaginationMeta;
}

export function MembersRosterClient({
  societyId,
  societyName,
  currentUserId,
  currentUserRole,
  initialMembers,
  initialPagination,
}: MembersRosterClientProps) {
  const [members, setMembers] = useState<MemberRecord[]>(initialMembers);
  const [pagination, setPagination] = useState<PaginationMeta>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [unitFilter, setUnitFilter] = useState<string>("");

  // Detail Modal
  const [detailMember, setDetailMember] = useState<MemberRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Edit Role & Unit Modal
  const [editMember, setEditMember] = useState<MemberRecord | null>(null);
  const [editRole, setEditRole] = useState<RoleId>("RESIDENT");
  const [editUnit, setEditUnit] = useState<string>("");
  const [editStatus, setEditStatus] = useState<MembershipStatus>("ACTIVE");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Remove Modal
  const [removeMember, setRemoveMember] = useState<MemberRecord | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // General Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMembers = useCallback(
    async (
      page: number = pagination.page,
      pageSize: number = pagination.pageSize,
      search: string = searchTerm,
      role: string = roleFilter,
      status: string = statusFilter,
      unit: string = unitFilter
    ) => {
      setLoading(true);
      setFeedback(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(page));
        queryParams.set("pageSize", String(pageSize));

        if (search.trim()) queryParams.set("search", search.trim());
        if (role !== "ALL") queryParams.set("role", role);
        if (status !== "ALL") queryParams.set("status", status);
        if (unit.trim()) queryParams.set("unitNumber", unit.trim());

        const res = await fetch(`/api/society/${societyId}/members?${queryParams.toString()}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setMembers(data.data || []);
          if (data.pagination) {
            setPagination(data.pagination);
          }
        } else {
          setFeedback({ type: "error", message: data.error || "Failed to fetch members" });
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: "Network error fetching members." });
      } finally {
        setLoading(false);
      }
    },
    [societyId, pagination.page, pagination.pageSize, searchTerm, roleFilter, statusFilter, unitFilter]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(1, pagination.pageSize, searchTerm, roleFilter, statusFilter, unitFilter);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setUnitFilter("");
    fetchMembers(1, pagination.pageSize, "", "ALL", "ALL", "");
  };

  const handleOpenDetail = (m: MemberRecord) => {
    setDetailMember(m);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (m: MemberRecord) => {
    setEditMember(m);
    setEditRole(m.role_id);
    setEditUnit(m.unit_number || "");
    setEditStatus(m.status);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editMember) return;
    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/society/${societyId}/members/${editMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: editRole,
          unit_number: editUnit.trim() || null,
          status: editStatus,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setIsEditOpen(false);
        setFeedback({
          type: "success",
          message: `Successfully updated ${editMember.profile?.full_name || "member"}.`,
        });
        fetchMembers();
      } else {
        setEditError(result.error || "Failed to update member role.");
      }
    } catch (err: any) {
      setEditError("Network error while updating member.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenRemove = (m: MemberRecord) => {
    setRemoveMember(m);
    setRemoveError(null);
    setIsRemoveOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!removeMember) return;
    setIsSubmittingRemove(true);
    setRemoveError(null);

    try {
      const res = await fetch(`/api/society/${societyId}/members/${removeMember.id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setIsRemoveOpen(false);
        setFeedback({
          type: "success",
          message: `Membership for ${removeMember.profile?.full_name || "member"} was removed.`,
        });
        fetchMembers();
      } else {
        setRemoveError(result.error || "Failed to remove membership.");
      }
    } catch (err: any) {
      setRemoveError("Network error while removing membership.");
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  const getStatusBadge = (status: MembershipStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">ACTIVE</Badge>;
      case "INVITED":
        return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">INVITED</Badge>;
      case "SUSPENDED":
        return <Badge variant="warning">SUSPENDED</Badge>;
      case "REMOVED":
        return <Badge variant="destructive">REMOVED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadgeVariant = (role: RoleId) => {
    switch (role) {
      case "SOCIETY_ADMIN":
      case "SECRETARY":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "TREASURER":
      case "COMMITTEE_MEMBER":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MANAGER":
      case "STAFF":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "SECURITY":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "OWNER":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "TENANT":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const isSelf = (m: MemberRecord) => m.user_id === currentUserId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Society Members Roster"
        description={`Manage memberships, roles, unit associations, and statuses for ${societyName}.`}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {pagination.total} TOTAL MEMBERS
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/society/${societyId}/access-requests`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Pending Requests
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMembers()}
              disabled={loading}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search text */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search by name, email, or unit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              {/* Role filter */}
              <div>
                <Select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    fetchMembers(1, pagination.pageSize, searchTerm, e.target.value, statusFilter, unitFilter);
                  }}
                  className="text-xs"
                >
                  <option value="ALL">All Roles</option>
                  {ALLOWED_ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Status filter */}
              <div>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    fetchMembers(1, pagination.pageSize, searchTerm, roleFilter, e.target.value, unitFilter);
                  }}
                  className="text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  {VALID_MEMBERSHIP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="w-full text-xs" disabled={loading}>
                  <Filter className="w-3.5 h-3.5 mr-1" /> Filter
                </Button>
                {(searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL" || unitFilter) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Roster Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Member Details</TableHead>
                <TableHead>Assigned Unit</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading society members roster...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No members match the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const selfUser = isSelf(m);
                  return (
                    <TableRow key={m.id} className={selfUser ? "bg-indigo-50/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs uppercase shrink-0">
                            {m.profile?.full_name?.charAt(0) || m.profile?.email?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              <span className="truncate">{m.profile?.full_name || m.profile?.display_name || "User"}</span>
                              {selfUser && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-indigo-100 text-indigo-700">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{m.profile?.email || "No email"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {m.unit_number ? (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {m.unit_number}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getRoleBadgeVariant(
                            m.role_id
                          )}`}
                        >
                          {m.role_id.replace(/_/g, " ")}
                        </span>
                      </TableCell>

                      <TableCell>{getStatusBadge(m.status)}</TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {m.joined_at ? formatDate(m.joined_at) : formatDate(m.created_at)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(m)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(m)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600"
                            title={selfUser ? "Cannot modify own role (Escalation Defense)" : "Edit Role & Unit"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRemove(m)}
                            disabled={selfUser}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 disabled:opacity-30"
                            title={selfUser ? "Cannot remove yourself" : "Remove Member"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={String(pagination.pageSize)}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                fetchMembers(1, newSize);
              }}
              className="w-20 h-8 text-xs"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
            <span>entries &middot; Total {pagination.total} records</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMembers(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMembers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Member Details Modal */}
      {detailMember && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Member Profile Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Comprehensive record for {detailMember.profile?.full_name || "member"} within {societyName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Full Name</span>
                  <span className="font-semibold text-slate-800">
                    {detailMember.profile?.full_name || detailMember.profile?.display_name || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="font-semibold text-slate-800">{detailMember.profile?.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-semibold text-slate-800">{detailMember.profile?.phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Unit</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {detailMember.unit_number || "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Role</span>
                  <span className="font-semibold text-slate-800">{detailMember.role_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Membership Status</span>
                  {getStatusBadge(detailMember.status)}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Joined At</span>
                  <span className="text-slate-700">
                    {detailMember.joined_at ? formatDate(detailMember.joined_at) : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Created At</span>
                  <span className="text-slate-700">{formatDate(detailMember.created_at)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600 space-y-1">
                <div>Membership ID: {detailMember.id}</div>
                <div>User ID: {detailMember.user_id}</div>
                <div>Society ID: {detailMember.society_id}</div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Role & Unit Modal */}
      {editMember && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Modify Member Role & Assignment
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update society authorization for {editMember.profile?.full_name || editMember.profile?.email}.
              </DialogDescription>
            </DialogHeader>

            {isSelf(editMember) ? (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Privilege Escalation Defense Active</div>
                  <p className="mt-0.5 text-amber-700">
                    You cannot modify your own assigned role or status. Request another Society Administrator or Secretary to update your account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {editError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                  <Select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as RoleId)}
                    className="text-xs"
                  >
                    {ALLOWED_ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    SUPER_ADMIN platform role cannot be assigned inside society scopes.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Number</label>
                  <Input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="e.g. A-101, B-402"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Membership Status</label>
                  <Select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MembershipStatus)}
                    className="text-xs"
                  >
                    {VALID_MEMBERSHIP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              {!isSelf(editMember) && (
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmittingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isSubmittingEdit ? "Saving Changes..." : "Save Changes"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Member Confirmation Modal */}
      {removeMember && (
        <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" />
                Remove Society Member
              </DialogTitle>
              <DialogDescription className="text-xs">
                Confirm removing membership for {removeMember.profile?.full_name || removeMember.profile?.email}.
              </DialogDescription>
            </DialogHeader>

            {removeError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {removeError}
              </div>
            )}

            <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg text-xs text-slate-700 space-y-2">
              <p>
                Are you sure you want to deactivate and remove this membership from <strong>{societyName}</strong>?
              </p>
              <p className="text-slate-500 text-[11px]">
                The member status will be transitioned to <strong>REMOVED</strong>, revoking all tenant access permissions immediately. This action is recorded in the immutable audit log.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRemoveOpen(false)}
                className="text-xs"
                disabled={isSubmittingRemove}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmRemove}
                disabled={isSubmittingRemove}
                className="text-xs"
              >
                {isSubmittingRemove ? "Removing..." : "Confirm Removal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
