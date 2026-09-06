"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2, ExternalLink, ShieldAlert, FileText, Wrench, Receipt, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/resident/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("[NotificationBell] Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // Polling every 45s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      console.error("[NotificationBell] Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/resident/notifications/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[NotificationBell] Failed to mark all as read:", err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "SECURITY":
        return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
      case "BILLING":
        return <Receipt className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "COMPLAINTS":
        return <Wrench className="w-4 h-4 text-amber-500 shrink-0" />;
      case "NOTICES":
        return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
      case "EVENTS":
        return <Calendar className="w-4 h-4 text-purple-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center space-x-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !n.is_read ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div className="mt-0.5">{getCategoryIcon(n.category)}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {n.body}
                        </p>
                        <div className="flex items-center space-x-3 pt-1 text-[10px] text-slate-400">
                          <span>{formatRelativeTime(n.created_at)}</span>
                          {n.action_url && (
                            <Link
                              href={n.action_url}
                              onClick={() => {
                                markAsRead(n.id);
                                setIsOpen(false);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 font-medium"
                            >
                              <span>View</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={(e) => markAsRead(n.id, e)}
                        title="Mark as read"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
            <Link
              href="/resident/settings/notifications"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[11px]"
            >
              Preferences
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[11px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
