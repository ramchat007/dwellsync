"use client";

import React, { useState } from "react";
import { Building2, Loader2, ExternalLink } from "lucide-react";
import { ManagementCompanySociety } from "@/lib/types/company";
import { Select } from "@/components/ui/select";

export function CompanySocietySwitcher({
  societies,
  companyId,
}: {
  societies: ManagementCompanySociety[];
  companyId: string;
}) {
  const [isSwitching, setIsSwitching] = useState(false);

  const activeSocieties = (societies || []).filter(
    (s) => s.status === "ACTIVE" && s.society
  );

  if (activeSocieties.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic px-2 py-1">
        No accessible societies assigned
      </div>
    );
  }

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSocietyId = e.target.value;
    if (!nextSocietyId) return;

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
        alert("Failed to establish tenant context for target society.");
        setIsSwitching(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to target society.");
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        {isSwitching ? (
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute left-2.5 pointer-events-none" />
        ) : (
          <Building2 className="w-4 h-4 text-indigo-600 absolute left-2.5 pointer-events-none" />
        )}
        <Select
          defaultValue=""
          onChange={handleSelect}
          disabled={isSwitching}
          className="pl-8 pr-7 h-8 text-xs font-semibold bg-slate-100 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
        >
          <option value="" disabled>
            Switch to Managed Society...
          </option>
          {activeSocieties.map((s) => (
            <option key={s.society_id} value={s.society_id}>
              {s.society?.name} ({s.society?.code})
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

