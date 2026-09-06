import React from "react";

export default function ResidentLoading() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />

      {/* Stats Summary Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800/60 p-4"
          />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
          <div className="h-56 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
        </div>
      </div>
    </div>
  );
}
