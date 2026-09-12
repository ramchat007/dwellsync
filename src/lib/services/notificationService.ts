import { createAdminClient } from '../supabase/admin';
import { recordAuditLog } from '../auth/audit';
import {
  NotificationCategory,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  SendNotificationParams,
  SendNotificationResult,
} from '../notifications/types';
import { renderNotificationTemplate } from '../notifications/templates';
import { Locale } from '../i18n/types';
import { notificationProviderRegistry } from '../notifications/providers';

// Re-export domain types for backward compatibility
export type { NotificationCategory, NotificationType, NotificationChannel, NotificationDeliveryStatus };

/**
 * Legacy interface for backward compatibility with pre-Phase 10 callers.
 */
export interface NotificationPayload {
  channel: NotificationChannel | string;
  recipient: string; // user_id or legacy unit string
  subject?: string;
  template: string;
  data: Record<string, unknown>;
  societyId?: string;
  unitId?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel | string;
  messageId?: string;
  error?: string;
}

/**
 * Resolves authoritative profile UUIDs for a given unit.
 * Inspects active unit_owners and active unit_occupancies.
 */
export async function resolveUnitRecipients(unitId: string): Promise<string[]> {
  try {
    const adminClient = createAdminClient();
    const recipientSet = new Set<string>();

    // 1. Active unit owners
    const { data: owners } = await adminClient
      .from('unit_owners')
      .select('owner_user_id')
      .eq('unit_id', unitId)
      .eq('status', 'ACTIVE');

    if (owners) {
      owners.forEach((o: any) => {
        if (o.owner_user_id) recipientSet.add(o.owner_user_id);
      });
    }

    // 2. Active unit occupancies
    const { data: occupancies } = await adminClient
      .from('unit_occupancies')
      .select('user_id')
      .eq('unit_id', unitId)
      .is('end_date', null);

    if (occupancies) {
      occupancies.forEach((occ: any) => {
        if (occ.user_id) recipientSet.add(occ.user_id);
      });
    }

    return Array.from(recipientSet);
  } catch (err) {
    console.error('[NotificationService] Error resolving unit recipients:', err);
    return [];
  }
}

/**
 * Primary multi-tenant notification dispatcher.
 * Handles recipient derivation, preference checks, multi-channel dispatch,
 * in-app persistence, delivery tracking, and deduplication.
 */
