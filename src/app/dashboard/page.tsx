import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentIdentity } from "@/lib/auth/server";
import { resolvePostLoginRouting } from "@/lib/auth/onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const preferredSocietyId = cookieStore.get("DwellSyncHub_active_society")?.value;

  const routing = resolvePostLoginRouting(identity, preferredSocietyId);

  if (routing.activeSocietyId && routing.activeSocietyId !== preferredSocietyId) {
    cookieStore.set("DwellSyncHub_active_society", routing.activeSocietyId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  } else if (routing.isUnlinked || routing.requiresSocietySelection) {
    cookieStore.delete("DwellSyncHub_active_society");
  }

  redirect(routing.destination);
}
