import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc", // slate-50 (Light Apple premium look)
};
import { Inter } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
