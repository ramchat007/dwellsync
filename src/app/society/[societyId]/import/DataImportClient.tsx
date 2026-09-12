"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IMPORT_SCHEMAS } from "@/lib/services/import/columnDetector";
import {
  ImportType,
  ValidationSummary,
  ImportCommitResult,
  ImportErrorDetail,
} from "@/lib/services/import/types";

interface DataImportClientProps {
  societyId: string;
  societyName: string;
  userRole: string;
}

type WizardStep = "UPLOAD" | "MAPPING" | "VALIDATE" | "RESULTS";

export function DataImportClient({
  societyId,
  societyName,
  userRole,
}: DataImportClientProps) {
  const [activeTab, setActiveTab] = useState<"wizard" | "history">("wizard");
  const [step, setStep] = useState<WizardStep>("UPLOAD");

  // Configuration state
  const [importType, setImportType] = useState<ImportType>("UNITS_STRUCTURE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Uploaded parsed state
  const [uploadData, setUploadData] = useState<{
    fileName: string;
    fileFormat: string;
    fileSizeBytes: number;
    totalRows: number;
    headers: string[];
    allRows: Record<string, any>[];
  } | null>(null);

  // Column mapping state: canonicalField -> spreadsheetColumn
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validation results state
  const [validationResult, setValidationResult] = useState<ValidationSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Commit result state
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);

  // History state
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/society/${societyId}/import/history`);
      const data = await res.json();
      if (data.success) {
        setHistoryJobs(data.data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [societyId]);

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Handle template download
  function downloadTemplate(format: "csv" | "xlsx") {
    const url = `/api/society/${societyId}/import/template?type=${importType}&format=${format}`;
    window.open(url, "_blank");
  }

  // Step 1: Upload and Parse file
  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a valid CSV or XLSX spreadsheet to upload.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("importType", importType);

      const res = await fetch(`/api/society/${societyId}/import/upload`, {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to process file.");
      }

      setUploadData(resData.data);
      setColumnMapping(resData.data.initialMapping || {});
      setStep("MAPPING");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse uploaded spreadsheet.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Step 2: Validate Column Mappings & Run Dry-Run
  async function handleRunValidation() {
    if (!uploadData) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/society/${societyId}/import/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType,
          rows: uploadData.allRows,
          columnMapping,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to validate mappings.");
      }

      setValidationResult(resData.data);
      setConfirmed(false);
      setStep("VALIDATE");
    } catch (err: any) {
      setErrorMessage(err.message || "Validation failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Step 3: Commit Import
  async function handleCommitImport() {
    if (!uploadData || !confirmed) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/society/${societyId}/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType,
          fileName: uploadData.fileName,
          fileFormat: uploadData.fileFormat,
          fileSizeBytes: uploadData.fileSizeBytes,
          rows: uploadData.allRows,
          columnMapping,
          confirmed: true,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to commit import.");
      }

      setCommitResult(resData.data);
      setStep("RESULTS");
    } catch (err: any) {
      setErrorMessage(err.message || "Commit failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Export errors as sanitized CSV
  function downloadErrorReport(errors: ImportErrorDetail[]) {
    if (!errors || errors.length === 0) return;
    const headers = ["Row", "Field", "Value", "Error Code", "Message"];
    const rows = errors.map((e) => [
      e.row_number || "Global",
      e.field || "",
      `"${String(e.value || "").replace(/"/g, '""')}"`,
      e.error_code,
      `"${e.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function resetWizard() {
    setStep("UPLOAD");
    setSelectedFile(null);
    setUploadData(null);
    setValidationResult(null);
    setCommitResult(null);
    setConfirmed(false);
    setErrorMessage(null);
  }

  const currentSchema = IMPORT_SCHEMAS[importType];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("wizard")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "wizard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Import Wizard
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Import History & Logs
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">
            <span className="font-semibold">Error: </span>
            {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= WIZARD TAB ================= */}
      {activeTab === "wizard" && (
        <div className="space-y-6">
          {/* Wizard Progress Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === "UPLOAD"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                1
              </div>
              <span className={`text-sm font-medium ${step === "UPLOAD" ? "text-slate-900" : "text-slate-500"}`}>
                Upload & Templates
              </span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === "MAPPING"
                    ? "bg-blue-600 text-white"
                    : step === "VALIDATE" || step === "RESULTS"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </div>
              <span className={`text-sm font-medium ${step === "MAPPING" ? "text-slate-900" : "text-slate-500"}`}>
                Column Mapping
              </span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === "VALIDATE"
                    ? "bg-blue-600 text-white"
                    : step === "RESULTS"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                3
              </div>
              <span className={`text-sm font-medium ${step === "VALIDATE" ? "text-slate-900" : "text-slate-500"}`}>
                Dry-Run & Preview
              </span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === "RESULTS"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                4
              </div>
              <span className={`text-sm font-medium ${step === "RESULTS" ? "text-slate-900" : "text-slate-500"}`}>
                Complete & Audit
              </span>
            </div>
          </div>

          {/* STEP 1: UPLOAD */}
          {step === "UPLOAD" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form */}
              <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    1. Select Import Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        { id: "UNITS_STRUCTURE", title: "Units & Buildings", desc: "Towers, wings, floors, and flat inventory" },
                        { id: "RESIDENTS_MEMBERS", title: "Residents & Directory", desc: "Resident profiles and membership roles" },
                        { id: "OWNERSHIP_OCCUPANCY", title: "Ownership & Tenancy", desc: "Unit owners, tenants, and lease dates" },
                        { id: "MASTER_SOCIETY_DATA", title: "Master Society Data", desc: "All-in-one building, unit & owner layout" },
                      ] as const
                    ).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setImportType(t.id)}
                        className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                          importType === t.id
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="font-semibold text-sm text-slate-900">{t.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    2. Choose Spreadsheet File (.csv or .xlsx)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="spreadsheet-upload"
                    />
                    <label htmlFor="spreadsheet-upload" className="cursor-pointer block">
                      <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      {selectedFile ? (
                        <div>
                          <div className="font-semibold text-sm text-blue-600">{selectedFile.name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB — Click to choose a different file
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-medium text-slate-700">Click to upload spreadsheet</span>
                          <span className="text-xs text-slate-400 block mt-1">
                            Supports CSV or XLSX up to 10MB (Local zero-cost engine)
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    Data is validated in-memory before any changes are written.
                  </div>
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing File...
                      </>
                    ) : (
                      <>
                        Continue to Column Mapping
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right 1 Col: Download Starter Templates & Tips */}
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-sm text-slate-800">Download Template</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download pre-formatted sample files with all canonical columns and example records for{" "}
                    <strong>{currentSchema?.label}</strong>.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate("csv")}
                      className="justify-start text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                      Download CSV Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate("xlsx")}
                      className="justify-start text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                      Download Excel (.xlsx) Template
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Safety & Tenant Isolation
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    Imports are isolated strictly to <strong>{societyName}</strong>. Existing records are never deleted, and formula injection exploits are neutralized automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === "MAPPING" && uploadData && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Map Columns to DwellSync Fields</h2>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-semibold text-slate-700">{uploadData.fileName}</span> ({uploadData.totalRows} data rows detected)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("UPLOAD")}
                  className="text-xs text-slate-600"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Choose Different File
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">DwellSync Field</th>
                      <th className="py-3 px-4">Requirement</th>
                      <th className="py-3 px-4">Detected Spreadsheet Column</th>
                      <th className="py-3 px-4">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentSchema?.fields.map((field) => {
                      const mappedCol = columnMapping[field.name] || "";
                      const sampleVal = mappedCol && uploadData.allRows[0] ? uploadData.allRows[0][mappedCol] : null;

                      return (
                        <tr key={field.name} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{field.label}</div>
                            <div className="text-xs text-slate-400">{field.description}</div>
                          </td>
                          <td className="py-3 px-4">
                            {field.required ? (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Required</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500 text-xs">Optional</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={mappedCol}
                              onChange={(e) => {
                                const newMapping = { ...columnMapping, [field.name]: e.target.value };
                                if (!e.target.value) delete newMapping[field.name];
                                setColumnMapping(newMapping);
                              }}
                              className="w-full max-w-xs text-xs border border-slate-300 rounded-md p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- Do Not Import --</option>
                              {uploadData.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                            {sampleVal !== null && sampleVal !== undefined ? String(sampleVal) : <span className="text-slate-300">--</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setStep("UPLOAD")}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleRunValidation}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Validating Records...
                    </>
                  ) : (
                    <>
                      Run Dry-Run Validation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: DRY-RUN VALIDATION & PREVIEW */}
          {step === "VALIDATE" && validationResult && (
            <div className="space-y-6">
              {/* Summary Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Total Rows</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{validationResult.total_rows}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-green-600 font-medium">Valid Records to Create</div>
                  <div className="text-2xl font-bold text-green-700 mt-1">{validationResult.creates_count}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-blue-600 font-medium">Existing to Update/Merge</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{validationResult.updates_count}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-red-600 font-medium">Invalid / Duplicate Rows</div>
                  <div className="text-2xl font-bold text-red-700 mt-1">{validationResult.invalid_rows}</div>
                </div>
              </div>

              {/* Quota limit banner */}
              {validationResult.quota_limit !== null && (
                <div
                  className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                    validationResult.exceeds_quota
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">Subscription Tier Quota Evaluation</div>
                    <div className="text-xs mt-1">
                      Current Usage: <strong>{validationResult.current_usage}</strong> / Tier Limit:{" "}
                      <strong>{validationResult.quota_limit}</strong>. Projected Usage after import:{" "}
                      <strong>{validationResult.projected_usage}</strong>.
                    </div>
                    {validationResult.exceeds_quota && (
                      <div className="mt-2 font-bold text-red-700">
                        Import blocked: Committing these new records would exceed your active subscription tier. Please upgrade or reduce rows.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error list preview if any */}
              {validationResult.errors.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Detected {validationResult.errors.length} Validation Errors
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadErrorReport(validationResult.errors)}
                      className="text-xs border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Error CSV
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {validationResult.errors.slice(0, 15).map((err, idx) => (
                      <div key={idx} className="p-2 rounded bg-red-50/50 border border-red-100 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-red-800">
                            {err.row_number ? `Row ${err.row_number}: ` : "Global: "}
                          </span>
                          <span className="text-slate-700">{err.message}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                          {err.error_code}
                        </Badge>
                      </div>
                    ))}
                    {validationResult.errors.length > 15 && (
                      <div className="text-center text-xs text-slate-500 py-1">
                        ...and {validationResult.errors.length - 15} more errors. Download error CSV for full list.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-slate-800">Row-by-Row Dry-Run Preview</h3>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Unit / Flat</th>
                        <th className="py-2.5 px-3">Key Details</th>
                        <th className="py-2.5 px-3">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.preview_rows.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{row.row_number}</td>
                          <td className="py-2.5 px-3">
                            {row.action === "CREATE" && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">CREATE</Badge>
                            )}
                            {row.action === "UPDATE" && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">UPDATE / MERGE</Badge>
                            )}
                            {row.action === "ERROR" && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">ERROR</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {row.data["unit_number"] || <span className="text-slate-300">--</span>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {row.data["building_name"] || row.data["full_name"] || row.data["owner_name"] || ""}
                            {row.data["email"] ? ` (${row.data["email"]})` : ""}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.errors ? (
                              <span className="text-red-600 font-medium">{row.errors[0]}</span>
                            ) : (
                              <span className="text-green-600 font-medium">✓ Valid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirmation and Actions */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm-import"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={validationResult.exceeds_quota}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="confirm-import" className="text-xs text-slate-700 cursor-pointer">
                    <strong className="block text-slate-900 mb-0.5">Explicit Commit Authorization</strong>
                    I confirm that I have reviewed the dry-run validation results and authorize DwellSync to import these records into society{" "}
                    <strong>{societyName}</strong>. Existing records will be safely merged and never deleted.
                  </label>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setStep("MAPPING")}
                    className="text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Modify Column Mappings
                  </Button>
                  <Button
                    onClick={handleCommitImport}
                    disabled={!confirmed || isProcessing || validationResult.exceeds_quota}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Executing Database Commit...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Commit Import to Database
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RESULTS */}
          {step === "RESULTS" && commitResult && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Society Data Import Completed</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Import Job ID: <span className="font-mono text-slate-700">{commitResult.jobId}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg text-left">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Created</div>
                  <div className="text-xl font-bold text-green-600 mt-0.5">{commitResult.created_rows}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Updated</div>
                  <div className="text-xl font-bold text-blue-600 mt-0.5">{commitResult.updated_rows}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Skipped</div>
                  <div className="text-xl font-bold text-slate-600 mt-0.5">{commitResult.skipped_rows}</div>
                </div>
              </div>

              {commitResult.error_report.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadErrorReport(commitResult.error_report)}
                    className="text-xs border-slate-300 text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Error / Skip Report
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  onClick={resetWizard}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Start Another Import
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("history")}
                  className="text-xs"
                >
                  View Import History
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= HISTORY TAB ================= */}
      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Historical Society Data Imports</h2>
              <p className="text-xs text-slate-400">
                Audit log and execution records for all spreadsheet imports in this society.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading import logs...</div>
          ) : historyJobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No historical import jobs recorded for this society.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Import Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Total / Created / Updated</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{job.file_name}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] text-slate-600">
                          {job.import_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {job.status === "COMPLETED" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                            COMPLETED
                          </Badge>
                        ) : job.status === "FAILED" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
                            FAILED
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                            {job.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {job.total_rows} total / +{job.created_rows} / ~{job.updated_rows}
                      </td>
                      <td className="py-2.5 px-3">
                        {job.error_report && job.error_report.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadErrorReport(job.error_report)}
                            className="text-[10px] h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Errors ({job.error_report.length})
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

