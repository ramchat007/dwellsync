"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Folder,
  FolderPlus,
  Search,
  Filter,
  Download,
  History,
  CheckCircle2,
  Archive,
  RotateCcw,
  Tag,
  Calendar,
  Layers,
  Building,
  Eye,
  Send,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  X,
} from "lucide-react";
import { DocumentDashboardKPIs, DocumentCategory, DocumentVisibility, DocumentStatus } from "@/lib/types/documents";

interface Props {
  initialDocuments: any[];
  initialFolders: any[];
  kpis: DocumentDashboardKPIs;
  units: { id: string; unit_number: string }[];
  societyId: string;
  currentUserId: string;
  permissions: {
    canManage: boolean;
    canApprove: boolean;
    canArchive: boolean;
    canDelete: boolean;
  };
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: "ALL", label: "All Categories" },
  { id: "SOCIETY_BYLAWS", label: "Society Bylaws" },
  { id: "AGM_MINUTES", label: "AGM & Minutes" },
  { id: "FINANCIAL_REPORT", label: "Financial & Audits" },
  { id: "STATUTORY_COMPLIANCE", label: "Statutory & Compliance" },
  { id: "ENGINEERING_MAINTENANCE", label: "Engineering & AMC" },
  { id: "LEGAL_CONTRACTS", label: "Legal & Contracts" },
  { id: "BUILDER_HANDOVER", label: "Builder Handover" },
  { id: "NOTICES_CIRCULARS", label: "Notices & Circulars" },
  { id: "FORMS_TEMPLATES", label: "Forms & NOCs" },
  { id: "RULES_REGULATIONS", label: "House Rules" },
  { id: "RESIDENT_UNIT_DOCUMENTS", label: "Unit Records" },
  { id: "GENERAL", label: "General" },
];

