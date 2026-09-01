import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/client";
import { getCurrentIdentity } from "@/lib/auth/server";
import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";

export const metadata: Metadata = {
  title: "DwellSync — Housing Society Operating System",
  description: "Every Rupee. Every Task. Every Decision. Accountable.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getCurrentIdentity();

  return (
    <html lang="en" className="h-full">
      <body className="font-sans min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider initialIdentity={identity}>
          <ImpersonationBanner />
          <div className="flex-1 flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
