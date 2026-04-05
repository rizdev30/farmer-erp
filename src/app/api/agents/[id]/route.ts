import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};
  if (body.active !== undefined) updateData.active = body.active;
  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.role) updateData.role = body.role;
  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  return Response.json(user);
}
