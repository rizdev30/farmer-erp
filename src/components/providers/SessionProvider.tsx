"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import NetworkStatusMonitor from "@/components/NetworkStatus";

export default function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NextAuthSessionProvider>
      <ToastProvider>
        {children}
        <NetworkStatusMonitor />
      </ToastProvider>
    </NextAuthSessionProvider>
  );
}
