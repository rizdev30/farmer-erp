import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";

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
        const user = await prisma.user.findUnique({
          where: { email: emailStr },
        });

        if (!user || !user.active) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

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
