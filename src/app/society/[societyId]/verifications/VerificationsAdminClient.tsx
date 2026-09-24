"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Car,
  FileText,
  Copy,
  ExternalLink,
  Share2,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Home,
  User,
  Zap,
  Check,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SocietyAccessRequest } from "@/lib/types/database";

interface VerificationsAdminClientProps {
  societyId: string;
  societyName: string;
  initialRequests: SocietyAccessRequest[];
}

export function VerificationsAdminClient({
  societyId,
  societyName,
  initialRequests,
}: VerificationsAdminClientProps) {
  const [requests, setRequests] = useState<SocietyAccessRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SocietyAccessRequest | null>(null);

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<SocietyAccessRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/join/${societyId}`);
    }
  }, [societyId]);

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Residents of ${societyName},\n\nPlease complete your self-onboarding to register your flat, vehicles, and upload your Index II or Rent Agreement on DwellSync:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleApprove = async (request: SocietyAccessRequest) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/society/${societyId}/access-requests/${request.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Approval failed.");
      }

      setFeedback({
        type: "success",
        message: `Successfully verified and provisioned Flat ${request.unit_number} for ${request.applicant_name}!`,
      });

      // Update state locally
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "APPROVED", reviewed_at: new Date().toISOString() } : r
        )
      );
      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to approve request." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/society/${societyId}/access-requests/${rejectingRequest.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          notes: rejectionNotes || "Verification details did not match records.",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Rejection failed.");
      }

      setFeedback({
        type: "success",
        message: `Application for Flat ${rejectingRequest.unit_number} has been rejected.`,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectingRequest.id
            ? { ...r, status: "REJECTED", notes: rejectionNotes, reviewed_at: new Date().toISOString() }
            : r
        )
      );

      setRejectingRequest(null);
      setRejectionNotes("");
      if (selectedRequest?.id === rejectingRequest.id) {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to reject request." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (activeTab !== "ALL" && r.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      r.unit_number?.toLowerCase().includes(query) ||
      r.applicant_name?.toLowerCase().includes(query) ||
      r.applicant_email?.toLowerCase().includes(query) ||
      r.applicant_phone?.toLowerCase().includes(query) ||
      r.building_name?.toLowerCase().includes(query)
    );
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const totalVehicles = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + (r.vehicles?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Resident Onboarding & Verification"
        description={`Manage shareable self-registration links, Index II statutory proofs, and vehicle allotments for ${societyName}.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/society/${societyId}/access-requests`}>
              <Button variant="outline" size="sm">
                Standard Access Requests
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={shareViaWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share on WhatsApp
            </Button>
          </div>
        }
      />

      {/* Shareable Link Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-200 text-xs font-semibold mb-2.5 border border-indigo-500/30">
              <Share2 className="w-3.5 h-3.5" />
              Resident Self-Service Onboarding Link
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Invite Flat Owners & Tenants to Register
            </h2>
            <p className="text-xs text-indigo-200/90 mt-1 leading-relaxed">
              Share this permanent link in your society WhatsApp group or email notice. Residents can submit their flat specs, parking slots, vehicle plate numbers, and upload their Index II or Rent Agreement directly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono text-indigo-100 border border-white/10 truncate max-w-xs sm:max-w-sm">
              {shareUrl || `/join/${societyId}`}
            </div>
            <Button
              onClick={copyShareLink}
              size="sm"
              className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
            <a
              href={`/join/${societyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
              title="Open public form"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Verifications</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Approved & Provisioned Units</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {approvedCount}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Registered Vehicles</p>
              <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {totalVehicles}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Car className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 w-fit">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {tab === "ALL"
                ? `All (${requests.length})`
                : tab === "PENDING"
                ? `Pending (${pendingCount})`
                : tab === "APPROVED"
                ? `Approved (${approvedCount})`
                : `Rejected (${requests.filter((r) => r.status === "REJECTED").length})`}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flat number, resident name, or email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No verification requests found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try adjusting your search keywords."
                : "Share your onboarding link with flat owners and tenants to start receiving applications."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === "PENDING";
            const isApproved = req.status === "APPROVED";
            const isRejected = req.status === "REJECTED";

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
              >
                {/* Left: Unit & Applicant Details */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                      Flat {req.unit_number}
                    </span>
                    {req.building_name && (
                      <span className="text-xs text-slate-500 font-medium">
                        {req.building_name} {req.wing_name ? `• Wing ${req.wing_name}` : ""}
                        {req.floor_number ? ` • Floor ${req.floor_number}` : ""}
                      </span>
                    )}
                    <Badge
                      className={
                        req.requested_role === "OWNER"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200"
                      }
                    >
                      {req.requested_role === "OWNER" ? "Flat Owner" : "Tenant"}
                    </Badge>
                    <Badge
                      className={
                        isPending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : isApproved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {req.applicant_name || "Applicant"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{req.applicant_phone || "No phone"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{req.applicant_email || "No email"}</span>
                    </div>
                  </div>

                  {/* Badges for Specs: Area, Parking, Vehicles, Documents */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {req.unit_type && (
                      <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300">
                        {req.unit_type.replace(/_/g, " ")}
                      </span>
                    )}

                    {req.area_sqft && (
                      <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300">
                        {req.area_sqft} sq.ft.
                      </span>
                    )}

                    {req.has_parking && req.parking_slot_number && (
                      <span className="text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Car className="w-3 h-3" /> Slot: {req.parking_slot_number}
                      </span>
                    )}

                    {req.vehicles && req.vehicles.length > 0 && (
                      <span className="text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {req.vehicles.length} Vehicle(s)
                        {req.vehicles.some((v) => v.is_ev) && " (EV)"}
                      </span>
                    )}

                    {req.document_url ? (
                      <a
                        href={req.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        {req.document_type || "Index II"} (View Proof)
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> No Document Uploaded
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(req)}
                    className="text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Inspect & Verify
                  </Button>

                  {isPending && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req)}
                        disabled={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Approve & Provision
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectingRequest(req)}
                        disabled={isProcessing}
                        className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECTION MODAL */}
      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className={
                      selectedRequest.requested_role === "OWNER"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-purple-100 text-purple-800"
                    }
                  >
                    {selectedRequest.requested_role === "OWNER" ? "Flat Owner" : "Tenant"}
                  </Badge>
                  <Badge variant="outline">{selectedRequest.status}</Badge>
                </div>
                <DialogTitle className="text-xl font-bold">
                  Verification Dossier: Flat {selectedRequest.unit_number}
                </DialogTitle>
                <DialogDescription>
                  Review applicant proof document against declared flat layout and vehicles.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-3 text-xs">
                {/* Section 1: Resident & Contact */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Applicant Information
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">FULL NAME</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.applicant_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">PHONE</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.applicant_phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">EMAIL</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.applicant_email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SUBMITTED AT</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedRequest.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Unit Physical Details */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Unit Physical Specifications
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">TOWER</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.building_name || "Main Tower"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">WING / FLOOR</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.wing_name || "—"} / {selectedRequest.floor_number ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CARPET AREA</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.area_sqft ? `${selectedRequest.area_sqft} sq.ft.` : "Not declared"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Parking & Registered Vehicles */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Parking & Vehicle Registry
                  </span>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 block text-[10px]">PARKING SLOT</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRequest.has_parking && selectedRequest.parking_slot_number
                          ? `${selectedRequest.parking_slot_number} (${selectedRequest.parking_type || "Covered"})`
                          : "No dedicated slot"}
                      </span>
                    </div>
                  </div>

                  {selectedRequest.vehicles && selectedRequest.vehicles.length > 0 ? (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700 pt-1">
                      {selectedRequest.vehicles.map((v, i) => (
                        <div key={i} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {v.plate_number}
                            </span>
                            <span className="text-slate-500 ml-2">
                              {v.make_model || v.vehicle_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.is_ev ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                <Zap className="w-3 h-3 mr-0.5" /> EV
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {v.fuel_type || "PETROL"}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {v.vehicle_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic block">No vehicles declared</span>
                  )}
                </div>

                {/* Section 4: Proof Document Preview */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Proof Document: {selectedRequest.document_type || "Index II"}
                    </span>
                    {selectedRequest.document_url && (
                      <a
                        href={selectedRequest.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Full Document
                      </a>
                    )}
                  </div>

                  {selectedRequest.document_url ? (
                    <div className="mt-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center min-h-[140px]">
                      {selectedRequest.document_name?.toLowerCase().endsWith(".pdf") ? (
                        <div className="text-center py-4">
                          <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                            {selectedRequest.document_name}
                          </span>
                          <a
                            href={selectedRequest.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> View / Download PDF
                          </a>
                        </div>
                      ) : (
                        <img
                          src={selectedRequest.document_url}
                          alt="Verification Document"
                          className="max-h-72 w-auto object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 italic">
                      No document proof uploaded with this request.
                    </div>
                  )}
                </div>

                {/* Section 5: Notes */}
                {selectedRequest.notes && (
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
                      Applicant Remarks:
                    </span>
                    <p className="text-amber-800 dark:text-amber-300">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t">
                {selectedRequest.status === "PENDING" ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setRejectingRequest(selectedRequest)}
                      className="text-red-600 hover:bg-red-50 text-xs font-semibold"
                    >
                      Reject Application
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedRequest)}
                      disabled={isProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Provisioning...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Approve & Provision Unit
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelectedRequest(null)} className="text-xs">
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* REJECTION REASON MODAL */}
      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reject Verification Request</DialogTitle>
            <DialogDescription>
              Specify a reason for rejection. The applicant will be notified to correct and resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Rejection Reason / Notes
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="e.g. Index II document is illegible or name does not match society records..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectingRequest(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isProcessing ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
