"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Society, RoleId, Profile } from "@/lib/types/database";
import { PERSONA_DEFINITIONS, getDashboardPathForRole } from "@/lib/auth/persona";
import {
  Shield,
  Building2,
  Users,
  UserCheck,
  DoorOpen,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ViewAsConsoleClient({
  societies,
  currentAdminEmail,
}: {
  societies: Society[];
  currentAdminEmail: string;
}) {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleId>("RESIDENT");
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(societies[0]?.id || "");
  const [availableUsers, setAvailableUsers] = useState<
    { user_id: string; role_id: RoleId; unit_number?: string; profile?: Profile }[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real users when society or role changes
  useEffect(() => {
    if (!selectedSocietyId) return;

    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setError(null);
        const res = await fetch(
          `/api/superadmin/view-as/members?societyId=${selectedSocietyId}&roleId=${selectedRole}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          setAvailableUsers(data.data || []);
          if (data.data && data.data.length > 0) {
            setSelectedUserId(data.data[0].user_id);
          } else {
            setSelectedUserId("");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoadingUsers(false);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [selectedSocietyId, selectedRole]);

  const handleLaunchViewAs = async () => {
    if (!selectedSocietyId) {
      setError("Please select a target society.");
      return;
    }
    if (!selectedUserId) {
      setError("No user available for this role in the selected society.");
      return;
    }

    try {
      setIsLaunching(true);
      setError(null);

      const targetSociety = societies.find((s) => s.id === selectedSocietyId);
      const targetUser = availableUsers.find((u) => u.user_id === selectedUserId);

      const res = await fetch("/api/auth/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          targetSocietyId: selectedSocietyId,
          targetRoleId: selectedRole,
          reason: `Super Admin View-As session: ${selectedRole} at ${targetSociety?.name || selectedSocietyId}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const targetPath = getDashboardPathForRole(selectedRole, selectedSocietyId);
        window.location.href = targetPath;
      } else {
        setError(data.error || "Failed to start View-As session.");
        setIsLaunching(false);
      }
    } catch (err) {
      console.error("View-As launch error:", err);
      setError("Connection error while initiating View-As session.");
      setIsLaunching(false);
    }
  };

  const currentPersonaDef = PERSONA_DEFINITIONS[selectedRole];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" className="font-mono text-[10px] px-2 py-0.5">
              PRIVATE PLATFORM CONSOLE
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Access & Persona Testing</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Logged in as <strong className="text-indigo-300 font-mono">{currentAdminEmail}</strong>. Select whether to access global platform administration or experience DwellSync through a real society persona.
          </p>
        </div>

        <Link href="/superadmin">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-2 shadow-lg shadow-indigo-600/30">
            <LayoutDashboard className="w-4 h-4" />
            <span>Super Admin Hub</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in-0">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View-As Selector Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Role Selector Grid */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            1. Select Target Persona / Role
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {(Object.keys(PERSONA_DEFINITIONS) as RoleId[])
              .filter((r) => r !== "SUPER_ADMIN")
              .map((roleKey) => {
                const def = PERSONA_DEFINITIONS[roleKey];
                const isSelected = selectedRole === roleKey;

                return (
                  <div
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-500 shadow-xs text-indigo-950 font-medium ring-1 ring-indigo-500/30"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{def.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {def.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{def.description}</p>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: Society & Exact User Selector Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            2. Target Society & Exact User Testing
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <span>View As: {currentPersonaDef?.title}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Target Route:{" "}
                    <code className="text-indigo-600 font-mono text-[11px]">
                      {getDashboardPathForRole(selectedRole, selectedSocietyId)}
                    </code>
                  </CardDescription>
                </div>
                <Badge variant="default" className="font-mono text-[10px]">
                  {selectedRole}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4 text-xs">
              {/* Society Dropdown */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Target Housing Society *</span>
                </label>
                <Select
                  value={selectedSocietyId}
                  onChange={(e) => setSelectedSocietyId(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300"
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) &middot; {s.city || "India"}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Exact User Dropdown */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Select Real Persona / User Account *</span>
                  </div>
                  {isLoadingUsers && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Querying personas...
                    </span>
                  )}
                </label>

                {availableUsers.length > 0 ? (
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="text-xs bg-slate-50 border-slate-300"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.profile?.full_name || "User"} ({u.profile?.email})
                        {u.unit_number ? ` — Unit ${u.unit_number}` : ""}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 text-amber-900 text-xs">
                    No active {selectedRole} users currently registered in this society. You can create one from the Society People Directory.
                  </div>
                )}
              </div>

              {/* Selected User Summary Preview */}
              {selectedUserId && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Persona Session Preview
                  </div>
                  {(() => {
                    const u = availableUsers.find((x) => x.user_id === selectedUserId);
                    const soc = societies.find((s) => s.id === selectedSocietyId);
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Effective User:</span>
                          <div className="font-bold text-slate-900">{u?.profile?.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u?.profile?.email}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Society Tenant:</span>
                          <div className="font-bold text-slate-900">{soc?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Code: {soc?.code}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-3">
                <Button
                  onClick={handleLaunchViewAs}
                  disabled={isLaunching || !selectedUserId || availableUsers.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 text-xs gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initiating View-As Session...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Enter DwellSync as {currentPersonaDef?.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
