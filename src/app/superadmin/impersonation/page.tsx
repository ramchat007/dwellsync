import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentIdentity } from "@/lib/auth/server";
import { ImpersonationSession } from "@/lib/types/database";
import { UserCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminImpersonationPage() {
  await getCurrentIdentity();
  const adminClient = createAdminClient();

  const { data: sessions } = await adminClient
    .from("impersonation_sessions")
    .select(`
      *,
      original_admin:original_admin_id (*),
      target_user:target_user_id (*),
      target_society:target_society_id (*)
    `)
    .order("started_at", { ascending: false });

  const sessionList = (sessions as ImpersonationSession[]) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Impersonation Session Registry</h1>
        <p className="text-xs text-slate-500">
          Server-controlled, cryptographic session registry for platform troubleshooting.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target Identity</TableHead>
              <TableHead>Target Society & Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead className="text-right">Ended At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionList.length > 0 ? (
              sessionList.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">
                          {session.target_user?.full_name || session.target_user?.email || "User"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {session.target_user_id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="font-medium text-slate-800">
                      {session.target_society?.name || "Platform Context"}
                    </div>
                    <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">
                      {session.target_role_id || "RESIDENT"}
                    </span>
                  </TableCell>

                  <TableCell>
                    {session.status === "ACTIVE" ? (
                      <Badge variant="warning" className="gap-1 font-mono text-[10px] animate-pulse">
                        <ShieldAlert className="w-3 h-3" /> ACTIVE
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" /> TERMINATED
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                    {session.reason || "Administrative troubleshooting"}
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 font-mono">
                    {formatDate(session.started_at)}
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500 font-mono">
                    {session.ended_at ? formatDate(session.ended_at) : "In Progress"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  No impersonation sessions recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