const VISIBILITY_CONFIG: Record<string, { label: string; color: string }> = {
  ALL_RESIDENTS: { label: "All Residents", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OWNERS_ONLY: { label: "Owners Only", color: "bg-blue-50 text-blue-700 border-blue-200" },
  COMMITTEE_ONLY: { label: "Committee Only", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ADMIN_ONLY: { label: "Admin Only", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ROLE_RESTRICTED: { label: "Role Restricted", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: "Published", color: "bg-emerald-100 text-emerald-800" },
  APPROVED: { label: "Approved", color: "bg-cyan-100 text-cyan-800" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-amber-100 text-amber-800" },
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  ARCHIVED: { label: "Archived", color: "bg-zinc-100 text-zinc-500" },
};

export function DocumentsAdminClient({
  initialDocuments,
  initialFolders,
  kpis,
  units,
  societyId,
  currentUserId,
  permissions,
}: Props) {
  const [documents, setDocuments] = useState<any[]>(initialDocuments);
  const [folders, setFolders] = useState<any[]>(initialFolders);
  const [activeKpis, setActiveKpis] = useState<DocumentDashboardKPIs>(kpis);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedFolderId, setSelectedFolderId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedVisibility, setSelectedVisibility] = useState("ALL");
  const [showArchived, setShowArchived] = useState(false);

  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [selectedDocDetails, setSelectedDocDetails] = useState<any | null>(null);
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionSummary, setNewVersionSummary] = useState("");

  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    category: "SOCIETY_BYLAWS",
    subcategory: "",
    folder_id: "",
    tagsInput: "",
    visibility: "ALL_RESIDENTS",
    unit_id: "",
    document_date: "",
    effective_date: "",
    expiry_date: "",
    file_url: "",
    initial_status: "PUBLISHED",
    broadcast_notification: false,
  });

  const [folderForm, setFolderForm] = useState({
    name: "",
    description: "",
    parent_id: "",
    color: "#3B82F6",
  });

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Archive filter
      if (!showArchived && (doc.is_archived || doc.status === "ARCHIVED")) return false;
      if (showArchived && !doc.is_archived && doc.status !== "ARCHIVED") return false;

      // Category filter
      if (selectedCategory !== "ALL" && doc.category !== selectedCategory) return false;

      // Folder filter
      if (selectedFolderId === "ROOT" && doc.folder_id) return false;
      if (selectedFolderId !== "ALL" && selectedFolderId !== "ROOT" && doc.folder_id !== selectedFolderId) return false;

      // Status filter
      if (selectedStatus !== "ALL" && doc.status !== selectedStatus) return false;

      // Visibility filter
      if (selectedVisibility !== "ALL" && doc.visibility !== selectedVisibility) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (doc.title || "").toLowerCase().includes(q);
        const matchesDesc = (doc.description || "").toLowerCase().includes(q);
        const matchesSubcat = (doc.subcategory || "").toLowerCase().includes(q);
        const matchesTags = (doc.tags || []).some((t: string) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSubcat && !matchesTags) return false;
      }

      return true;
    });
  }, [documents, showArchived, selectedCategory, selectedFolderId, selectedStatus, selectedVisibility, searchQuery]);

  // Download / View Handler with Secure Signed URL
  const handleDownload = async (docId: string, version?: number) => {
    setIsDownloading(docId);
    try {
      const url = `/api/society/${societyId}/documents/${docId}/download${version ? `?version=${version}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate download link.");

      if (data.download_url) {
        window.open(data.download_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Could not retrieve document.");
    } finally {
      setIsDownloading(null);
    }
  };

  // Open Document Detail Drawer
  const handleOpenDetails = async (doc: any) => {
    setSelectedDocDetails(doc);
    try {
      const res = await fetch(`/api/society/${societyId}/documents/${doc.id}`);
      const data = await res.json();
      if (res.ok && data.document) {
        setSelectedDocDetails(data.document);
      }
    } catch (err) {
      console.error("Error refreshing document details:", err);
    }
  };

  // Create Document Handler
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      let finalFileUrl = documentForm.file_url;
      let finalFilePath = "";
      let finalFileSizeKb = 0;
      let finalFileType = "FILE";

      // 1. If file uploaded, upload to Supabase Storage
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("category", documentForm.category);

        const uploadRes = await fetch(`/api/society/${societyId}/documents/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "File upload failed.");

        finalFileUrl = uploadData.file_url;
        finalFilePath = uploadData.file_path;
        finalFileSizeKb = uploadData.file_size_kb;
        finalFileType = uploadData.file_type;
      }

      if (!finalFileUrl) {
        throw new Error("Please provide a file or file URL.");
      }

      // 2. Parse tags
      const tags = documentForm.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // 3. Create document record
      const payload = {
        title: documentForm.title,
        description: documentForm.description || null,
        category: documentForm.category,
        subcategory: documentForm.subcategory || null,
        folder_id: documentForm.folder_id || null,
        tags,
        visibility: documentForm.visibility,
        unit_id: documentForm.unit_id || null,
        document_date: documentForm.document_date || null,
        effective_date: documentForm.effective_date || null,
        expiry_date: documentForm.expiry_date || null,
        status: documentForm.initial_status,
        file_url: finalFileUrl,
        file_path: finalFilePath || null,
        file_type: finalFileType,
        file_size_kb: finalFileSizeKb || null,
      };

      const res = await fetch(`/api/society/${societyId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create document.");

      setDocuments([data.document, ...documents]);
      setIsUploadOpen(false);
      setUploadFile(null);
      setDocumentForm({
        title: "",
        description: "",
        category: "SOCIETY_BYLAWS",
        subcategory: "",
        folder_id: "",
        tagsInput: "",
        visibility: "ALL_RESIDENTS",
        unit_id: "",
        document_date: "",
        effective_date: "",
        expiry_date: "",
        file_url: "",
        initial_status: "PUBLISHED",
        broadcast_notification: false,
      });

      // Refresh KPIs
      setActiveKpis((prev) => ({
        ...prev,
        totalDocuments: prev.totalDocuments + 1,
        publishedDocuments: prev.publishedDocuments + (data.document.status === "PUBLISHED" ? 1 : 0),
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Upload New Version Handler
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocDetails || !newVersionFile) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Upload file to storage
      const formData = new FormData();
      formData.append("file", newVersionFile);
      formData.append("category", selectedDocDetails.category);

      const uploadRes = await fetch(`/api/society/${societyId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload new version file.");

      // 2. Post version record
      const versionPayload = {
        file_url: uploadData.file_url,
        file_path: uploadData.file_path,
        file_name: uploadData.file_name,
        file_type: uploadData.file_type,
        file_size_kb: uploadData.file_size_kb,
        change_summary: newVersionSummary || `Version ${(selectedDocDetails.current_version || 1) + 1}`,
      };

      const res = await fetch(`/api/society/${societyId}/documents/${selectedDocDetails.id}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(versionPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record version.");

      // Update state
      setSelectedDocDetails({
        ...selectedDocDetails,
        current_version: data.document.current_version,
        versions: [data.version, ...(selectedDocDetails.versions || [])],
      });

      setDocuments(
        documents.map((d) => (d.id === selectedDocDetails.id ? { ...d, current_version: data.document.current_version } : d))
      );

      setIsNewVersionOpen(false);
      setNewVersionFile(null);
      setNewVersionSummary("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload new version.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lifecycle Action Handler (Review / Approve / Publish / Archive / Restore)
  const handleLifecycleAction = async (action: "SUBMIT_REVIEW" | "APPROVE" | "PUBLISH" | "ARCHIVE" | "RESTORE") => {
    if (!selectedDocDetails) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/society/${societyId}/documents/${selectedDocDetails.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          broadcast_notification: action === "PUBLISH",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action.toLowerCase()} document.`);

      setSelectedDocDetails(data.document);
      setDocuments(documents.map((d) => (d.id === data.document.id ? data.document : d)));
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Create Folder Handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/society/${societyId}/documents/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder.");

      setFolders([...folders, data.folder]);
      setIsNewFolderOpen(false);
      setFolderForm({ name: "", description: "", parent_id: "", color: "#3B82F6" });
    } catch (err: any) {
      alert(err.message || "Failed to create folder.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Society Document Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Centralized repository for official society bylaws, audits, compliance filings, and contracts.
            </p>
          </div>
        </div>

        {permissions.canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>New Folder</span>
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. KPI Dashboard Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Total Documents" value={activeKpis.totalDocuments} icon={<FileText className="w-4 h-4 text-blue-600" />} />
        <KPICard label="Published" value={activeKpis.publishedDocuments} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} />
        <KPICard label="Under Review" value={activeKpis.underReviewDocuments} icon={<Clock className="w-4 h-4 text-amber-600" />} />
        <KPICard label="Drafts" value={activeKpis.draftDocuments} icon={<Layers className="w-4 h-4 text-slate-600" />} />
        <KPICard
          label="Expiring in 30d"
          value={activeKpis.expiringWithin30Days}
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
          alert={activeKpis.expiringWithin30Days > 0}
        />
        <KPICard label="Folders" value={activeKpis.totalFolders} icon={<Folder className="w-4 h-4 text-indigo-600" />} />
      </div>

      {/* 3. Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === c.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 4. Search & Multi-Filter Control Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Folder Filter */}
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
          >
            <option value="ALL">All Folders</option>
            <option value="ROOT">Unorganized (Root)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name} ({f.document_count || 0})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="APPROVED">Approved</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 outline-none"
          >
            <option value="ALL">All Visibilities</option>
            <option value="ALL_RESIDENTS">All Residents</option>
            <option value="OWNERS_ONLY">Owners Only</option>
            <option value="COMMITTEE_ONLY">Committee Only</option>
            <option value="ADMIN_ONLY">Admin Only</option>
          </select>

          {/* Archive Switch */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
              showArchived
                ? "bg-zinc-800 text-white border-zinc-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? "Archived View" : "Archive"}</span>
          </button>
        </div>
      </div>

      {/* 5. Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center">
            <FileText className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No documents match the active criteria.</p>
            <p className="text-slate-400 mt-0.5">Try clearing your filters or upload a new society document.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Document Title</th>
                  <th className="py-3.5 px-4">Category &amp; Folder</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const visConfig = VISIBILITY_CONFIG[doc.visibility] || {
                    label: doc.visibility,
                    color: "bg-slate-100 text-slate-600 border-slate-200",
                  };
                  const statusConf = STATUS_CONFIG[doc.status] || {
                    label: doc.status,
                    color: "bg-slate-100 text-slate-600",
                  };

                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span
                              onClick={() => handleOpenDetails(doc)}
                              className="hover:underline cursor-pointer truncate block text-slate-900"
                            >
                              {doc.title}
                            </span>
                            {doc.description && (
                              <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                                {doc.description}
                              </div>
                            )}
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {doc.tags.map((tag: string) => (
                                  <span key={tag} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {doc.category.replace(/_/g, " ")}
                        </div>
                        {doc.folder && (
                          <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                            <Folder className="w-3 h-3" />
                            <span>{doc.folder.name}</span>
                          </div>
                        )}
                        {doc.subcategory && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Sub: {doc.subcategory}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          v{doc.current_version || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${visConfig.color}`}>
                          {visConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <div>
                          Added:{" "}
                          {new Date(doc.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        {doc.expiry_date && (
                          <div className={`mt-0.5 text-[10px] ${isExpired ? "text-rose-600 font-bold" : "text-amber-600"}`}>
                            Expires: {new Date(doc.expiry_date).toLocaleDateString("en-IN")}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleDownload(doc.id)}
                          disabled={isDownloading === doc.id}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                        >
                          {isDownloading === doc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => handleOpenDetails(doc)}
                          className="text-slate-700 hover:text-slate-900 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload Official Document</h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              {/* File Input */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 text-center transition">
                <input
                  type="file"
                  id="doc-file-upload"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="doc-file-upload" className="cursor-pointer space-y-1 block">
                  <Download className="w-6 h-6 text-blue-600 mx-auto" />
                  <div className="font-bold text-slate-800">
                    {uploadFile ? uploadFile.name : "Choose a file to upload directly to Private Storage"}
                  </div>
                  <div className="text-[10px] text-slate-400">PDF, Word, Excel, Images up to 25MB</div>
                </label>
              </div>

              <div className="text-center text-slate-400 text-[10px] uppercase font-bold">— OR ENTER LINK —</div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">External File URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={documentForm.file_url}
                  onChange={(e) => setDocumentForm({ ...documentForm, file_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Society Bylaws 2026 Edition"
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  placeholder="Brief context regarding this official filing or publication..."
                  value={documentForm.description}
                  onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={documentForm.category}
                    onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    {CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folder Destination</label>
                  <select
                    value={documentForm.folder_id}
                    onChange={(e) => setDocumentForm({ ...documentForm, folder_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="">No Folder (Root)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Access Visibility *</label>
                  <select
                    value={documentForm.visibility}
                    onChange={(e) => setDocumentForm({ ...documentForm, visibility: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="ALL_RESIDENTS">All Residents</option>
                    <option value="OWNERS_ONLY">Owners Only</option>
                    <option value="COMMITTEE_ONLY">Committee Only</option>
                    <option value="ADMIN_ONLY">Admin Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={documentForm.initial_status}
                    onChange={(e) => setDocumentForm({ ...documentForm, initial_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    {permissions.canApprove && <option value="PUBLISHED">Publish Immediately</option>}
                    {permissions.canApprove && <option value="APPROVED">Approved (Unpublished)</option>}
                    <option value="UNDER_REVIEW">Submit for Review</option>
                    <option value="DRAFT">Save as Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="audit, fy2026, tax"
                    value={documentForm.tagsInput}
                    onChange={(e) => setDocumentForm({ ...documentForm, tagsInput: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={documentForm.expiry_date}
                    onChange={(e) => setDocumentForm({ ...documentForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Document Details & Version History Drawer */}
      {selectedDocDetails && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                    {selectedDocDetails.category.replace(/_/g, " ")}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedDocDetails.title}</h2>
                  <p className="text-xs text-slate-400">Current Version: v{selectedDocDetails.current_version || 1}</p>
                </div>
                <button
                  onClick={() => setSelectedDocDetails(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Status and Visibility Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_CONFIG[selectedDocDetails.status]?.color}`}>
                  {selectedDocDetails.status}
                </span>
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${VISIBILITY_CONFIG[selectedDocDetails.visibility]?.color}`}>
                  {selectedDocDetails.visibility.replace(/_/g, " ")}
                </span>
              </div>

              {/* Description */}
              {selectedDocDetails.description && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 mb-1">Description</div>
                  <div>{selectedDocDetails.description}</div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 block">Uploaded By</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDocDetails.uploader?.display_name || selectedDocDetails.uploader?.full_name || "Admin"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Date Added</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedDocDetails.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {selectedDocDetails.expiry_date && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expiry Date</span>
                    <span className="font-mono text-rose-600 font-semibold">
                      {new Date(selectedDocDetails.expiry_date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedDocDetails.folder && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Folder</span>
                    <span className="font-semibold text-blue-600">📁 {selectedDocDetails.folder.name}</span>
                  </div>
                )}
              </div>

              {/* Version History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Version History</span>
                  </div>
                  {permissions.canManage && (
                    <button
                      onClick={() => setIsNewVersionOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      + Upload New Version
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(selectedDocDetails.versions || []).map((ver: any) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          v{ver.version_number} — {ver.change_summary || "Updated version"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(ver.created_at).toLocaleDateString("en-IN")} · {ver.file_size_kb || 0} KB
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(selectedDocDetails.id, ver.version_number)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifecycle Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="font-bold text-xs text-slate-400 uppercase tracking-wider">Lifecycle Actions</div>
                <div className="flex flex-wrap gap-2">
                  {selectedDocDetails.status === "DRAFT" && (
                    <button
                      onClick={() => handleLifecycleAction("SUBMIT_REVIEW")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"
                    >
                      Submit for Review
                    </button>
                  )}

                  {permissions.canApprove && selectedDocDetails.status === "UNDER_REVIEW" && (
                    <button
                      onClick={() => handleLifecycleAction("APPROVE")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold"
                    >
                      Approve
                    </button>
                  )}

                  {permissions.canApprove && selectedDocDetails.status !== "PUBLISHED" && selectedDocDetails.status !== "ARCHIVED" && (
                    <button
                      onClick={() => handleLifecycleAction("PUBLISH")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                    >
                      Publish to Society
                    </button>
                  )}

                  {permissions.canArchive && !selectedDocDetails.is_archived && selectedDocDetails.status !== "ARCHIVED" && (
                    <button
                      onClick={() => handleLifecycleAction("ARCHIVE")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold"
                    >
                      Archive
                    </button>
                  )}

                  {permissions.canArchive && (selectedDocDetails.is_archived || selectedDocDetails.status === "ARCHIVED") && (
                    <button
                      onClick={() => handleLifecycleAction("RESTORE")}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                    >
                      Restore to Active
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Action */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => handleDownload(selectedDocDetails.id)}
                disabled={isDownloading === selectedDocDetails.id}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                {isDownloading === selectedDocDetails.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Current Version</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Upload New Version Modal */}
      {isNewVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload New Version</h3>
              <button onClick={() => setIsNewVersionOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadNewVersion} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                <input
                  type="file"
                  id="new-version-file"
                  onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="new-version-file" className="cursor-pointer block">
                  <Download className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800">
                    {newVersionFile ? newVersionFile.name : "Select Replacement File"}
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Change Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revised Clause 4 per committee resolution"
                  value={newVersionSummary}
                  onChange={(e) => setNewVersionSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewVersionOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newVersionFile}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Version</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Create Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Document Folder</h3>
              <button onClick={() => setIsNewFolderOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Statutory Filings"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  alert = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`p-3 rounded-2xl border ${alert ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"} shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-black mt-1 ${alert ? "text-rose-700" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}
