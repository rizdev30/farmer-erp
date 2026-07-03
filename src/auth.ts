import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { logAuditAction } from "@/lib/logger";
import { headers } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailStr = (credentials.email as string).trim();
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for") || "unknown IP";
        
        // 1. Check Rate Limit
        const rateLimit = await checkRateLimit(emailStr);
        if (!rateLimit.allowed) {
          await logAuditAction(null, "RATE_LIMIT_BLOCKED", `Email: ${emailStr} blocked due to too many attempts`, ip);
          throw new Error(`Account locked. Please try again in ${rateLimit.minutesLeft} minute(s).`);
        }

        const user = await prisma.user.findUnique({
          where: { email: emailStr },
        });

        if (!user || !user.active) {
          await recordFailedAttempt(emailStr);
          await logAuditAction(null, "FAILED_LOGIN", `Invalid login attempt for email: ${emailStr} (User not found)`, ip);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          await recordFailedAttempt(emailStr);
          await logAuditAction(user.id, "FAILED_LOGIN", `Invalid login attempt for email: ${emailStr} (Wrong password)`, ip);
          return null;
        }

        // 2. Clear rate limit on successful login
        await clearRateLimit(emailStr);
        await logAuditAction(user.id, "SUCCESSFUL_LOGIN", `User logged in successfully`, ip);

        const sessionId = crypto.randomUUID();
        const isHighLevel = user.roles.includes("L3_PO_MAKER") || user.roles.includes("L4_ADMIN") || user.isSuperAdmin;
        const maxSessions = isHighLevel ? 2 : 1;
        
        const currentSessions = user.activeSessions || [];
        const keepCount = Math.max(0, maxSessions - 1);
        const updatedSessions = keepCount > 0 
          ? [...currentSessions.slice(-keepCount), sessionId]
          : [sessionId];

        await prisma.user.update({
          where: { id: user.id },
          data: { activeSessions: updatedSessions }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          isSuperAdmin: user.isSuperAdmin,
          assignedStates: user.assignedStates,
          assignedMandis: user.assignedMandis,
          assignedL1Users: user.assignedL1Users,
          assignedL2Users: user.assignedL2Users,
          assignedL3Users: user.assignedL3Users,
          sessionId,
        };
      },
    }),
  ],
});
