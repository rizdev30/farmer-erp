import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);
import type { NextRequest } from "next/server";

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
    const role = (session.user as { role?: string })?.role;
    if (role !== "L4_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
