import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import type { Metadata } from "next";
import { syncCurrentUserEmail } from "@/lib/sync-user";

export const metadata: Metadata = {
  title: "Next.js Premium Startup Boilerplate",
  description:
    "Created using the ultimate interactive Next.js stack generator CLI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fire-and-forget: sync user email without blocking render
  syncCurrentUserEmail().catch((err) =>
    console.error("[RootLayout] Failed to sync user email:", err),
  );

  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
