"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ShieldAlert,
  Receipt,
  MessageSquare,
  FileText,
  Calendar,
  Sparkles,
  Info,
  Settings,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/context";

interface NotificationItem {
  id: string;
  society_id: string;
  recipient_id: string;
  category: "SECURITY" | "BILLING" | "COMPLAINTS" | "NOTICES" | "AMENITIES" | "EVENTS" | "GENERAL";
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "SECURITY", label: "Security & Gate" },
  { id: "BILLING", label: "Billing & Dues" },
  { id: "COMPLAINTS", label: "Complaints & SLA" },
  { id: "NOTICES", label: "Notices & Circulars" },
  { id: "EVENTS", label: "Events & Polls" },
  { id: "GENERAL", label: "General & System" },
] as const;

export default function ResidentNotificationInboxPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedCategory !== "ALL") {
        params.set("category", selectedCategory);
      }
      if (unreadOnly) {
        params.set("unreadOnly", "true");
      }

      const res = await fetch(`/api/resident/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("[NotificationInbox] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/resident/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("[NotificationInbox] Mark as read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/resident/notifications/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[NotificationInbox] Mark all read failed:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "SECURITY":
        return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
      case "BILLING":
        return <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "COMPLAINTS":
        return <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />;
      case "NOTICES":
        return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
      case "AMENITIES":
        return <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />;
      case "EVENTS":
        return <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(query) ||
      n.body.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex-1 max-w-5xl mx-auto space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Inbox
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white font-semibold text-xs px-2.5 py-0.5">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stay updated with real-time gate passes, maintenance invoices, complaint status, and society notices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={isMarkingAll}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all as read
            </Button>
          )}

          <Link href="/resident/settings/notifications">
            <Button variant="outline" size="sm" className="text-xs">
              <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Preferences
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            Unread only
          </label>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {isLoading && notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto" />
            <div className="text-xs text-slate-500">Loading notifications...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <div className="font-semibold text-sm text-slate-800">No notifications found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? "No notifications matching your search query."
                : unreadOnly
                ? "You're all caught up! No unread notifications in this category."
                : "No notifications have been received yet."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const dateStr = new Date(n.created_at).toLocaleString();

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  !n.is_read
                    ? "bg-blue-50/40 border-blue-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="mt-0.5 p-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-500 border-slate-200">
                        {n.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed break-words">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>{dateStr}</span>
                      {n.action_url && (
                        <Link
                          href={n.action_url}
                          className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                        >
                          View Details
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => markAsRead(n.id, e)}
                    className="text-xs text-slate-400 hover:text-blue-600 shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Mark read
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
