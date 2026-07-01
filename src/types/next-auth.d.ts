import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    roles?: string[];
    isSuperAdmin?: boolean;
    assignedStates?: string[];
    assignedMandis?: string[];
    assignedL1Users?: string[];
    assignedL2Users?: string[];
    assignedL3Users?: string[];
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roles: string[];
      isSuperAdmin: boolean;
      assignedStates: string[];
      assignedMandis: string[];
      assignedL1Users: string[];
      assignedL2Users: string[];
      assignedL3Users: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    isSuperAdmin: boolean;
    assignedStates: string[];
    assignedMandis: string[];
    assignedL1Users: string[];
    assignedL2Users: string[];
    assignedL3Users: string[];
  }
}
