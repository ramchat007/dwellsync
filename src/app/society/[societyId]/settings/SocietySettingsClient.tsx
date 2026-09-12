"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Society, SocietySettings, EmergencyContact } from "@/lib/types/database";
import {
  Settings,
  Shield,
  Building2,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function SocietySettingsClient({
  societyId,
  initialSociety,
  initialSettings,
  canManage,
  userRole,
}: {
  societyId: string;
  initialSociety: Society;
  initialSettings: SocietySettings;
  canManage: boolean;
  userRole: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<SocietySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New emergency contact draft
  const [newContact, setNewContact] = useState<EmergencyContact>({
    name: "",
    role: "",
    phone: "",
  });
  const [showAddContact, setShowAddContact] = useState(false);

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim() || !newContact.role.trim()) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      emergency_contacts: [...(prev.emergency_contacts || []), newContact],
    }));
    setNewContact({ name: "", role: "", phone: "" });
    setShowAddContact(false);
  };

  const handleRemoveContact = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    try {
      setIsSaving(true);
      setStatusMsg(null);

      const res = await fetch(`/api/society/${societyId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_year_start_month: settings.financial_year_start_month,
          agm_due_month: settings.agm_due_month,
          quorum_percentage: settings.quorum_percentage,
          default_meeting_duration_minutes: settings.default_meeting_duration_minutes,
          require_visitor_preapproval: settings.require_visitor_preapproval,
          auto_escalate_complaints: settings.auto_escalate_complaints,
          rules_and_by_laws: settings.rules_and_by_laws,
          emergency_contacts: settings.emergency_contacts,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: "Society administrative configuration saved successfully." });
        setSettings(data.settings);
        router.refresh();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to update settings" });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Network error saving settings" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Society Administration & Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure governance rules, meeting parameters, compliance schedules, and operational bylaws.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            Role: {userRole}
          </Badge>
          {!canManage && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-Only
            </Badge>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Society Identity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Society Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="font-bold text-slate-900 dark:text-white text-sm">{initialSociety.name}</div>
            <div className="text-slate-500">Code: <span className="font-mono font-semibold text-indigo-600">{initialSociety.code}</span></div>
            <div className="text-slate-500">Type: <span className="font-medium text-slate-700 dark:text-slate-300">{initialSociety.society_type}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Tenant Authority
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                {initialSociety.status}
              </Badge>
            </div>
            <div className="text-slate-500 truncate">UUID: <span className="font-mono text-[11px]">{societyId}</span></div>
            <div className="text-slate-500">Currency: <span className="font-medium font-mono">{initialSociety.currency || "INR"}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Compliance Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="text-slate-500">
              FY Start: <span className="font-semibold text-slate-800 dark:text-slate-200">
                {MONTHS.find((m) => m.value === settings.financial_year_start_month)?.label || "April"}
              </span>
            </div>
            <div className="text-slate-500">
              AGM Due: <span className="font-semibold text-slate-800 dark:text-slate-200">
                {MONTHS.find((m) => m.value === settings.agm_due_month)?.label || "September"}
              </span>
            </div>
            <div className="text-slate-500">
              Quorum: <span className="font-semibold text-slate-800 dark:text-slate-200">{settings.quorum_percentage}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Governance & Compliance Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Governance & Compliance Parameters
            </CardTitle>
            <CardDescription className="text-xs">
              Configure statutory compliance calendars, annual general body meeting schedules, and quorum verification standards.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Financial Year Start Month
              </Label>
              <select
                disabled={!canManage}
                value={settings.financial_year_start_month}
                onChange={(e) =>
                  setSettings({ ...settings, financial_year_start_month: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 dark:bg-slate-800 dark:border-slate-700"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} (Month {m.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Annual General Meeting (AGM) Due Month
              </Label>
              <select
                disabled={!canManage}
                value={settings.agm_due_month}
                onChange={(e) =>
                  setSettings({ ...settings, agm_due_month: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 dark:bg-slate-800 dark:border-slate-700"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} (Due by {m.label})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Statutory Quorum Requirement (%)
              </Label>
              <div className="relative">
                <Input
                  disabled={!canManage}
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={settings.quorum_percentage}
                  onChange={(e) =>
                    setSettings({ ...settings, quorum_percentage: parseFloat(e.target.value) || 0 })
                  }
                  className="text-xs pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Minimum percentage of eligible voting members required to convene a valid General Body meeting.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Default Meeting Duration (Minutes)
              </Label>
              <div className="relative">
                <Input
                  disabled={!canManage}
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={settings.default_meeting_duration_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_meeting_duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  className="text-xs pr-14"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">mins</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Policies & Automations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Operational Controls & Automation
            </CardTitle>
            <CardDescription className="text-xs">
              Security gate policies and automated maintenance SLA escalations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Require Pre-Approval for Visitors
                </div>
                <div className="text-[11px] text-slate-500">
                  When enabled, all gate visitors must be pre-approved with a digital pass-code or resident confirmation before entry.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!canManage}
                checked={settings.require_visitor_preapproval}
                onChange={(e) =>
                  setSettings({ ...settings, require_visitor_preapproval: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Automated Complaint SLA Escalations
                </div>
                <div className="text-[11px] text-slate-500">
                  Automatically escalate unattended tickets to the Secretary or Estate Manager when SLA deadlines expire.
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!canManage}
                checked={settings.auto_escalate_complaints}
                onChange={(e) =>
                  setSettings({ ...settings, auto_escalate_complaints: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts Directory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-600" />
                Emergency Contact Roster
              </CardTitle>
              <CardDescription className="text-xs">
                Essential emergency contacts accessible to all society residents and staff.
              </CardDescription>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showAddContact && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Emergency Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Contact Name (e.g. Main Gate Guard)"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Role (e.g. Security / Electrician)"
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddContact(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddContact}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {(settings.emergency_contacts || []).length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No emergency contacts registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-md">
                {(settings.emergency_contacts || []).map((contact, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{contact.name}</span>
                      <span className="mx-2 text-slate-300">•</span>
                      <Badge variant="secondary" className="text-[10px] font-normal">{contact.role}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${contact.phone}`}
                        className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {contact.phone}
                      </a>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Remove Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Society Rules & By-Laws */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Society Rules, Regulations & By-Laws
            </CardTitle>
            <CardDescription className="text-xs">
              Official society charter, code of conduct, clubhouse regulations, and parking bylaws published to members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              disabled={!canManage}
              rows={8}
              value={settings.rules_and_by_laws || ""}
              onChange={(e) => setSettings({ ...settings, rules_and_by_laws: e.target.value })}
              placeholder="Enter society by-laws, silence hours, parking norms, renovation guidelines, etc."
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 font-mono leading-relaxed"
            />
            <p className="text-[11px] text-slate-500">
              Plain text or markdown supported. This charter is displayed in the resident transparency portal.
            </p>
          </CardContent>
        </Card>

        {canManage && (
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 px-5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Society Configuration
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

