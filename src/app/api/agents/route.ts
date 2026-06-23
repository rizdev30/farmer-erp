import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "L4_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "L4_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

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

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || "L1_AGENT",
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  return Response.json(user, { status: 201 });
}
