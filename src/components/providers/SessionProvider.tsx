"use client";

import { SessionProvider as NextAuthSessionProvider, useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "@/components/Toast";
import NetworkStatusMonitor from "@/components/NetworkStatus";

// ─── Session Guard ───────────────────────────────────────────────
// Monitors session in real-time across ALL pages. If the session
// becomes unauthenticated (expired, invalidated, logged out from
// another device), the user is immediately redirected to /login.
// This runs at the ROOT level so every dashboard page is protected.
function SessionGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Public routes that don't need session protection
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth");

  const forceLogout = useCallback(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    // Use signOut to properly clear client-side session cookies
    signOut({ callbackUrl: "/login", redirect: true });
  }, []);

  useEffect(() => {
    if (isPublicRoute) {
      hasRedirected.current = false;
      return;
    }

    // If session check completed and user is NOT authenticated → force redirect
    if (status === "unauthenticated") {
      forceLogout();
      return;
    }

    // If session exists but user data is missing (empty JWT from invalidated session)
    // This catches the case where auth.config.ts returns {} for invalidated sessions
    if (status === "authenticated" && session && !session.user?.name && !session.user?.email) {
      forceLogout();
      return;
    }
  }, [status, session, isPublicRoute, forceLogout]);

  // Reset redirect flag when pathname changes to a public route
  useEffect(() => {
    if (isPublicRoute) {
      hasRedirected.current = false;
    }
  }, [isPublicRoute]);

  return <>{children}</>;
}

// ─── Session Provider ────────────────────────────────────────────
// Wraps the app with NextAuth session polling (every 60 seconds)
// and refetch on window focus. This ensures the client always has
// an up-to-date view of whether the session is still valid.
export default function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NextAuthSessionProvider
      refetchInterval={60}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <ToastProvider>
        <SessionGuard>
          {children}
          <NetworkStatusMonitor />
        </SessionGuard>
      </ToastProvider>
    </NextAuthSessionProvider>
  );
}
