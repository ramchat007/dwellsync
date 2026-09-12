import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { DataImportClient } from "./DataImportClient";

const ALLOWED_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export const dynamic = "force-dynamic";

export default async function SocietyDataImportPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  const isAllowed =
    identity.isSuperAdmin ||
    (identity.currentRole && ALLOWED_ROLES.includes(identity.currentRole));

  if (!isAllowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Data Migration & Society Import
        </h1>
        <p className="text-sm text-slate-500">
          Import society units, resident profiles, ownership records, and building layout from CSV or XLSX spreadsheets safely with zero external costs.
        </p>
      </div>

      <DataImportClient
        societyId={societyId}
        societyName={society.name}
        userRole={identity.currentRole || "RESIDENT"}
      />
    </div>
  );
}

