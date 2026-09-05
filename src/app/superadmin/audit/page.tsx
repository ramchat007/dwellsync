import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuditLog } from "@/lib/types/database";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminAuditLogsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isSuperAdmin) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();
  const { data: logs } = await adminClient
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const auditLogs = (logs as AuditLog[]) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Trail"
        description="Immutable forensic log of all administrative, impersonation, and structural transactions across DwellSyncHub."
        badge={
          <Badge variant="purple" className="font-mono text-[10px]">
            SECURITY LEDGER
          </Badge>
        }
      />

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Recent System Audit Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Resource Type</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>Actor User</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      {log.action}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {log.resource_type}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 truncate max-w-[150px]">
                      {log.resource_id || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-indigo-600 truncate max-w-[150px]">
                      {log.actor_user_id || "SYSTEM"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-400">
                      {formatDate(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No audit logs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

