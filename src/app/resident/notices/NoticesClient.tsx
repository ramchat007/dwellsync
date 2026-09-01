"use client";

import React, { useState } from "react";
import {
  Bell,
  AlertTriangle,
  Flame,
  Calendar,
  Tag,
  Paperclip,
  Clock,
  Search,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Notice, Society } from "@/lib/types/database";

interface NoticesClientProps {
  initialNotices: (Notice & {
    publisher?: { full_name: string; display_name: string };
  })[];
  society: Society | null;
}

export function NoticesClient({
  initialNotices,
  society,
}: NoticesClientProps) {
  const [notices] = useState(initialNotices);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "ALL", label: "All Notices" },
    { id: "MAINTENANCE", label: "Maintenance" },
    { id: "URGENT", label: "Urgent" },
    { id: "BILLING", label: "Billing & Dues" },
    { id: "EVENT", label: "Community Events" },
    { id: "GENERAL", label: "General" },
  ];

  const filteredNotices = notices.filter((n) => {
    const matchesCategory = selectedCategory === "ALL" || n.category === selectedCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
            <Flame className="w-3 h-3" />
            Emergency
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="w-3 h-3" />
            High Priority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Notice
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Society Notices & Circulars
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official announcements published by the management committee of {society?.name || "your society"}.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search circulars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Notices Feed */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Notices Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== "ALL"
              ? "No notices matched your selected filter or search query."
              : "No notices have been published yet by your management committee."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((n) => {
            const dateStr = new Date(n.published_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const publisherName = n.publisher?.display_name || n.publisher?.full_name || "Hon. Secretary";

            return (
              <article
                key={n.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 transition space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(n.priority)}
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {n.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {n.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {n.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Published by: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{publisherName}</strong></span>
                  {n.attachment_url && (
                    <a
                      href={n.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      View Attachment
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

