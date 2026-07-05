import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#059669", // forest-600 (Solid smooth green)
};
import SessionProvider from "@/components/providers/SessionProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farmer ERP — Premium Procurement Management",
  description:
    "A premium ERP system for managing farmer procurement, inventory tracking, and digital receipts.",
  manifest: "/site.webmanifest?v3",
  appleWebApp: {
    title: "Farmer ERP",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-slate-50 antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
