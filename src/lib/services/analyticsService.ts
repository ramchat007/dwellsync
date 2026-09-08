import { createAdminClient } from "../supabase/admin";
import { AnalyticsTimeframe } from "../validations/analytics";

export interface SocietyAnalyticsData {
  societyId: string;
  societyName: string;
  societyCode: string;
  generatedAt: string;
  timeframe: AnalyticsTimeframe;

  units: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    maintenanceUnits: number;
    occupancyRate: number;
    totalBuildings: number;
    totalWings: number;
    totalFloors: number;
    ownersCount: number;
    tenantsCount: number;
  };

  members: {
    totalActiveMembers: number;
    byRole: Record<string, number>;
  };

  visitors: {
    totalVisitors: number;
    checkedIn: number;
    checkedOut: number;
    expected: number;
    cancelled: number;
    todayVisitorsCount: number;
  };

  complaints: {
    totalComplaints: number;
    submitted: number;
    inProgress: number;
    resolved: number;
    closed: number;
    resolutionRate: number;
    byPriority: {
      emergency: number;
      high: number;
      medium: number;
      low: number;
    };
    byCategory: Record<string, number>;
  };

  amenities: {
    totalAmenities: number;
    availableAmenities: number;
    maintenanceAmenities: number;
    totalBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
  };

  events: {
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalNotices: number;
    totalDocuments: number;
  };

  billing: {
    totalInvoicedAmount: number;
    totalCollectedAmount: number;
    outstandingBalance: number;
    collectionRate: number;
    invoicesCount: number;
    paidInvoicesCount: number;
    pendingInvoicesCount: number;
    overdueInvoicesCount: number;
    paymentsCount: number;
  };

  notifications: {
    totalSent: number;
    readCount: number;
    unreadCount: number;
    readRate: number;
    byCategory: Record<string, number>;
  };

  governance: {
    activeCommitteesCount: number;
    committeeMembersCount: number;
    totalMeetings: number;
    scheduledMeetings: number;
    completedMeetings: number;
    cancelledMeetings: number;
    totalActionItems: number;
    openActionItems: number;
    completedActionItems: number;
    actionItemCompletionRate: number;
  };
}

export interface PlatformAnalyticsData {
  generatedAt: string;
  timeframe: AnalyticsTimeframe;

  societies: {
    totalSocieties: number;
    activeSocieties: number;
    onboardingSocieties: number;
    suspendedSocieties: number;
  };

  users: {
    totalUsers: number;
    totalMemberships: number;
    activeMemberships: number;
    byRole: Record<string, number>;
  };

  infrastructure: {
    totalBuildings: number;
    totalUnits: number;
  };

  activity: {
    totalComplaintsLogged: number;
    totalInvoicesGenerated: number;
    totalVisitorCheckins: number;
    totalGovernanceMeetings: number;
    totalNotificationsDispatched: number;
    totalAuditLogs: number;
  };

  health: {
    databaseStatus: "HEALTHY" | "DEGRADED";
    rlsStatus: "ACTIVE";
    activeImpersonations: number;
    recentAuditCount: number;
  };
}

function calculateStartDate(timeframe: AnalyticsTimeframe): string | null {
  const now = new Date();
  switch (timeframe) {
    case "7d":
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case "30d":
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    case "90d":
      now.setDate(now.getDate() - 90);
      return now.toISOString();
    case "year":
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString();
    case "all":
    default:
      return null;
  }
}

