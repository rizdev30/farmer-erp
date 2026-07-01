import type { NextAuthConfig } from "next-auth";
import prisma from "@/lib/prisma";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionId = (user as any).sessionId;
        token.roles = user.roles || [];
        token.isSuperAdmin = user.isSuperAdmin || false;
        token.assignedStates = user.assignedStates || [];
        token.assignedMandis = user.assignedMandis || [];
        token.assignedL1Users = user.assignedL1Users || [];
        token.assignedL2Users = user.assignedL2Users || [];
        token.assignedL3Users = user.assignedL3Users || [];
      } else if (token.id && token.sessionId) {
        // Validate session hasn't been replaced by a new device login
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { activeSessions: true }
          });
          
          if (!dbUser || !dbUser.activeSessions.includes(token.sessionId as string)) {
            // This session was invalidated, return empty token to force logout
            return {} as any;
          }
        } catch (err) {
          console.error("Session validation error:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || [];
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) || false;
        session.user.assignedStates = (token.assignedStates as string[]) || [];
        session.user.assignedMandis = (token.assignedMandis as string[]) || [];
        session.user.assignedL1Users = (token.assignedL1Users as string[]) || [];
        session.user.assignedL2Users = (token.assignedL2Users as string[]) || [];
        session.user.assignedL3Users = (token.assignedL3Users as string[]) || [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
