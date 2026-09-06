"use client";

import React, { useState, useEffect } from "react";
import { Unit, UnitOwner, UnitOccupancy, FamilyMember, Profile, OwnershipType, OccupancyType, FamilyRelationship } from "@/lib/types/database";
import {
  DoorOpen,
  Users,
  UserPlus,
  ShieldCheck,
  Calendar,
  Percent,
  Trash2,
  Loader2,
  Plus,
  Heart,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

export function UnitDetailDrawer({
  unit,
  societyId,
  open,
  onOpenChange,
  onUnitUpdated,
}: {
  unit: Unit | null;
  societyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnitUpdated: () => void;
}) {
  const [owners, setOwners] = useState<UnitOwner[]>([]);
  const [occupancies, setOccupancies] = useState<UnitOccupancy[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [societyMembers, setSocietyMembers] = useState<{ id: string; user_id: string; profile?: Profile }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const [isAddOwnerOpen, setIsAddOwnerOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    user_id: "",
    ownership_percentage: 100,
    ownership_type: "PRIMARY" as OwnershipType,
    is_primary: true,
  });

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    user_id: "",
    occupancy_type: "TENANT_OCCUPIED" as OccupancyType,
    lease_start: "",
    lease_end: "",
    is_primary_tenant: true,
  });

  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    full_name: "",
    relationship: "SPOUSE" as FamilyRelationship,
    phone: "",
    email: "",
    is_emergency_contact: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUnitDetails = React.useCallback(async () => {
    if (!unit) return;
    try {
      setIsLoading(true);
      const [ownersRes, occRes, famRes, memRes] = await Promise.all([
        fetch(`/api/society/${societyId}/units/${unit.id}/owners`),
        fetch(`/api/society/${societyId}/units/${unit.id}/occupancies`),
        fetch(`/api/society/${societyId}/units/${unit.id}/family`),
        fetch(`/api/society/${societyId}/members`),
      ]);

      const [ownersData, occData, famData, memData] = await Promise.all([
        ownersRes.json(),
        occRes.json(),
        famRes.json(),
        memRes.json(),
      ]);

      setOwners(ownersData.data || []);
      setOccupancies(occData.data || []);
      setFamilyMembers(famData.data || []);
      setSocietyMembers(memData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [societyId, unit]);

  useEffect(() => {
    if (open && unit) {
      loadUnitDetails();
    }
  }, [open, unit, loadUnitDetails]);

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !ownerForm.user_id) return;
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/society/${societyId}/units/${unit.id}/owners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ownerForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddOwnerOpen(false);
        await loadUnitDetails();
        onUnitUpdated();
      } else {
        setActionError(data.error || "Failed to add unit owner");
      }
    } catch (err) {
      console.error(err);
      setActionError("Error saving owner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    if (!unit || !confirm("Remove this owner from the unit?")) return;
    try {
      const res = await fetch(`/api/society/${societyId}/units/${unit.id}/owners?ownerId=${ownerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadUnitDetails();
        onUnitUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !tenantForm.user_id) return;
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/society/${societyId}/units/${unit.id}/occupancies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddTenantOpen(false);
        await loadUnitDetails();
        onUnitUpdated();
      } else {
        setActionError(data.error || "Failed to register occupancy");
      }
    } catch (err) {
      console.error(err);
      setActionError("Error saving occupancy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !familyForm.full_name) return;
    try {
      setIsSubmitting(true);
      setActionError(null);

      const primaryUser = occupancies[0]?.user_id || owners[0]?.user_id;

      const res = await fetch(`/api/society/${societyId}/units/${unit.id}/family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...familyForm,
          primary_member_id: primaryUser,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddFamilyOpen(false);
        setFamilyForm({
          full_name: "",
          relationship: "SPOUSE",
          phone: "",
          email: "",
          is_emergency_contact: false,
        });
        await loadUnitDetails();
      } else {
        setActionError(data.error || "Failed to add family member");
      }
    } catch (err) {
      console.error(err);
      setActionError("Error saving family member");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!unit) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Unit {unit.unit_number}</h2>
              <Badge
                variant={unit.status === "OCCUPIED" ? "success" : "secondary"}
                className="font-mono text-[10px]"
              >
                {unit.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {unit.unit_type.replace(/_/g, " ")} &middot; {unit.area_sqft ? `${unit.area_sqft} sq. ft.` : "No area specified"}
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-4">
          <Tabs defaultValue="owners">
            <TabsList className="w-full bg-slate-100 p-1 mb-4 grid grid-cols-3">
              <TabsTrigger value="owners" className="text-xs">
                Owners ({owners.length})
              </TabsTrigger>
              <TabsTrigger value="occupancy" className="text-xs">
                Occupancy ({occupancies.length})
              </TabsTrigger>
              <TabsTrigger value="family" className="text-xs">
                Household ({familyMembers.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OWNERS */}
            <TabsContent value="owners" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Unit Ownership</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddOwnerOpen(!isAddOwnerOpen)}
                  className="text-xs h-7 px-2 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Owner
                </Button>
              </div>

              {isAddOwnerOpen && (
                <form onSubmit={handleAddOwner} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Select User *</label>
                    <Select
                      value={ownerForm.user_id}
                      onChange={(e) => setOwnerForm({ ...ownerForm, user_id: e.target.value })}
                      className="text-xs bg-white"
                      required
                    >
                      <option value="">Choose registered persona/profile...</option>
                      {societyMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || "User"} ({m.profile?.email})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Ownership %</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={ownerForm.ownership_percentage}
                        onChange={(e) => setOwnerForm({ ...ownerForm, ownership_percentage: parseFloat(e.target.value) || 0 })}
                        className="text-xs bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Ownership Type</label>
                      <Select
                        value={ownerForm.ownership_type}
                        onChange={(e) => setOwnerForm({ ...ownerForm, ownership_type: e.target.value as OwnershipType })}
                        className="text-xs bg-white"
                      >
                        <option value="PRIMARY">Primary Owner</option>
                        <option value="JOINT">Joint Owner</option>
                        <option value="INHERITED">Inherited</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOwnerOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 text-white">
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Owner
                    </Button>
                  </div>
                </form>
              )}

              {owners.length > 0 ? (
                <div className="space-y-2">
                  {owners.map((o) => (
                    <div key={o.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{o.profile?.full_name}</span>
                          {o.is_primary && (
                            <Badge variant="purple" className="text-[9px] px-1.5 py-0 font-mono">
                              PRIMARY
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">{o.profile?.email}</div>
                        <div className="text-indigo-600 font-mono text-[11px] font-semibold mt-0.5">
                          Share: {o.ownership_percentage}% &middot; {o.ownership_type}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveOwner(o.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-xs py-4 text-center">
                  No owners assigned to this unit.
                </p>
              )}
            </TabsContent>

            {/* TAB 2: OCCUPANCY & TENANTS */}
            <TabsContent value="occupancy" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Current Occupant / Tenant</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddTenantOpen(!isAddTenantOpen)}
                  className="text-xs h-7 px-2 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Occupant
                </Button>
              </div>

              {isAddTenantOpen && (
                <form onSubmit={handleAddTenant} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Resident / Tenant *</label>
                    <Select
                      value={tenantForm.user_id}
                      onChange={(e) => setTenantForm({ ...tenantForm, user_id: e.target.value })}
                      className="text-xs bg-white"
                      required
                    >
                      <option value="">Choose registered user...</option>
                      {societyMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || "User"} ({m.profile?.email})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Occupancy Format</label>
                    <Select
                      value={tenantForm.occupancy_type}
                      onChange={(e) => setTenantForm({ ...tenantForm, occupancy_type: e.target.value as OccupancyType })}
                      className="text-xs bg-white"
                    >
                      <option value="TENANT_OCCUPIED">Tenant (Rental Lease)</option>
                      <option value="OWNER_OCCUPIED">Owner Self-Occupied</option>
                      <option value="FAMILY_OCCUPIED">Family / Relative Occupied</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Lease Start</label>
                      <Input
                        type="date"
                        value={tenantForm.lease_start}
                        onChange={(e) => setTenantForm({ ...tenantForm, lease_start: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Lease End</label>
                      <Input
                        type="date"
                        value={tenantForm.lease_end}
                        onChange={(e) => setTenantForm({ ...tenantForm, lease_end: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddTenantOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 text-white">
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Occupant
                    </Button>
                  </div>
                </form>
              )}

              {occupancies.length > 0 ? (
                <div className="space-y-2">
                  {occupancies.map((occ) => (
                    <div key={occ.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900">{occ.profile?.full_name}</div>
                        <Badge variant="success" className="font-mono text-[9px]">
                          {occ.occupancy_type}
                        </Badge>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">{occ.profile?.email}</div>
                      {occ.lease_start && (
                        <div className="text-slate-500 text-[11px] pt-1">
                          Lease: {occ.lease_start} to {occ.lease_end || "Ongoing"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-xs py-4 text-center">
                  Unit is currently marked VACANT.
                </p>
              )}
            </TabsContent>

            {/* TAB 3: FAMILY & HOUSEHOLD */}
            <TabsContent value="family" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Family & Household</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddFamilyOpen(!isAddFamilyOpen)}
                  className="text-xs h-7 px-2 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Member
                </Button>
              </div>

              {isAddFamilyOpen && (
                <form onSubmit={handleAddFamily} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Full Name *</label>
                    <Input
                      required
                      placeholder="e.g. Chirayu Sharma"
                      value={familyForm.full_name}
                      onChange={(e) => setFamilyForm({ ...familyForm, full_name: e.target.value })}
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Relationship</label>
                      <Select
                        value={familyForm.relationship}
                        onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value as FamilyRelationship })}
                        className="text-xs bg-white"
                      >
                        <option value="SPOUSE">Spouse</option>
                        <option value="CHILD">Child</option>
                        <option value="PARENT">Parent</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Phone</label>
                      <Input
                        placeholder="+91 98200..."
                        value={familyForm.phone}
                        onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="emergency"
                      checked={familyForm.is_emergency_contact}
                      onChange={(e) => setFamilyForm({ ...familyForm, is_emergency_contact: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="emergency" className="font-medium text-slate-700">
                      Emergency Contact
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddFamilyOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 text-white">
                      Save Family Member
                    </Button>
                  </div>
                </form>
              )}

              {familyMembers.length > 0 ? (
                <div className="space-y-2">
                  {familyMembers.map((fam) => (
                    <div key={fam.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{fam.full_name}</span>
                          <span className="text-slate-400 font-normal">({fam.relationship})</span>
                          {fam.is_emergency_contact && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 font-mono">
                              EMERGENCY
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">{fam.phone || "No phone"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-xs py-4 text-center">
                  No additional family members logged.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Drawer>
  );
}

