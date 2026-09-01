"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Society, SocietyMembership } from "@/lib/types/database";
import { Building2, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";

export type SwitcherItem = Society | (SocietyMembership & { society: Society });

export function SocietySwitcher({
  currentSocietyId,
  societies,
}: {
  currentSocietyId?: string | null;
  societies: SwitcherItem[];
}) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const normalizedSocieties: Society[] = (societies || []).map((item) => {
    if ("society" in item && item.society) {
      return item.society;
    }
    return item as Society;
  });

  if (!normalizedSocieties || normalizedSocieties.length <= 1) {
    const singleSociety = normalizedSocieties?.[0];
    if (!singleSociety) return null;

    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-800">
        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="truncate max-w-[200px]">{singleSociety.name}</span>
      </div>
    );
  }

  const handleSelectSociety = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSocietyId = e.target.value;
    if (!nextSocietyId || nextSocietyId === currentSocietyId) return;

    try {
      setIsSwitching(true);
      const res = await fetch("/api/auth/switch-society", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ societyId: nextSocietyId }),
      });

      if (res.ok) {
        window.location.href = `/society/${nextSocietyId}/dashboard`;
      } else {
        alert("Failed to switch society tenant context.");
        setIsSwitching(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error switching society.");
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Building2 className="w-4 h-4 text-indigo-600 absolute left-2.5 pointer-events-none" />
        <Select
          value={currentSocietyId || ""}
          onChange={handleSelectSociety}
          disabled={isSwitching}
          className="pl-8 pr-7 h-8 text-xs font-semibold bg-slate-100 border-none rounded-lg focus:ring-1 focus:ring-indigo-500"
        >
          {normalizedSocieties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </Select>
        {isSwitching && (
          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 text-slate-500 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

