"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SocietyType } from "@/lib/types/database";
import {
  Building2,
  MapPin,
  Settings,
  Layers,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoUploader } from "@/components/ui/LogoUploader";

const SOCIETY_TYPES: { label: string; value: SocietyType }[] = [
  { label: "Co-operative Housing Society (CHS)", value: "COOPERATIVE_HOUSING" },
  { label: "Apartment Owners Association (AOA)", value: "APARTMENT_SOCIETY" },
  { label: "Gated Residential Community", value: "GATED_COMMUNITY" },
  { label: "Villa / Row House Community", value: "VILLA_COMMUNITY" },
  { label: "Condominium", value: "CONDOMINIUM" },
  { label: "Commercial / Property Management", value: "PROPERTY_MANAGEMENT" },
  { label: "Other Housing Format", value: "OTHER" },
];

const STEPS = [
  { id: 1, label: "Basic Info", icon: Building2 },
  { id: 2, label: "Address", icon: MapPin },
  { id: 3, label: "Config", icon: Settings },
  { id: 4, label: "Structure", icon: Layers },
  { id: 5, label: "Administrator", icon: UserCheck },
  { id: 6, label: "Review", icon: CheckCircle2 },
];

const ONBOARDING_DRAFT_KEY = "dwellsync_onboarding_draft";

