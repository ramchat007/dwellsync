"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  AlertTriangle,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

interface AccessRequestRecord {
  id: string;
  society_id: string;
  user_id: string;
  unit_number: string;
  requested_role: string;
  status: string;
  created_at: string;
  applicant?: {
    id: string;
    full_name?: string | null;
    display_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

interface AccessRequestsAdminClientProps {
  societyId: string;
  societyName: string;
  initialRequests: AccessRequestRecord[];
}

export function AccessRequestsAdminClient({
  societyId,
  societyName,
  initialRequests,
}: AccessRequestsAdminClientProps) {
  const [requests, setRequests] = useState<AccessRequestRecord[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Approve Dialog
  const [approvingRequest, setApprovingRequest] = useState<AccessRequestRecord | null>(null);
  const [approvedRole, setApprovedRole] = useState<string>("RESIDENT");
  const [approvedUnit, setApprovedUnit] = useState<string>("");
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Reject Dialog
  const [rejectingRequest, setRejectingRequest] = useState<AccessRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/society/${societyId}/access-requests`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(data.requests || []);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to fetch access requests." });
      }
    } catch (e) {
      setFeedback({ type: "error", message: "Network error fetching access requests." });
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const handleOpenApprove = (req: AccessRequestRecord) => {
    setApprovingRequest(req);
    setApprovedRole(req.requested_role || "RESIDENT");
    setApprovedUnit(req.unit_number || "");
    setApproveError(null);
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    setIsSubmittingApprove(true);
    setApproveError(null);

    try {
      const res = await fetch(
        `/api/society/${societyId}/access-requests/${approvingRequest.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: approvedRole,
            unit_number: approvedUnit.trim() || approvingRequest.unit_number,
          }),
        }
      );

      const result = await res.json();

      if (res.ok && result.success) {
        setApprovingRequest(null);
        setFeedback({
          type: "success",
          message: `Access approved for ${
            approvingRequest.applicant?.full_name || approvingRequest.applicant?.email || "applicant"
          }.`,
        });
        fetchRequests();
      } else {
        setApproveError(result.error || "Failed to approve request.");
      }
    } catch (e) {
      setApproveError("Network error while approving request.");
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleOpenReject = (req: AccessRequestRecord) => {
    setRejectingRequest(req);
    setRejectionReason("");
    setRejectError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsSubmittingReject(true);
    setRejectError(null);

    try {
      const res = await fetch(
        `/api/society/${societyId}/access-requests/${rejectingRequest.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: rejectionReason.trim() || "Administrative decision.",
          }),
        }
      );

      const result = await res.json();

      if (res.ok && result.success) {
        setRejectingRequest(null);
        setFeedback({
          type: "success",
          message: `Request for ${
            rejectingRequest.applicant?.full_name || rejectingRequest.applicant?.email || "applicant"
          } was rejected.`,
        });
        fetchRequests();
      } else {
        setRejectError(result.error || "Failed to reject request.");
      }
    } catch (e) {
      setRejectError("Network error while rejecting request.");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Society Access Requests"
        description={`Review, verify, and approve incoming resident or tenant requests for ${societyName}.`}
        badge={
          <Badge variant={requests.length > 0 ? "warning" : "secondary"} className="font-mono text-xs">
            {requests.length} PENDING
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/society/${societyId}/members`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Members Roster
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
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

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Applicant</TableHead>
                <TableHead>Requested Unit</TableHead>
                <TableHead>Requested Role</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading pending access requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    All access requests have been reviewed. No pending applicants.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs uppercase shrink-0">
                          {r.applicant?.full_name?.charAt(0) || r.applicant?.email?.charAt(0) || "A"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-xs truncate">
                            {r.applicant?.full_name || r.applicant?.display_name || "Applicant"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{r.applicant?.email || "No email"}</span>
                          </div>
                          {r.applicant?.phone && (
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{r.applicant.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {r.unit_number || "Unassigned"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {r.requested_role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {formatDate(r.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenApprove(r)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 h-8"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReject(r)}
                          className="border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1 h-8"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Approval Dialog */}
      {approvingRequest && (
        <Dialog open={!!approvingRequest} onOpenChange={(open) => !open && setApprovingRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Approve Society Access
              </DialogTitle>
              <DialogDescription className="text-xs">
                Confirm role assignment and unit linkage for{" "}
                <strong>{approvingRequest.applicant?.full_name || approvingRequest.applicant?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            {approveError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {approveError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Approved Role</label>
                <Select
                  value={approvedRole}
                  onChange={(e) => setApprovedRole(e.target.value)}
                  className="text-xs"
                >
                  <option value="OWNER">Property Owner</option>
                  <option value="TENANT">Tenant (Resident)</option>
                  <option value="RESIDENT">Resident</option>
                </Select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Only non-administrative roles (Owner, Tenant, Resident) can be approved through access requests.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Unit</label>
                <Input
                  value={approvedUnit}
                  onChange={(e) => setApprovedUnit(e.target.value)}
                  placeholder="e.g. A-101"
                  className="text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-[11px] text-emerald-900">
                Approving this request creates an active society membership, assigns the resident to the unit, and notifies the applicant.
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingRequest(null)}
                className="text-xs"
                disabled={isSubmittingApprove}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmApprove}
                disabled={isSubmittingApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {isSubmittingApprove ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Dialog */}
      {rejectingRequest && (
        <Dialog open={!!rejectingRequest} onOpenChange={(open) => !open && setRejectingRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                Reject Society Access Request
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide a reason for rejecting the request from{" "}
                <strong>{rejectingRequest.applicant?.full_name || rejectingRequest.applicant?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            {rejectError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {rejectError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rejection Reason</label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unverified tenancy agreement or invalid unit number."
                  className="text-xs"
                />
              </div>

              <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg text-[11px] text-red-900">
                Rejecting will close this request. The applicant will see the rejection status and reason in their onboarding console.
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingRequest(null)}
                className="text-xs"
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="text-xs"
              >
                {isSubmittingReject ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
