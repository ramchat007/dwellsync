"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Society, SocietyType } from "@/lib/types/database";
import { Building2, MapPin, Mail, Phone, Globe, ShieldCheck, Edit3, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SOCIETY_TYPES: { label: string; value: SocietyType }[] = [
  { label: "Co-operative Housing Society (CHS)", value: "COOPERATIVE_HOUSING" },
  { label: "Apartment Owners Association (AOA)", value: "APARTMENT_SOCIETY" },
  { label: "Gated Residential Community", value: "GATED_COMMUNITY" },
  { label: "Villa / Row House Community", value: "VILLA_COMMUNITY" },
  { label: "Condominium", value: "CONDOMINIUM" },
  { label: "Commercial / Property Management", value: "PROPERTY_MANAGEMENT" },
  { label: "Other Housing Format", value: "OTHER" },
];

export function SocietyProfileClient({
  societyId,
  initialSociety,
  canEdit,
}: {
  societyId: string;
  initialSociety: Society;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [society, setSociety] = useState<Society>(initialSociety);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const [formData, setFormData] = useState({
    name: society.name,
    registration_number: society.registration_number || "",
    society_type: society.society_type,
    address_line_1: society.address_line_1 || society.address || "",
    address_line_2: society.address_line_2 || "",
    landmark: society.landmark || "",
    city: society.city || "",
    district: society.district || "",
    state: society.state || "",
    pincode: society.pincode || "",
    contact_email: society.contact_email || "",
    contact_phone: society.contact_phone || "",
    website: society.website || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch(`/api/society/${societyId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSociety(data.data);
        setIsEditing(false);
        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 3000);
        router.refresh();
      } else {
        alert(data.error || "Failed to update society profile");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Society Profile & Tenant Details</h1>
          <p className="text-xs text-slate-500">
            Registration information, contact parameters, and physical address.
          </p>
        </div>

        {canEdit && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="gap-1.5 text-xs border-slate-300"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Society profile updated and changes recorded in immutable audit log.</span>
        </div>
      )}

      {isEditing ? (
        <Card className="border-slate-200 shadow-sm bg-white">
          <form onSubmit={handleSave}>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold">Edit Society Information</CardTitle>
              <CardDescription className="text-xs">
                Update operational details for {society.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Society Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Registration Number</label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, registration_number: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Society Type</label>
                <Select
                  value={formData.society_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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
                <label className="font-semibold text-slate-700">Address Line 1</label>
                <Input
                  value={formData.address_line_1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, address_line_1: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">State</label>
                  <Input
                    value={formData.state}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Pincode</label>
                  <Input
                    value={formData.pincode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Phone</label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{society.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      Code: {society.code}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {society.society_type?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="success" className="gap-1 font-mono text-xs">
                <ShieldCheck className="w-3.5 h-3.5" /> {society.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Tenant ID (UUID):</span>
                <div className="font-mono text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate">
                  {society.id}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Registration Number:</span>
                <div className="font-mono text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate">
                  {society.registration_number || "Not Registered"}
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address & Location:
              </span>
              <div className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-0.5">
                <div>{society.address_line_1 || society.address || "Address not specified"}</div>
                {society.address_line_2 && <div>{society.address_line_2}</div>}
                <div>
                  {[society.city, society.district, society.state, society.pincode].filter(Boolean).join(", ")}
                </div>
                <div className="text-slate-500 text-[11px] pt-1">Country: {society.country || "India"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Contact Email:
                </span>
                <div className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono truncate">
                  {society.contact_email || "Not specified"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone:
                </span>
                <div className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono truncate">
                  {society.contact_phone || "Not specified"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 text-[11px] text-slate-500 font-mono">
              <div>Timezone: <strong className="text-slate-700">{society.timezone || "Asia/Kolkata"}</strong></div>
              <div>Currency: <strong className="text-slate-700">{society.currency || "INR"}</strong></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