const INITIAL_FORM_DATA = {
  name: "",
  code: "",
  registration_number: "",
  society_type: "COOPERATIVE_HOUSING" as SocietyType,
  logo_url: null as string | null,
  address_line_1: "",
  address_line_2: "",
  landmark: "",
  city: "Mumbai",
  district: "Mumbai Suburban",
  state: "Maharashtra",
  pincode: "",
  country: "India",
  contact_email: "",
  contact_phone: "",
  website: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  towers: [{ name: "Tower A", code: "TWR-A", number_of_floors: 5, units_per_floor: 4 }],
  admin_full_name: "",
  admin_email: "",
  admin_phone: "",
  admin_password: "TestPassword@123",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSocietyId, setCreatedSocietyId] = useState<string | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Restore saved onboarding draft from browser storage on reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && typeof parsed.formData === "object") {
          setFormData((prev) => ({ ...prev, ...parsed.formData }));
          if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 6) {
            setCurrentStep(parsed.currentStep);
          }
          setIsDraftRestored(true);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Persist current onboarding state across browser refreshes
  useEffect(() => {
    if (currentStep < 7) {
      try {
        localStorage.setItem(
          ONBOARDING_DRAFT_KEY,
          JSON.stringify({ formData, currentStep })
        );
      } catch {
        // Ignore storage write errors
      }
    }
  }, [formData, currentStep]);

  const handleResetDraft = () => {
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {}
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setIsDraftRestored(false);
    setError(null);
  };

  const handleAddTower = () => {
    const nextChar = String.fromCharCode(65 + formData.towers.length);
    setFormData({
      ...formData,
      towers: [
        ...formData.towers,
        {
          name: `Tower ${nextChar}`,
          code: `TWR-${nextChar}`,
          number_of_floors: 5,
          units_per_floor: 4,
        },
      ],
    });
  };

  const handleRemoveTower = (index: number) => {
    setFormData({
      ...formData,
      towers: formData.towers.filter((_, i) => i !== index),
    });
  };

  const validateStep = (step: number) => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim()) return "Society Name is required";
      if (!formData.code.trim()) return "Unique Society Code is required";
      if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
        return "Code must contain only uppercase alphanumeric characters, dashes, or underscores";
      }
    }
    if (step === 2) {
      if (!formData.address_line_1.trim()) return "Address Line 1 is required";
      if (!formData.city.trim()) return "City is required";
      if (!formData.state.trim()) return "State is required";
      if (!/^\d{5,8}$/.test(formData.pincode)) return "Valid Pincode is required";
    }
    if (step === 5) {
      if (!formData.admin_full_name.trim()) return "Administrator Full Name is required";
      if (!formData.admin_email.trim() || !formData.admin_email.includes("@")) {
        return "Valid Administrator Email is required";
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch("/api/superadmin/societies/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        try {
          localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        } catch {}
        setCreatedSocietyId(data.society.id);
        setCurrentStep(7); // Final success screen
      } else {
        setError(data.error || "Failed to onboard society");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Society Onboarding Wizard</h1>
          <p className="text-xs text-slate-500">
            Guided 7-step provisioning of a new multi-tenant housing society into DwellSyncHub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDraftRestored && currentStep < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDraft}
              className="text-xs text-slate-600 hover:text-red-600 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Draft
            </Button>
          )}
          <Link href="/superadmin/societies">
            <Button variant="outline" size="sm" className="text-xs">
              Back to Societies
            </Button>
          </Link>
        </div>
      </div>

      {/* Persistent Draft Notice */}
      {isDraftRestored && currentStep < 7 && (
        <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold">Draft Restored:</span> Resumed at Step {currentStep} from previous session.
          </span>
          <button
            type="button"
            onClick={handleResetDraft}
            className="underline hover:text-indigo-700 text-[11px] font-medium"
          >
            Start Fresh
          </button>
        </div>
      )}

      {/* Progress Bar / Step Indicators */}
      {currentStep < 7 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="grid grid-cols-6 gap-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center text-center p-2 rounded-lg transition-all ${
                    isCurrent
                      ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                      : isCompleted
                      ? "text-emerald-700 bg-emerald-50/50"
                      : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 text-xs ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] hidden sm:block truncate w-full">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2 animate-in fade-in-0">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Step Contents */}
      <Card className="border-slate-200 shadow-sm bg-white">
        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Step 1: Basic Information
              </CardTitle>
              <CardDescription className="text-xs">
                Legal identity, brand name, and unique code within DwellSyncHub.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Society Name *</label>
                  <Input
                    required
                    placeholder="e.g. Palm Meadows CHS"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Unique Code *</label>
                  <Input
                    required
                    placeholder="e.g. PMC001"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().trim() })
                    }
                    className="text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Society Type</label>
                  <Select
                    value={formData.society_type}
                    onChange={(e) =>
                      setFormData({ ...formData, society_type: e.target.value as SocietyType })
                    }
                    className="text-xs"
                  >
                    {SOCIETY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Registration Number</label>
                  <Input
                    placeholder="e.g. BOM/HSG/TC/9812/2015"
                    value={formData.registration_number}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_number: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="font-semibold text-slate-700">Society Logo</label>
                <LogoUploader
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
                />
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 2: ADDRESS */}
        {currentStep === 2 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Step 2: Physical Address & Contact
              </CardTitle>
              <CardDescription className="text-xs">
                Location and communication contact parameters for this housing society.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Address Line 1 *</label>
                <Input
                  required
                  placeholder="e.g. Plot No. 42, Palm Beach Avenue"
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Address Line 2</label>
                  <Input
                    placeholder="e.g. Sector 19, Vashi"
                    value={formData.address_line_2}
                    onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Landmark</label>
                  <Input
                    placeholder="e.g. Opposite Inorbit Mall"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">City *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">State *</label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Pincode *</label>
                  <Input
                    placeholder="400703"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Office Contact Email</label>
                  <Input
                    type="email"
                    placeholder="office@palmmeadows.org"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Office Contact Phone</label>
                  <Input
                    placeholder="+91 98200 55555"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 3: CONFIGURATION */}
        {currentStep === 3 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" /> Step 3: Society Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Timezone, localized currency, and fiscal parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Timezone</label>
                  <Input
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">Default: Asia/Kolkata (IST)</p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Currency</label>
                  <Input
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">Default: INR (₹)</p>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 4: STRUCTURE */}
        {currentStep === 4 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" /> Step 4: Initial Buildings / Towers
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Optionally define initial towers to automatically create building & floor hierarchies.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTower}
                  className="text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Tower
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-3 text-xs">
              {formData.towers.map((tower, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Tower Name</label>
                      <Input
                        value={tower.name}
                        onChange={(e) => {
                          const next = [...formData.towers];
                          next[idx].name = e.target.value;
                          setFormData({ ...formData, towers: next });
                        }}
                        className="text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Code</label>
                      <Input
                        value={tower.code}
                        onChange={(e) => {
                          const next = [...formData.towers];
                          next[idx].code = e.target.value.toUpperCase();
                          setFormData({ ...formData, towers: next });
                        }}
                        className="text-xs bg-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Floors</label>
                      <Input
                        type="number"
                        min="1"
                        value={tower.number_of_floors}
                        onChange={(e) => {
                          const next = [...formData.towers];
                          next[idx].number_of_floors = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, towers: next });
                        }}
                        className="text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Units/Floor</label>
                      <Input
                        type="number"
                        min="1"
                        value={tower.units_per_floor}
                        onChange={(e) => {
                          const next = [...formData.towers];
                          next[idx].units_per_floor = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, towers: next });
                        }}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>
                  {formData.towers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTower(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </>
        )}

        {/* STEP 5: INITIAL ADMINISTRATOR */}
        {currentStep === 5 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" /> Step 5: Initial Society Administrator
              </CardTitle>
              <CardDescription className="text-xs">
                Creates the primary administrator account assigned the SOCIETY_ADMIN role for this society tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Administrator Full Name *</label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.admin_full_name}
                    onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Administrator Email *</label>
                  <Input
                    type="email"
                    required
                    placeholder="admin@palmmeadows.org"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Administrator Phone</label>
                  <Input
                    placeholder="+91 98200 11111"
                    value={formData.admin_phone}
                    onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Initial Password</label>
                  <Input
                    type="text"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 6: REVIEW */}
        {currentStep === 6 && (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" /> Step 6: Review & Finalize
              </CardTitle>
              <CardDescription className="text-xs">
                Confirm society parameters before committing the multi-tenant provisioning.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500">Society Name:</span>
                  <div className="font-bold text-slate-900">{formData.name}</div>
                </div>
                <div>
                  <span className="text-slate-500">Unique Code:</span>
                  <div className="font-bold font-mono text-slate-900">{formData.code}</div>
                </div>
                <div>
                  <span className="text-slate-500">Type:</span>
                  <div className="font-bold text-slate-900">{formData.society_type}</div>
                </div>
                <div>
                  <span className="text-slate-500">Location:</span>
                  <div className="font-bold text-slate-900">{formData.city}, {formData.state}</div>
                </div>
                <div>
                  <span className="text-slate-500">Admin Email:</span>
                  <div className="font-bold font-mono text-indigo-600">{formData.admin_email}</div>
                </div>
                <div>
                  <span className="text-slate-500">Towers:</span>
                  <div className="font-bold text-slate-900">{formData.towers.length} Towers configured</div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 7: SUCCESS COMPLETION */}
        {currentStep === 7 && (
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Society Successfully Provisioned!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                <strong>{formData.name}</strong> ({formData.code}) has been created with isolated PostgreSQL RLS boundaries, building layouts, and the initial Administrator account.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link href={`/society/${createdSocietyId}/buildings`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow">
                  <Layers className="w-4 h-4" /> Configure Structural Hierarchy
                </Button>
              </Link>
              <Link href={`/superadmin/societies/${createdSocietyId}`}>
                <Button variant="outline" className="text-xs gap-1.5 border-slate-300">
                  <Shield className="w-4 h-4" /> Open Society Management
                </Button>
              </Link>
              <Link href="/superadmin/societies">
                <Button variant="outline" className="text-xs">
                  Back to Societies List
                </Button>
              </Link>
            </div>
          </CardContent>
        )}

        {/* Action Footer Navigation */}
        {currentStep < 7 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className="text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>

            {currentStep < 6 ? (
              <Button
                type="button"
                size="sm"
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning Society...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Commit Society Onboarding
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

