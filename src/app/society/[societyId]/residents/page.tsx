import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SocietyResidentsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { society } = await requireSocietyAccess(societyId);
  const adminClient = createAdminClient();

  const { data: memberships } = await adminClient
    .from("society_memberships")
    .select(`
      *,
      profile:profiles (*)
    `)
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  const list = memberships || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Residents & Members Directory</h1>
        <p className="text-xs text-slate-500">
          Memberships and assigned roles inside {society.name}.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Unit / Flat</TableHead>
              <TableHead className="text-right">Joined Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length > 0 ? (
              list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {m.profile?.full_name?.[0]?.toUpperCase() || m.profile?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <span className="font-semibold text-slate-900 text-xs">
                        {m.profile?.full_name || m.profile?.display_name || "Resident"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-mono text-slate-600">
                    {m.profile?.email}
                  </TableCell>

                  <TableCell>
                    <Badge variant="default" className="font-mono text-[10px]">
                      {m.role_id}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs font-mono text-slate-600">
                    {m.unit_number || "—"}
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500 font-mono">
                    {formatDate(m.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  No members registered in this society yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
