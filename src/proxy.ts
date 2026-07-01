import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);
import type { NextRequest } from "next/server";

// In Next.js 16, the middleware file is renamed to proxy.ts
// and the export is renamed from `middleware` to `proxy`.
export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/dashboard/agents")) {
    const roles = (session.user as any)?.roles || [];
    if (!roles.includes("L4_ADMIN") && !(session.user as any)?.isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

// Export as `proxy` alias (Next.js 16 convention)
export { auth as proxy };

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