export async function sendDomainNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const adminClient = createAdminClient();
  const { societyId, type, data, actorId, dedupKey, forceInApp, cooldownSeconds } = params;

  try {
    // 1. Resolve recipients
    let recipientIds: string[] = [];
    if (params.recipientIds && params.recipientIds.length > 0) {
      recipientIds = [...new Set(params.recipientIds)];
    } else if (params.unitId) {
      recipientIds = await resolveUnitRecipients(params.unitId);
    }

    if (recipientIds.length === 0) {
      return {
        success: true,
        notificationIds: [],
        recipientCount: 0,
        channelsAttempted: [],
      };
    }

    // 2. Pre-fetch recipient profiles (email, phone, preferred_language)
    const { data: recipientProfiles } = await adminClient
      .from('profiles')
      .select('id, email, phone, preferred_language')
      .in('id', recipientIds);

    const profileMap = new Map<string, { email: string | null; phone: string | null; preferred_language: Locale }>();
    if (recipientProfiles) {
      recipientProfiles.forEach((p: any) => {
        profileMap.set(p.id, {
          email: p.email || null,
          phone: p.phone || null,
          preferred_language: (p.preferred_language as Locale) || 'en',
        });
      });
    }

    const defaultRendered = renderNotificationTemplate(type, data);
    const category: NotificationCategory = params.category || defaultRendered.category;

    const createdNotificationIds: string[] = [];
    const channelsAttemptedSet = new Set<NotificationChannel>();
    let skippedCount = 0;

    // 3. Process each recipient with tenant isolation, localized template, and preferences check
    for (const recipientId of recipientIds) {
      // A. Check explicit dedupKey or auto-derive deterministic key from entity attributes
      const entityId =
        data && typeof data === 'object'
          ? (data as any).ticketNumber ||
            (data as any).complaintId ||
            (data as any).invoiceNumber ||
            (data as any).visitorId ||
            (data as any).eventId ||
            (data as any).pollId ||
            (data as any).noticeId ||
            (data as any).requestId
          : null;

      const effectiveDedupKey =
        dedupKey || (entityId ? `${societyId}:${recipientId}:${type}:${entityId}` : null);

      if (effectiveDedupKey) {
        const { data: existing } = await adminClient
          .from('notifications')
          .select('id')
          .eq('society_id', societyId)
          .eq('recipient_id', recipientId)
          .eq('dedup_key', effectiveDedupKey)
          .maybeSingle();

        if (existing) {
          // Idempotent hit: skip duplicate dispatch
          createdNotificationIds.push(existing.id);
          continue;
        }
      }

      // B. Check spam cooldown window if configured
      if (cooldownSeconds && cooldownSeconds > 0) {
        const cutoff = new Date(Date.now() - cooldownSeconds * 1000).toISOString();
        const { data: recent } = await adminClient
          .from('notifications')
          .select('id')
          .eq('society_id', societyId)
          .eq('recipient_id', recipientId)
          .eq('type', type)
          .gte('created_at', cutoff)
          .limit(1)
          .maybeSingle();

        if (recent) {
          // Cooldown suppression: skip duplicate rapid dispatch
          continue;
        }
      }

      // Fetch recipient preferences for this category
      const { data: pref } = await adminClient
        .from('notification_preferences')
        .select('*')
        .eq('society_id', societyId)
        .eq('user_id', recipientId)
        .eq('category', category)
        .maybeSingle();

      // Determine enabled channels
      // SECURITY alerts are ALWAYS in-app enabled by design and DB constraint
      const inAppEnabled = forceInApp || category === 'SECURITY' || (pref ? pref.in_app_enabled : true);
      const emailEnabled = pref ? pref.email_enabled : true;
      const smsEnabled = pref ? pref.sms_enabled : false;
      const waEnabled = pref ? pref.whatsapp_enabled : false;

      // Check if recipient has opted out of all channels
      if (!inAppEnabled && !emailEnabled && !smsEnabled && !waEnabled) {
        skippedCount++;
        continue;
      }

      // Resolve recipient contact info and locale
      const recipientProfile = profileMap.get(recipientId);
      const userEmail: string | null = recipientProfile?.email || null;
      const userPhone: string | null = recipientProfile?.phone || null;
      const recipientLocale: Locale = recipientProfile?.preferred_language || 'en';
      // Render localized content for this recipient
      const rendered = renderNotificationTemplate(type, data, recipientLocale);
      const title = rendered.title;
      const body = rendered.body;
      const actionUrl = params.actionUrl || rendered.actionUrl || null;

      // 4. Create in-app notification record if in-app enabled
      let notificationId: string | null = null;
      if (inAppEnabled) {
        channelsAttemptedSet.add('IN_APP');
        const { data: notifRecord, error: notifErr } = await adminClient
          .from('notifications')
          .insert({
            society_id: societyId,
            recipient_id: recipientId,
            actor_id: actorId || null,
            category,
            type,
            title,
            body,
            action_url: actionUrl,
            dedup_key: effectiveDedupKey || null,
            metadata: data || {},
          })
          .select('id')
          .single();

        if (!notifErr && notifRecord) {
          notificationId = notifRecord.id;
          if (notificationId) {
            createdNotificationIds.push(notificationId);
          }

          // Dispatch to inApp provider via registry
          const inAppProv = notificationProviderRegistry.get('IN_APP');
          await inAppProv.send({
            notificationId: notifRecord.id,
            recipientId,
            channel: 'IN_APP',
            title,
            body,
            actionUrl,
            metadata: data,
          });

          // Delivery log for IN_APP
          await adminClient.from('notification_deliveries').insert({
            notification_id: notifRecord.id,
            channel: 'IN_APP',
            provider: inAppProv.providerName,
            status: 'DELIVERED',
            provider_message_id: notifRecord.id,
          });
        } else {
          console.error('[NotificationService] In-app record creation failed:', notifErr);
        }
      }

      // If in-app wasn't enabled or didn't create a row, we still need a notification ID for delivery tracking
      // If none exists, create a system notification row to anchor external deliveries
      if (!notificationId) {
        const { data: fallbackNotif } = await adminClient
          .from('notifications')
          .insert({
            society_id: societyId,
            recipient_id: recipientId,
            actor_id: actorId || null,
            category,
            type,
            title,
            body,
            action_url: actionUrl,
            dedup_key: dedupKey || null,
            metadata: data || {},
            is_read: true, // Auto-read since user opted out of in-app view
          })
          .select('id')
          .single();

        if (fallbackNotif) {
          notificationId = fallbackNotif.id;
          if (notificationId) {
            createdNotificationIds.push(notificationId);
          }
        }
      }

      if (notificationId) {
        // Dispatch Email if enabled
        if (emailEnabled) {
          channelsAttemptedSet.add('EMAIL');
          const emailProv = notificationProviderRegistry.get('EMAIL');
          const emailRes = await emailProv.send({
            notificationId,
            recipientId,
            recipientEmail: userEmail,
            channel: 'EMAIL',
            title,
            body,
            actionUrl,
            metadata: data,
          });

          await adminClient.from('notification_deliveries').insert({
            notification_id: notificationId,
            channel: 'EMAIL',
            provider: emailRes.provider,
            status: emailRes.status,
            provider_message_id: emailRes.providerMessageId || null,
            error_message: emailRes.errorMessage || null,
          });
        }

        // Dispatch SMS if enabled
        if (smsEnabled) {
          channelsAttemptedSet.add('SMS');
          const smsProv = notificationProviderRegistry.get('SMS');
          const smsRes = await smsProv.send({
            notificationId,
            recipientId,
            recipientPhone: userPhone,
            channel: 'SMS',
            title,
            body,
            actionUrl,
            metadata: data,
          });

          await adminClient.from('notification_deliveries').insert({
            notification_id: notificationId,
            channel: 'SMS',
            provider: smsRes.provider,
            status: smsRes.status,
            provider_message_id: smsRes.providerMessageId || null,
            error_message: smsRes.errorMessage || null,
          });
        }

        // Dispatch WhatsApp if enabled
        if (waEnabled) {
          channelsAttemptedSet.add('WHATSAPP');
          const waProv = notificationProviderRegistry.get('WHATSAPP');
          const waRes = await waProv.send({
            notificationId,
            recipientId,
            recipientPhone: userPhone,
            channel: 'WHATSAPP',
            title,
            body,
            actionUrl,
            metadata: data,
          });

          await adminClient.from('notification_deliveries').insert({
            notification_id: notificationId,
            channel: 'WHATSAPP',
            provider: waRes.provider,
            status: waRes.status,
            provider_message_id: waRes.providerMessageId || null,
            error_message: waRes.errorMessage || null,
          });
        }
      }
    }

    // 5. Audit trail
    await recordAuditLog({
      actorUserId: actorId || null,
      societyId,
      action: 'NOTIFICATION_SENT',
      resourceType: 'notifications',
      resourceId: createdNotificationIds[0] || null,
      metadata: {
        type,
        category,
        recipientCount: createdNotificationIds.length,
        channels: Array.from(channelsAttemptedSet),
      },
    });

    return {
      success: true,
      notificationIds: createdNotificationIds,
      recipientCount: createdNotificationIds.length,
      channelsAttempted: Array.from(channelsAttemptedSet),
      skippedDueToPreferences: skippedCount,
    };
  } catch (err: any) {
    console.error('[NotificationService] sendDomainNotification exception:', err);
    return {
      success: false,
      notificationIds: [],
      recipientCount: 0,
      channelsAttempted: [],
      error: err.message || 'Notification dispatch failed',
    };
  }
}

