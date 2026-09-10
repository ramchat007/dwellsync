"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Search,
  Filter,
  FileCheck,
  Building,
  ShieldCheck,
  Calendar,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Society, SocietyDocument } from "@/lib/types/database";

interface DocumentsClientProps {
  initialDocuments: (SocietyDocument & {
    uploader?: { full_name: string; display_name: string };
  })[];
  society: Society | null;
  role: string;
}

export function DocumentsClient({
  initialDocuments,
  society,
  role,
}: DocumentsClientProps) {
  const [documents] = useState(initialDocuments);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "ALL", label: "All Documents" },
    { id: "SOCIETY_BYLAWS", label: "Bylaws & Guidelines" },
    { id: "AGM_MINUTES", label: "AGM Minutes" },
    { id: "FINANCIAL_REPORT", label: "Financial & Audits" },
    { id: "STATUTORY_COMPLIANCE", label: "Compliance & Filings" },
    { id: "ENGINEERING_MAINTENANCE", label: "Engineering & AMC" },
    { id: "BUILDER_HANDOVER", label: "Handover Records" },
    { id: "NOTICES_CIRCULARS", label: "Notices & Circulars" },
    { id: "FORMS_TEMPLATES", label: "Forms & Templates" },
    { id: "RULES_REGULATIONS", label: "House Rules" },
    { id: "RESIDENT_UNIT_DOCUMENTS", label: "Unit Records" },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === "ALL" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Society Documents & Records
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access official bylaws, AGM circulars, financial audit reports, and member application forms.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== "ALL"
              ? "No documents matched your selected category or search filter."
              : "No shared documents have been uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const dateStr = new Date(doc.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const sizeStr = doc.file_size_kb ? `${doc.file_size_kb} KB` : "PDF";

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {doc.category.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>{sizeStr} • {dateStr}</span>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 font-semibold rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