export async function getSocietyAnalytics(
  societyId: string,
  timeframe: AnalyticsTimeframe = "30d"
): Promise<SocietyAnalyticsData> {
  const adminClient = createAdminClient();
  const startDate = calculateStartDate(timeframe);

  // 1. Society Profile
  const { data: society } = await adminClient
    .from("societies")
    .select("id, name, code")
    .eq("id", societyId)
    .single();

  const societyName = society?.name || "Society";
  const societyCode = society?.code || "SOC";

  // 2. Structural & Units
  const [
    { data: units = [] },
    { count: totalBuildings },
    { count: totalWings },
    { count: totalFloors },
    { data: unitOwners = [] },
    { data: unitOccupancies = [] },
    { data: memberships = [] },
  ] = await Promise.all([
    adminClient.from("units").select("id, status").eq("society_id", societyId),
    adminClient.from("buildings").select("id", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("wings").select("id", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("floors").select("id", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("unit_owners").select("id").eq("society_id", societyId).eq("status", "ACTIVE"),
    adminClient.from("unit_occupancies").select("id").eq("society_id", societyId).eq("status", "ACTIVE"),
    adminClient.from("society_memberships").select("id, role_id, status").eq("society_id", societyId).eq("status", "ACTIVE"),
  ]);

  const totalUnits = (units || []).length;
  const occupiedUnits = (units || []).filter((u) => u.status === "OCCUPIED").length;
  const vacantUnits = (units || []).filter((u) => u.status === "VACANT").length;
  const maintenanceUnits = (units || []).filter((u) => u.status === "MAINTENANCE" || u.status === "RESERVED").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Members Role Breakdown
  const roleCounts: Record<string, number> = {};
  (memberships || []).forEach((m) => {
    roleCounts[m.role_id] = (roleCounts[m.role_id] || 0) + 1;
  });

  // 3. Visitors
  let visitorQuery = adminClient.from("visitors").select("id, status, created_at").eq("society_id", societyId);
  if (startDate) {
    visitorQuery = visitorQuery.gte("created_at", startDate);
  }
  const { data: visitors = [] } = await visitorQuery;

  const todayStr = new Date().toISOString().split("T")[0];
  const totalVisitors = (visitors || []).length;
  const checkedIn = (visitors || []).filter((v) => v.status === "CHECKED_IN").length;
  const checkedOut = (visitors || []).filter((v) => v.status === "CHECKED_OUT").length;
  const expected = (visitors || []).filter((v) => v.status === "EXPECTED").length;
  const cancelled = (visitors || []).filter((v) => v.status === "CANCELLED" || v.status === "REJECTED").length;
  const todayVisitorsCount = (visitors || []).filter((v) => v.created_at && v.created_at.startsWith(todayStr)).length;

  // 4. Complaints
  let complaintQuery = adminClient
    .from("complaints")
    .select("id, status, priority, category, created_at")
    .eq("society_id", societyId);
  if (startDate) {
    complaintQuery = complaintQuery.gte("created_at", startDate);
  }
  const { data: complaints = [] } = await complaintQuery;

  const totalComplaints = (complaints || []).length;
  const submitted = (complaints || []).filter((c) => c.status === "SUBMITTED").length;
  const inProgress = (complaints || []).filter((c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length;
  const resolved = (complaints || []).filter((c) => c.status === "RESOLVED").length;
  const closed = (complaints || []).filter((c) => c.status === "CLOSED").length;
  const resolutionRate = totalComplaints > 0 ? Math.round(((resolved + closed) / totalComplaints) * 100) : 0;

  const byPriority = {
    emergency: (complaints || []).filter((c) => c.priority === "EMERGENCY").length,
    high: (complaints || []).filter((c) => c.priority === "HIGH").length,
    medium: (complaints || []).filter((c) => c.priority === "MEDIUM").length,
    low: (complaints || []).filter((c) => c.priority === "LOW").length,
  };

  const complaintCategories: Record<string, number> = {};
  (complaints || []).forEach((c) => {
    if (c.category) {
      complaintCategories[c.category] = (complaintCategories[c.category] || 0) + 1;
    }
  });

  // 5. Amenities & Bookings
  const [{ data: amenities = [] }, { data: bookings = [] }] = await Promise.all([
    adminClient.from("amenities").select("id, status").eq("society_id", societyId),
    adminClient.from("amenity_bookings").select("id, status, booking_date").eq("society_id", societyId),
  ]);

  const totalAmenities = (amenities || []).length;
  const availableAmenities = (amenities || []).filter((a) => a.status === "AVAILABLE").length;
  const maintenanceAmenities = (amenities || []).filter((a) => a.status === "MAINTENANCE" || a.status === "CLOSED").length;
  const totalBookings = (bookings || []).length;
  const confirmedBookings = (bookings || []).filter((b) => b.status === "CONFIRMED").length;
  const completedBookings = (bookings || []).filter((b) => b.status === "COMPLETED").length;
  const cancelledBookings = (bookings || []).filter((b) => b.status === "CANCELLED").length;

  // 6. Events, Notices & Documents
  const [{ data: events = [] }, { data: notices = [] }, { data: documents = [] }] = await Promise.all([
    adminClient.from("society_events").select("id, status, event_date").eq("society_id", societyId),
    adminClient.from("notices").select("id, status").eq("society_id", societyId),
    adminClient.from("documents").select("id").eq("society_id", societyId),
  ]);

  const totalEvents = (events || []).length;
  const upcomingEvents = (events || []).filter((e) => e.status === "UPCOMING").length;
  const completedEvents = (events || []).filter((e) => e.status === "COMPLETED").length;
  const totalNotices = (notices || []).length;
  const totalDocuments = (documents || []).length;

  // 7. Maintenance & Financials
  let invoiceQuery = adminClient
    .from("invoices")
    .select("id, status, total_amount, subtotal, adjustments, due_date, invoice_date")
    .eq("society_id", societyId);
  if (startDate) {
    invoiceQuery = invoiceQuery.gte("invoice_date", startDate.split("T")[0]);
  }

  let paymentQuery = adminClient
    .from("payments")
    .select("id, status, amount, payment_date")
    .eq("society_id", societyId);
  if (startDate) {
    paymentQuery = paymentQuery.gte("payment_date", startDate.split("T")[0]);
  }

  const [{ data: invoices = [] }, { data: payments = [] }] = await Promise.all([invoiceQuery, paymentQuery]);

  const totalInvoicedAmount = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalCollectedAmount = (payments || [])
    .filter((p) => p.status === "COMPLETED" || p.status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstandingBalance = Math.max(0, totalInvoicedAmount - totalCollectedAmount);
  const collectionRate = totalInvoicedAmount > 0 ? Math.min(100, Math.round((totalCollectedAmount / totalInvoicedAmount) * 100)) : 0;

  const invoicesCount = (invoices || []).length;
  const paidInvoicesCount = (invoices || []).filter((i) => i.status === "PAID").length;
  const pendingInvoicesCount = (invoices || []).filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID").length;
  const overdueInvoicesCount = (invoices || []).filter((i) => i.status === "OVERDUE").length;
  const paymentsCount = (payments || []).length;

  // 8. Notifications
  let notifQuery = adminClient.from("notifications").select("id, is_read, category, created_at").eq("society_id", societyId);
  if (startDate) {
    notifQuery = notifQuery.gte("created_at", startDate);
  }
  const { data: notifications = [] } = await notifQuery;

  const totalSent = (notifications || []).length;
  const readCount = (notifications || []).filter((n) => n.is_read === true).length;
  const unreadCount = totalSent - readCount;
  const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

  const notifCategories: Record<string, number> = {};
  (notifications || []).forEach((n) => {
    if (n.category) {
      notifCategories[n.category] = (notifCategories[n.category] || 0) + 1;
    }
  });

  // 9. Governance & Meetings
  const [
    { data: committees = [] },
    { data: committeeMembers = [] },
    { data: meetings = [] },
    { data: actionItems = [] },
  ] = await Promise.all([
    adminClient.from("committees").select("id, status").eq("society_id", societyId),
    adminClient.from("committee_members").select("id, status").eq("society_id", societyId),
    adminClient.from("society_meetings").select("id, status").eq("society_id", societyId),
    adminClient.from("meeting_action_items").select("id, status").eq("society_id", societyId),
  ]);

  const activeCommitteesCount = (committees || []).filter((c) => c.status === "ACTIVE").length;
  const committeeMembersCount = (committeeMembers || []).filter((m) => m.status === "ACTIVE").length;
  const totalMeetings = (meetings || []).length;
  const scheduledMeetings = (meetings || []).filter((m) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS").length;
  const completedMeetings = (meetings || []).filter((m) => m.status === "COMPLETED").length;
  const cancelledMeetings = (meetings || []).filter((m) => m.status === "CANCELLED").length;

  const totalActionItems = (actionItems || []).length;
  const openActionItems = (actionItems || []).filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS" || a.status === "BLOCKED").length;
  const completedActionItems = (actionItems || []).filter((a) => a.status === "COMPLETED").length;
  const actionItemCompletionRate = totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0;

  return {
    societyId,
    societyName,
    societyCode,
    generatedAt: new Date().toISOString(),
    timeframe,
    units: {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      maintenanceUnits,
      occupancyRate,
      totalBuildings: totalBuildings || 0,
      totalWings: totalWings || 0,
      totalFloors: totalFloors || 0,
      ownersCount: (unitOwners || []).length,
      tenantsCount: (unitOccupancies || []).length,
    },
    members: {
      totalActiveMembers: (memberships || []).length,
      byRole: roleCounts,
    },
    visitors: {
      totalVisitors,
      checkedIn,
      checkedOut,
      expected,
      cancelled,
      todayVisitorsCount,
    },
    complaints: {
      totalComplaints,
      submitted,
      inProgress,
      resolved,
      closed,
      resolutionRate,
      byPriority,
      byCategory: complaintCategories,
    },
    amenities: {
      totalAmenities,
      availableAmenities,
      maintenanceAmenities,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
    },
    events: {
      totalEvents,
      upcomingEvents,
      completedEvents,
      totalNotices,
      totalDocuments,
    },
    billing: {
      totalInvoicedAmount,
      totalCollectedAmount,
      outstandingBalance,
      collectionRate,
      invoicesCount,
      paidInvoicesCount,
      pendingInvoicesCount,
      overdueInvoicesCount,
      paymentsCount,
    },
    notifications: {
      totalSent,
      readCount,
      unreadCount,
      readRate,
      byCategory: notifCategories,
    },
    governance: {
      activeCommitteesCount,
      committeeMembersCount,
      totalMeetings,
      scheduledMeetings,
      completedMeetings,
      cancelledMeetings,
      totalActionItems,
      openActionItems,
      completedActionItems,
      actionItemCompletionRate,
    },
  };
}

export async function getPlatformAnalytics(
  timeframe: AnalyticsTimeframe = "30d"
): Promise<PlatformAnalyticsData> {
  const adminClient = createAdminClient();
  const startDate = calculateStartDate(timeframe);

  const [
    { count: totalSocieties },
    { count: activeSocieties },
    { count: onboardingSocieties },
    { count: suspendedSocieties },
    { count: totalUsers },
    { data: memberships = [] },
    { count: totalBuildings },
    { count: totalUnits },
    { count: totalComplaintsLogged },
    { count: totalInvoicesGenerated },
    { count: totalVisitorCheckins },
    { count: totalGovernanceMeetings },
    { count: totalNotificationsDispatched },
    { count: totalAuditLogs },
    { count: activeImpersonations },
  ] = await Promise.all([
    adminClient.from("societies").select("id", { count: "exact", head: true }),
    adminClient.from("societies").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    adminClient.from("societies").select("id", { count: "exact", head: true }).eq("status", "ONBOARDING"),
    adminClient.from("societies").select("id", { count: "exact", head: true }).eq("status", "SUSPENDED"),
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient.from("society_memberships").select("id, role_id, status"),
    adminClient.from("buildings").select("id", { count: "exact", head: true }),
    adminClient.from("units").select("id", { count: "exact", head: true }),
    adminClient.from("complaints").select("id", { count: "exact", head: true }),
    adminClient.from("invoices").select("id", { count: "exact", head: true }),
    adminClient.from("visitors").select("id", { count: "exact", head: true }).eq("status", "CHECKED_IN"),
    adminClient.from("society_meetings").select("id", { count: "exact", head: true }),
    adminClient.from("notifications").select("id", { count: "exact", head: true }),
    adminClient.from("audit_logs").select("id", { count: "exact", head: true }),
    adminClient.from("impersonation_sessions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
  ]);

  const totalMemberships = (memberships || []).length;
  const activeMemberships = (memberships || []).filter((m) => m.status === "ACTIVE").length;

  const roleCounts: Record<string, number> = {};
  (memberships || []).forEach((m) => {
    roleCounts[m.role_id] = (roleCounts[m.role_id] || 0) + 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    timeframe,
    societies: {
      totalSocieties: totalSocieties || 0,
      activeSocieties: activeSocieties || 0,
      onboardingSocieties: onboardingSocieties || 0,
      suspendedSocieties: suspendedSocieties || 0,
    },
    users: {
      totalUsers: totalUsers || 0,
      totalMemberships,
      activeMemberships,
      byRole: roleCounts,
    },
    infrastructure: {
      totalBuildings: totalBuildings || 0,
      totalUnits: totalUnits || 0,
    },
    activity: {
      totalComplaintsLogged: totalComplaintsLogged || 0,
      totalInvoicesGenerated: totalInvoicesGenerated || 0,
      totalVisitorCheckins: totalVisitorCheckins || 0,
      totalGovernanceMeetings: totalGovernanceMeetings || 0,
      totalNotificationsDispatched: totalNotificationsDispatched || 0,
      totalAuditLogs: totalAuditLogs || 0,
    },
    health: {
      databaseStatus: "HEALTHY",
      rlsStatus: "ACTIVE",
      activeImpersonations: activeImpersonations || 0,
      recentAuditCount: totalAuditLogs || 0,
    },
  };
}

