"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Profile, RoleId, Society, SocietyMembership } from "@/lib/types/database";
import { Users, UserCheck, Shield, Building2, Search, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface UserWithMemberships extends Profile {
  memberships: (SocietyMembership & { society: Society })[];
  isPlatformSuperAdmin: boolean;
}

export function UsersClient({ initialUsers }: { initialUsers: UserWithMemberships[] }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [users] = useState<UserWithMemberships[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>("");
  const [impersonationReason, setImpersonationReason] = useState("");
  const [isImpersonating, setIsImpersonating] = useState(false);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.display_name && u.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenImpersonate = (user: UserWithMemberships) => {
    setSelectedUser(user);
    if (user.memberships && user.memberships.length > 0) {
      setSelectedSocietyId(user.memberships[0].society_id);
    } else {
      setSelectedSocietyId("");
    }
    setImpersonationReason("Administrative troubleshooting and permission inspection");
  };

  const handleExecuteImpersonation = async () => {
    if (!selectedUser) return;

    try {
      setIsImpersonating(true);
      const res = await fetch("/api/auth/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          targetSocietyId: selectedSocietyId || undefined,
          reason: impersonationReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshSession();
        setSelectedUser(null);
        if (data.targetSocietyId) {
          router.push(`/society/${data.targetSocietyId}/dashboard`);
        } else {
          router.push("/superadmin");
        }
        router.refresh();
      } else {
        alert(data.error || "Failed to start impersonation");
      }
    } catch (err) {
      console.error("Impersonation error:", err);
      alert("Error starting impersonation.");
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Users & Personas</h1>
          <p className="text-xs text-slate-500">
            Real authenticated database identities across societies and platform privileges.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search by name, email or persona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Identity</TableHead>
              <TableHead>Platform Status</TableHead>
              <TableHead>Society Roles & Memberships</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{user.full_name || user.display_name || "User"}</span>
                          {user.isPlatformSuperAdmin && (
                            <Badge variant="purple" className="text-[9px] px-1.5 py-0 font-mono font-bold">
                              SUPER ADMIN
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={user.status === "ACTIVE" ? "success" : "destructive"}
                      className="font-mono text-[10px]"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {user.memberships && user.memberships.length > 0 ? (
                      <div className="space-y-1">
                        {user.memberships.map((m) => (
                          <div
                            key={m.id}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 mr-1.5 mb-1"
                          >
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span className="font-medium">{m.society?.name || "Society"}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-indigo-700 font-mono">{m.role_id}</span>
                            {m.unit_number && (
                              <span className="text-[10px] text-slate-500">({m.unit_number})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No society memberships</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 font-mono">
                    {formatDate(user.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    {!user.isPlatformSuperAdmin ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenImpersonate(user)}
                        className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs h-8 px-3 shadow-sm font-semibold"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Login As</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">Platform Owner</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  {searchQuery ? "No matching users found." : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <KeyRound className="w-5 h-5" />
            <DialogTitle>Secure Impersonation Gateway</DialogTitle>
          </div>
          <DialogDescription>
            You are initiating a server-controlled impersonation session. All actions taken will be recorded in the immutable audit log.
          </DialogDescription>
        </DialogHeader>

        {selectedUser && (
          <div className="space-y-4 my-2 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1">
              <div>
                Target Identity: <strong>{selectedUser.full_name}</strong> ({selectedUser.email})
              </div>
              <div className="text-[11px] text-amber-800">
                User ID: <span className="font-mono">{selectedUser.id}</span>
              </div>
            </div>

            {selectedUser.memberships && selectedUser.memberships.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Select Tenant Context (Society):
                </label>
                <select
                  value={selectedSocietyId}
                  onChange={(e) => setSelectedSocietyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {selectedUser.memberships.map((m) => (
                    <option key={m.society_id} value={m.society_id}>
                      {m.society?.name} — Role: {m.role_id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Audit Reason for Impersonation:
              </label>
              <Input
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="e.g. Troubleshooting resident complaint permissions"
                className="text-xs"
              />
            </div>

            <div className="p-2.5 bg-slate-100 rounded-md border border-slate-200 text-[11px] text-slate-600 font-mono">
              🛡️ Zero Password Disclosure: Session established cryptographically on server.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedUser(null)}
            disabled={isImpersonating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExecuteImpersonation}
            disabled={isImpersonating}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
          >
            {isImpersonating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Starting Session...
              </>
            ) : (
              "Confirm & Login As User"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
