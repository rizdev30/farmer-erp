import type { Metadata } from "next";
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
