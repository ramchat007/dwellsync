import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  if (identity.isSuperAdmin) {
    redirect("/superadmin");
  }

  if (identity.currentSociety) {
    redirect(`/society/${identity.currentSociety.id}/dashboard`);
  }

  if (identity.availableSocieties && identity.availableSocieties.length > 0) {
    redirect(`/society/${identity.availableSocieties[0].society_id}/dashboard`);
  }

  redirect("/unauthorized");
}

