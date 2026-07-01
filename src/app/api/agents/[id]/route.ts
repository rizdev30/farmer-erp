import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const roles = (session?.user as any)?.roles || ["L1_AGENT"];
  if (!session || (!(session.user as any)?.isSuperAdmin && !(session.user as any)?.roles?.includes("L4_ADMIN"))) {
    return Response.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  
  if (body.isSuperAdmin === true) {
    const superAdminCount = await prisma.user.count({
      where: { isSuperAdmin: true, active: true },
    });
    
    const currentUser = await prisma.user.findUnique({
      where: { id: id },
      select: { isSuperAdmin: true }
    });

    if (!currentUser?.isSuperAdmin && superAdminCount >= 3) {
      return Response.json({ error: "Maximum of 3 Super Admins allowed" }, { status: 400 });
    }
  }

  const updateData: any = {};
  if (body.active !== undefined) updateData.active = body.active;
  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.roles) updateData.roles = body.roles;
  if (body.isSuperAdmin !== undefined) updateData.isSuperAdmin = body.isSuperAdmin;
  if (body.assignedStates) updateData.assignedStates = body.assignedStates;
  if (body.assignedMandis) updateData.assignedMandis = body.assignedMandis;
  if (body.assignedL1Users) updateData.assignedL1Users = body.assignedL1Users;
  if (body.assignedL2Users) updateData.assignedL2Users = body.assignedL2Users;
  if (body.assignedL3Users) updateData.assignedL3Users = body.assignedL3Users;
  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      active: true,
    },
  });

  return Response.json(user);
}
