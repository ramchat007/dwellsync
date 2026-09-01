import { createAdminClient } from "../supabase/admin";
import { AuditAction, AuditLog } from "../types/database";

export interface LogAuditParams {
  actorUserId?: string | null;
  effectiveUserId?: string | null;
  societyId?: string | null;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(params: LogAuditParams): Promise<AuditLog | null> {
  try {
    const adminClient = createAdminClient();
    
    const sanitizedMetadata = { ...params.metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.secret;

    const { data, error } = await adminClient
      .from("audit_logs")
      .insert({
        actor_user_id: params.actorUserId || null,
        effective_user_id: params.effectiveUserId || params.actorUserId || null,
        society_id: params.societyId || null,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        metadata: sanitizedMetadata,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[AuditLog] Failed to record audit event:", error);
      return null;
    }

    return data as AuditLog;
  } catch (err) {
    console.error("[AuditLog] Exception recording audit log:", err);
    return null;
  }
}
