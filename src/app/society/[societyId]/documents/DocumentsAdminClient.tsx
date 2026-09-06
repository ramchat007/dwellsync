"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface DocumentsAdminClientProps {
  initialDocuments: any[];
  societyId: string;
}

const CATEGORIES = [
  { id: "SOCIETY_BYLAWS", label: "Society Bylaws" },
  { id: "AGM_MINUTES", label: "AGM / Meeting Minutes" },
  { id: "FINANCIAL_REPORT", label: "Financial Report / Audit" },
  { id: "FORMS_TEMPLATES", label: "Forms & NOC Templates" },
  { id: "RULES_REGULATIONS", label: "Rules & Guidelines" },
];

export function DocumentsAdminClient({
  initialDocuments,
  societyId,
}: DocumentsAdminClientProps) {
  const [documents, setDocuments] = useState<any[]>(initialDocuments);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "SOCIETY_BYLAWS",
    file_url: "",
    file_type: "PDF",
    file_size_kb: 512,
    visibility: "ALL_RESIDENTS",
  });

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record document.");

      setDocuments([data.document, ...documents]);
      setIsNewModalOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "SOCIETY_BYLAWS",
        file_url: "",
        file_type: "PDF",
        file_size_kb: 512,
        visibility: "ALL_RESIDENTS",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this official document?")) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/society/${societyId}/documents?id=${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document.");
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || "Error deleting document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Official Document Repository</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Store and publish bylaws, circulars, audited balance sheets, and statutory filings.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No official documents have been uploaded to the society repository yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Access Visibility</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{d.title}</span>
                      </div>
                      {d.description && (
                        <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5 pl-6">
                          {d.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">
                        {d.category.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          d.visibility === "ALL_RESIDENTS"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : d.visibility === "OWNERS_ONLY"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {d.visibility.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {d.uploader?.display_name || d.uploader?.full_name || "Admin"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(d.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="text-rose-600 hover:text-rose-800 font-semibold pl-2"
                      >
                        {deletingId === d.id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload Official Document</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Society Registered Bylaws (2026 Revision)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visibility Policy *</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="ALL_RESIDENTS">All Residents (Owners & Tenants)</option>
                    <option value="OWNERS_ONLY">Owners Only</option>
                    <option value="COMMITTEE_ONLY">Committee Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File URL / Storage Link *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://storage.dwellsync.com/docs/bylaws-2026.pdf"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Summary of document purpose or amendment notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
