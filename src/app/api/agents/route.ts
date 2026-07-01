import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  const roles = (session?.user as any)?.roles || ["L1_AGENT"];
  if (!session || (!(session.user as any)?.isSuperAdmin && !(session.user as any)?.roles?.includes("L4_ADMIN"))) {
    return Response.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: (session.user as any).id },
    },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      isSuperAdmin: true,
      assignedStates: true,
      assignedMandis: true,
      assignedL1Users: true,
      assignedL2Users: true,
      assignedL3Users: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  const rolesSession = (session?.user as any)?.roles || ["L1_AGENT"];
  if (!session || (!(session.user as any)?.isSuperAdmin && !(session.user as any)?.roles?.includes("L4_ADMIN"))) {
    return Response.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, roles, isSuperAdmin, assignedStates, assignedMandis, assignedL1Users, assignedL2Users, assignedL3Users } = body;

  if (!name || !email || !password) {
    return Response.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  if (isSuperAdmin === true) {
    const superAdminCount = await prisma.user.count({
      where: { isSuperAdmin: true, active: true },
    });
    if (superAdminCount >= 3) {
      return Response.json({ error: "Maximum of 3 Super Admins allowed" }, { status: 400 });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      roles: roles || ["L1_AGENT"],
      isSuperAdmin: isSuperAdmin || false,
      assignedStates: assignedStates || [],
      assignedMandis: assignedMandis || [],
      assignedL1Users: assignedL1Users || [],
      assignedL2Users: assignedL2Users || [],
      assignedL3Users: assignedL3Users || [],
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      active: true,
    },
  });

  return Response.json(user, { status: 201 });
}