/**
 * Society-wide batch broadcast dispatcher.
 * Efficiently discovers all society residents and dispatches notifications.
 */
export async function broadcastSocietyNotification(params: {
  societyId: string;
  actorId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  targetRole?: string | null;
}): Promise<SendNotificationResult> {
  const adminClient = createAdminClient();
  const { societyId, actorId, category, type, title, body, actionUrl, targetRole } = params;

  try {
    // 1. Fetch society memberships
    let query = adminClient
      .from('society_memberships')
      .select('user_id, role:roles(name)')
      .eq('society_id', societyId)
      .eq('status', 'ACTIVE');

    const { data: members, error } = await query;
    if (error || !members) {
      throw new Error(error?.message || 'Failed to fetch society members');
    }

    let recipientIds = members.map((m: any) => m.user_id);
    if (targetRole) {
      recipientIds = members
        .filter((m: any) => m.role?.name?.toUpperCase() === targetRole.toUpperCase())
        .map((m: any) => m.user_id);
    }

    recipientIds = Array.from(new Set(recipientIds.filter(Boolean)));

    if (recipientIds.length === 0) {
      return {
        success: true,
        notificationIds: [],
        recipientCount: 0,
        channelsAttempted: [],
      };
    }

    // 2. Batch create notification records
    const now = new Date().toISOString();
    const rows = recipientIds.map((userId) => ({
      society_id: societyId,
      recipient_id: userId,
      actor_id: actorId,
      category,
      type,
      title,
      body,
      action_url: actionUrl || null,
      metadata: { broadcast: true, targetRole: targetRole || 'ALL' },
      created_at: now,
      updated_at: now,
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from('notifications')
      .insert(rows)
      .select('id');

    if (insertErr) {
      throw new Error(insertErr.message || 'Failed to batch insert broadcast notifications');
    }

    const insertedIds = inserted ? inserted.map((n: any) => n.id) : [];

    // Audit broadcast
    await recordAuditLog({
      actorUserId: actorId,
      societyId,
      action: 'NOTIFICATION_BROADCAST',
      resourceType: 'notifications',
      metadata: {
        title,
        recipientCount: insertedIds.length,
        category,
        type,
        targetRole: targetRole || 'ALL',
      },
    });

    return {
      success: true,
      notificationIds: insertedIds,
      recipientCount: insertedIds.length,
      channelsAttempted: ['IN_APP'],
    };
  } catch (err: any) {
    console.error('[NotificationService] broadcastSocietyNotification exception:', err);
    return {
      success: false,
      notificationIds: [],
      recipientCount: 0,
      channelsAttempted: [],
      error: err.message || 'Broadcast failed',
    };
  }
}

/**
 * Backward-compatible sendNotification implementation.
 * Ensures existing callers in visitor routes do not break while transitioning.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  console.log('[NotificationService] Handling legacy payload:', payload.template, payload.recipient);

  // If societyId and unitId are available, route through sendDomainNotification
  if (payload.societyId && payload.unitId) {
    const res = await sendDomainNotification({
      societyId: payload.societyId,
      unitId: payload.unitId,
      type: (payload.template as NotificationType) || 'GENERAL_ANNOUNCEMENT',
      data: payload.data || {},
    });
    return {
      success: res.success,
      channel: payload.channel,
      messageId: res.notificationIds[0] || `sim_${Date.now()}`,
      error: res.error,
    };
  }

  // Fallback simulated response
  return {
    success: true,
    channel: payload.channel,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
}
