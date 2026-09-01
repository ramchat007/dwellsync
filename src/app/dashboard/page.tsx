import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { resolveUserExperience } from "@/lib/auth/persona";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const { dashboardPath } = resolveUserExperience(identity);
  redirect(dashboardPath);
}
