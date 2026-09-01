import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentIdentity } from "@/lib/auth/server";
import { AuditLog } from "@/lib/types/database";
import { FileText, Shield, User, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminAuditLogsPage() {
  await getCurrentIdentity();
  const adminClient = createAdminClient();

  const { data: logs } = await adminClient
    .from("audit_logs")
    .select(`
      *,
      actor:actor_user_id (*),
      effective_user:effective_user_id (*),
      society:society_id (*)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const auditList = (logs as AuditLog[]) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Audit Logs</h1>
        <p className="text-xs text-slate-500">
          Append-only, cryptographically timestamped governance log.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event / Action</TableHead>
              <TableHead>Actor Identity</TableHead>
              <TableHead>Effective Target / Context</TableHead>
              <TableHead>Metadata / Resource</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditList.length > 0 ? (
              auditList.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 font-mono">
                          {log.action}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.resource_type}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-slate-800">
                        {log.actor?.full_name || log.actor?.email || log.actor_user_id?.substring(0, 8) || "System"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      {log.effective_user_id && log.effective_user_id !== log.actor_user_id && (
                        <div className="flex items-center gap-1 text-amber-800 font-medium">
                          <User className="w-3 h-3" />
                          <span>{log.effective_user?.full_name || log.effective_user_id.substring(0, 8)}</span>
                        </div>
                      )}
                      {log.society && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Building2 className="w-3 h-3" />
                          <span>{log.society.name}</span>
                        </div>
                      )}
                      {!log.society && !log.effective_user_id && (
                        <span className="text-slate-400 text-[11px] font-mono">Platform</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs max-w-xs">
                    <pre className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-700 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500 font-mono">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  No audit events recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
