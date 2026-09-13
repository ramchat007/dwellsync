import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/client";
import { LanguageProvider } from "@/lib/i18n/context";
import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";

import { getCurrentIdentity } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "DwellSyncHub — Housing Society Operating System",
  description: "Every Rupee. Every Task. Every Decision. Accountable.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialIdentity = await getCurrentIdentity();

  return (
    <html lang="en" className="h-full">
      <body className="font-sans min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider initialIdentity={initialIdentity}>
          <LanguageProvider>
            {/* <ImpersonationBanner /> */}
            <div className="flex-1 flex flex-col">{children}</div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
