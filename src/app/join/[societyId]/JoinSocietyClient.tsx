"use client";

import React, { useState } from "react";
import {
  Building2,
  User,
  Car,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  ShieldCheck,
  Zap,
  Info,
  Sparkles,
  Phone,
  Mail,
  Home,
  Check,
} from "lucide-react";
import { AccessRequestRole, UnitType, VehicleDefinition, VehicleType, VehicleFuelType } from "@/lib/types/database";

interface SocietyPublicInfo {
  id: string;
  name: string;
  registration_number?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

interface BuildingOption {
  id: string;
  name: string;
  code?: string | null;
  wings?: { id: string; name: string; code?: string | null }[];
}

interface JoinSocietyClientProps {
  society: SocietyPublicInfo;
  buildings: BuildingOption[];
}

export function JoinSocietyClient({ society, buildings }: JoinSocietyClientProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [submissionReference, setSubmissionReference] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Step 1: Personal Details & Role
  const [requestedRole, setRequestedRole] = useState<AccessRequestRole>("OWNER");
  const [applicantName, setApplicantName] = useState<string>("");
  const [applicantEmail, setApplicantEmail] = useState<string>("");
  const [applicantPhone, setApplicantPhone] = useState<string>("");

  // Step 2: Flat & Physical Layout Specs
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    buildings.length > 0 ? buildings[0].name : "Main Building"
  );
  const [customBuilding, setCustomBuilding] = useState<string>("");
  const [selectedWing, setSelectedWing] = useState<string>("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [unitNumber, setUnitNumber] = useState<string>("");
  const [unitType, setUnitType] = useState<UnitType>("2_BHK");
  const [areaSqft, setAreaSqft] = useState<string>("");

  // Step 3: Parking & Vehicles
  const [hasParking, setHasParking] = useState<boolean>(false);
  const [parkingSlotNumber, setParkingSlotNumber] = useState<string>("");
  const [parkingType, setParkingType] = useState<string>("COVERED");
  const [vehicles, setVehicles] = useState<VehicleDefinition[]>([]);

  // Step 4: Statutory Document Upload & Lease Info
  const [documentType, setDocumentType] = useState<string>(
    requestedRole === "OWNER" ? "INDEX_II" : "RENT_AGREEMENT"
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [leaseStartDate, setLeaseStartDate] = useState<string>("");
  const [leaseEndDate, setLeaseEndDate] = useState<string>("");
  const [ownerContactName, setOwnerContactName] = useState<string>("");
  const [ownerContactPhone, setOwnerContactPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Handle role switch defaults
  const handleRoleChange = (role: AccessRequestRole) => {
    setRequestedRole(role);
    setDocumentType(role === "OWNER" ? "INDEX_II" : "RENT_AGREEMENT");
  };

  // Vehicle helpers
  const addVehicle = () => {
    setVehicles([
      ...vehicles,
      {
        vehicle_type: "FOUR_WHEELER",
        plate_number: "",
        make_model: "",
        fuel_type: "PETROL",
        is_ev: false,
      },
    ]);
  };

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const updateVehicle = (index: number, field: keyof VehicleDefinition, value: any) => {
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "is_ev" && value === true) {
      updated[index].fuel_type = "ELECTRIC";
    }
    setVehicles(updated);
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("File size exceeds 15MB limit. Please upload a smaller file.");
        return;
      }
      setProofFile(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setFilePreview(url);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Form Validation per step
  const validateStep = (step: number): boolean => {
    setErrorMessage("");
    if (step === 1) {
      if (!applicantName.trim()) {
        setErrorMessage("Please enter your full name.");
        return false;
      }
      if (!applicantEmail.trim() || !applicantEmail.includes("@")) {
        setErrorMessage("Please enter a valid email address.");
        return false;
      }
      if (!applicantPhone.trim() || applicantPhone.length < 10) {
        setErrorMessage("Please enter a valid mobile number (at least 10 digits).");
        return false;
      }
      return true;
    }

    if (step === 2) {
      const bldg = selectedBuildingId === "OTHER" ? customBuilding : selectedBuildingId;
      if (!bldg || !bldg.trim()) {
        setErrorMessage("Please select or specify your Tower / Building name.");
        return false;
      }
      if (!unitNumber.trim()) {
        setErrorMessage("Please enter your Flat / Unit Number.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (hasParking && !parkingSlotNumber.trim()) {
        setErrorMessage("Please specify your allotted Parking Lot / Slot Number.");
        return false;
      }
      for (let i = 0; i < vehicles.length; i++) {
        if (!vehicles[i].plate_number.trim()) {
          setErrorMessage(`Please enter the registration plate number for Vehicle #${i + 1}.`);
          return false;
        }
      }
      return true;
    }

    if (step === 4) {
      if (requestedRole === "TENANT" && (!leaseStartDate || !leaseEndDate)) {
        setErrorMessage("Please provide lease start and end dates as per your agreement.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setErrorMessage("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("applicant_name", applicantName);
      formData.append("applicant_email", applicantEmail);
      formData.append("applicant_phone", applicantPhone);
      formData.append("requested_role", requestedRole);

      const bldg = selectedBuildingId === "OTHER" ? customBuilding : selectedBuildingId;
      formData.append("building_name", bldg);
      if (selectedWing) formData.append("wing_name", selectedWing);
      if (floorNumber) formData.append("floor_number", floorNumber);
      formData.append("unit_number", unitNumber);
      formData.append("unit_type", unitType);
      if (areaSqft) formData.append("area_sqft", areaSqft);

      formData.append("has_parking", hasParking ? "true" : "false");
      if (hasParking && parkingSlotNumber) {
        formData.append("parking_slot_number", parkingSlotNumber);
        formData.append("parking_type", parkingType);
      }

      if (vehicles.length > 0) {
        formData.append("vehicles", JSON.stringify(vehicles));
      }

      formData.append("document_type", documentType);
      if (proofFile) {
        formData.append("proof_file", proofFile);
      }

      if (leaseStartDate) formData.append("lease_start_date", leaseStartDate);
      if (leaseEndDate) formData.append("lease_end_date", leaseEndDate);
      if (ownerContactName) formData.append("owner_contact_name", ownerContactName);
      if (ownerContactPhone) formData.append("owner_contact_phone", ownerContactPhone);
      if (notes) formData.append("notes", notes);

      const res = await fetch(`/api/society/${society.id}/onboard-submit`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Submission failed. Please check your details.");
      }

      setSubmissionReference(data.data?.requestId || "DS-" + Math.floor(100000 + Math.random() * 900000));
      setSubmissionSuccess(true);
    } catch (err: any) {
      console.error("Onboarding submission error:", err);
      setErrorMessage(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (submissionSuccess) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl text-center max-w-2xl mx-auto my-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          Verification Request Submitted
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
          Welcome to {society.name}!
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          Your onboarding application and ownership/tenancy documents have been securely submitted to the society administrative committee for fast-track verification.
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Tracking Reference:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
              {submissionReference}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Applicant:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {applicantName} ({requestedRole === "OWNER" ? "Flat Owner" : "Tenant"})
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Flat Number:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {unitNumber} ({selectedBuildingId === "OTHER" ? customBuilding : selectedBuildingId})
            </span>
          </div>
          {proofFile && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Document Uploaded:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {documentType} ({proofFile.name})
              </span>
            </div>
          )}
          {vehicles.length > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Registered Vehicles:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {vehicles.length} vehicle(s) registered
              </span>
            </div>
          )}
        </div>

        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 text-left text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3 mb-8">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">What happens next?</span>
            The Society Secretary or Committee will review your Index II / Agreement against society records. Once approved, you will receive an activation email to immediately access your resident dashboard, pay maintenance, book amenities, and manage visitors.
          </div>
        </div>

        <a
          href="/login"
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 shadow-sm transition-all"
        >
          Return to Login
        </a>
      </div>
    );
  }

  const steps = [
    { num: 1, title: "Identity", icon: User },
    { num: 2, title: "Flat Specs", icon: Home },
    { num: 3, title: "Vehicles & Parking", icon: Car },
    { num: 4, title: "Proof Documents", icon: FileText },
    { num: 5, title: "Review", icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Society Welcome Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-100 dark:border-indigo-900 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {society.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {[society.address_line1, society.city, society.state].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Wizard Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-0" />
          <div
            className="absolute top-1/2 left-4 h-0.5 bg-indigo-600 dark:bg-indigo-500 -translate-y-1/2 -z-0 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 92}%` }}
          />

          {steps.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                  disabled={s.num > currentStep}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                    isCompleted
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                      ? "bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/60 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </button>
                <span
                  className={`text-[10px] mt-1.5 font-medium hidden sm:block ${
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <Info className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Step Form Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* STEP 1: Personal Details & Role */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                1. Your Identity & Resident Role
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tell us whether you own this apartment or reside as an authorized tenant.
              </p>
            </div>

            {/* Role Radio Selection */}
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => handleRoleChange("OWNER")}
                className={`cursor-pointer rounded-2xl border p-4 flex flex-col items-start transition-all ${
                  requestedRole === "OWNER"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-600/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-2">
                  <Home className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Flat Owner</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  I hold title/share certificate or Index II
                </span>
              </label>

              <label
                onClick={() => handleRoleChange("TENANT")}
                className={`cursor-pointer rounded-2xl border p-4 flex flex-col items-start transition-all ${
                  requestedRole === "TENANT"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-600/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-2">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Tenant</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  I reside under a valid Rent Agreement
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name (as per legal document) *
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Priya Ramesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mobile Number (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Flat Specs & Physical Layout */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                2. Flat & Physical Layout Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide precise flat details so the committee can match and provision your unit in the registry.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tower / Building *
                  </label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value="OTHER">+ Other / Add New Tower</option>
                  </select>
                </div>

                {selectedBuildingId === "OTHER" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tower Name *
                    </label>
                    <input
                      type="text"
                      value={customBuilding}
                      onChange={(e) => setCustomBuilding(e.target.value)}
                      placeholder="e.g. Tower C"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Wing (Optional)
                    </label>
                    <input
                      type="text"
                      value={selectedWing}
                      onChange={(e) => setSelectedWing(e.target.value)}
                      placeholder="e.g. Wing A"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Flat / Unit Number *
                  </label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. A-402, 1204"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Configuration / Unit Type
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1_BHK">1 BHK</option>
                    <option value="2_BHK">2 BHK</option>
                    <option value="3_BHK">3 BHK</option>
                    <option value="4_BHK">4 BHK</option>
                    <option value="PENTHOUSE">Penthouse</option>
                    <option value="SHOP">Shop</option>
                    <option value="OFFICE">Office</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Carpet Area (sq. ft.)
                  </label>
                  <input
                    type="number"
                    value={areaSqft}
                    onChange={(e) => setAreaSqft(e.target.value)}
                    placeholder="e.g. 785"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Refer to your Index II / Agreement
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Parking & Vehicle Registry */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                3. Parking Allotment & Vehicles
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Register two-wheelers, four-wheelers, and parking slot numbers for premise security & automated gate pass.
              </p>
            </div>

            {/* Parking Slot Allotment Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                    Purchased / Allotted Parking Lot?
                  </span>
                  <span className="text-xs text-slate-500">
                    Does your flat include a designated parking slot inside the premises?
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasParking}
                  onChange={(e) => setHasParking(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
              </div>

              {hasParking && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parking Lot / Slot Number *
                    </label>
                    <input
                      type="text"
                      value={parkingSlotNumber}
                      onChange={(e) => setParkingSlotNumber(e.target.value)}
                      placeholder="e.g. B1-24, Covered-12"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parking Type
                    </label>
                    <select
                      value={parkingType}
                      onChange={(e) => setParkingType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="COVERED">Covered / Stilt</option>
                      <option value="BASEMENT">Basement (B1/B2)</option>
                      <option value="OPEN">Open Dedicated</option>
                      <option value="HYDRAULIC">Mechanical / Hydraulic</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Vehicles Parked in Society
                  </h3>
                  <span className="text-xs text-slate-500">
                    Add 2-wheelers or 4-wheelers to issue security RFID sticker / fast passes.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addVehicle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Vehicle
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No vehicles added yet. Click &quot;+ Add Vehicle&quot; if you own a 2-wheeler or 4-wheeler.
                </div>
              ) : (
                vehicles.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Vehicle #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVehicle(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Vehicle Category
                        </label>
                        <select
                          value={v.vehicle_type}
                          onChange={(e) => updateVehicle(idx, "vehicle_type", e.target.value as VehicleType)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value="FOUR_WHEELER">4-Wheeler (Car/SUV)</option>
                          <option value="TWO_WHEELER">2-Wheeler (Bike/Scooter)</option>
                          <option value="BICYCLE">Bicycle</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Plate Number *
                        </label>
                        <input
                          type="text"
                          value={v.plate_number}
                          onChange={(e) => updateVehicle(idx, "plate_number", e.target.value.toUpperCase())}
                          placeholder="MH 12 AB 1234"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Make & Model
                        </label>
                        <input
                          type="text"
                          value={v.make_model || ""}
                          onChange={(e) => updateVehicle(idx, "make_model", e.target.value)}
                          placeholder="e.g. Tata Nexon, Honda Activa"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(v.is_ev)}
                          onChange={(e) => updateVehicle(idx, "is_ev", e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" /> Electric Vehicle (EV)
                        </span>
                      </label>

                      {!v.is_ev && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500">Fuel:</span>
                          <select
                            value={v.fuel_type || "PETROL"}
                            onChange={(e) => updateVehicle(idx, "fuel_type", e.target.value as VehicleFuelType)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          >
                            <option value="PETROL">Petrol</option>
                            <option value="DIESEL">Diesel</option>
                            <option value="CNG">CNG</option>
                            <option value="HYBRID">Hybrid</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Statutory Document Upload & Lease Info */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                4. Statutory Document Verification
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {requestedRole === "OWNER"
                  ? "Upload your Index II screenshot or Sale Deed to identify your flat number, carpet area, and official ownership."
                  : "Upload your registered Rent Agreement (Leave & License) to verify tenancy terms and validity."}
              </p>
            </div>

            {/* Document Guidance Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                {requestedRole === "OWNER"
                  ? "Recommended: Index II (Government Registration Summary)"
                  : "Recommended: Registered Rent Agreement"}
              </span>
              <p className="leading-relaxed">
                {requestedRole === "OWNER"
                  ? "Index II is the 1-2 page government document showing the property description, flat number, carpet area, and owner names. You can take a clear phone photo or upload the PDF."
                  : "Please ensure the first 2-3 pages containing the flat number, tenant name, monthly rent, and validity term are clearly legible."}
              </p>
            </div>

            {/* If Tenant: Lease Dates & Owner Info */}
            {requestedRole === "TENANT" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Tenancy Period & Flat Owner Reference
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lease Agreement Start Date *
                    </label>
                    <input
                      type="date"
                      value={leaseStartDate}
                      onChange={(e) => setLeaseStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lease Agreement End Date *
                    </label>
                    <input
                      type="date"
                      value={leaseEndDate}
                      onChange={(e) => setLeaseEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Flat Owner&apos;s Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={ownerContactName}
                      onChange={(e) => setOwnerContactName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Owner Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={ownerContactPhone}
                      onChange={(e) => setOwnerContactPhone(e.target.value)}
                      placeholder="+91 98200 11223"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Upload Document Proof ({documentType === "INDEX_II" ? "Index II Screenshot / PDF" : "Rent Agreement"})
              </label>

              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {proofFile ? (
                  <div className="flex flex-col items-center">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 mb-2 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {proofFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(proofFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      Click to browse or drop file here
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Supports JPG, PNG, WebP or PDF (Max 15MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Notes or Message for Committee
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special remarks, possession date, or joint owner notes..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                5. Review & Confirm Application
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please double-check your submission before dispatching to the society committee.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Resident Name & Role:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {applicantName} ({requestedRole === "OWNER" ? "Flat Owner" : "Tenant"})
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Contact:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {applicantPhone} • {applicantEmail}
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Flat Location:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Flat {unitNumber} ({selectedBuildingId === "OTHER" ? customBuilding : selectedBuildingId})
                  {floorNumber ? `, Floor ${floorNumber}` : ""}
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Configuration & Area:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {unitType.replace(/_/g, " ")} {areaSqft ? `• ${areaSqft} sq.ft.` : ""}
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Parking Slot:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {hasParking ? `${parkingSlotNumber} (${parkingType})` : "None"}
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Registered Vehicles:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {vehicles.length > 0
                    ? vehicles.map((v) => `${v.plate_number} (${v.is_ev ? "EV" : v.vehicle_type})`).join(", ")
                    : "No vehicles registered"}
                </span>
              </div>
              <div className="p-3.5 flex justify-between">
                <span className="text-slate-500">Proof Document:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {proofFile ? `${documentType} (${proofFile.name})` : "Pending Document Upload"}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                By submitting this form, you confirm that you are the lawful owner or registered tenant of the specified flat and that all information provided is accurate and verifiable against government property records.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit for Verification
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
