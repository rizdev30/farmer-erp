"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

async function generateFarmerCode(): Promise<string> {
  const now = new Date();
  
  // YY: Year
  const yearStr = now.getFullYear().toString().slice(-2);
  
  // MM: Month
  const monthStr = (now.getMonth() + 1).toString().padStart(2, "0");
  
  // W: Week of month (1 to 5)
  const weekNum = Math.ceil(now.getDate() / 7);
  const weekStr = weekNum.toString();
  
  // NNN: sequence from DB
  const monthKey = `${yearStr}${monthStr}`;
  
  const seq = await prisma.farmerSequence.upsert({
    where: { monthKey },
    create: { monthKey, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });

  const nnnStr = seq.lastSeq.toString().padStart(3, "0");
  
  return `${yearStr}${monthStr}${weekStr}${nnnStr}`;
}

/**
 * Get current session user info for agent-scoping.
 * Returns { userId, userName, role }
 */
async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return {
    userId: session.user.id,
    userName: session.user.name || "Unknown",
    role: (session.user as { role?: string }).role || "AGENT",
  };
}

export async function searchFarmers(query: string) {
  if (!query || query.length < 2) return [];

  const user = await getSessionUser();
  const isAdmin = user.role === "ADMIN";

  // Build where clause — agents only see their own farmers
  const where: Record<string, unknown> = {
    active: true,
    OR: [
      { name: { contains: query } },
      { phone: { contains: query } },
      { farmerCode: { contains: query } },
      { village: { contains: query } },
    ],
  };

  if (!isAdmin) {
    where.registeredBy = user.userId;
  }

  const results = await prisma.farmer.findMany({
    where,
    take: 20,
    orderBy: { name: "asc" },
  });

  return results.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone,
    address: f.address,
    town: f.town,
    district: f.district,
    block: f.block,
    fatherName: f.fatherName,
    farmerCode: f.farmerCode,
    village: f.village,
    registeredByName: f.registeredByName,
  }));
}

export async function getFarmers(filters?: {
  district?: string;
  block?: string;
  page?: number;
}) {
  const user = await getSessionUser();
  const isAdmin = user.role === "ADMIN";

  const where: Record<string, unknown> = { active: true };

  // Agents can only see their own farmers
  if (!isAdmin) {
    where.registeredBy = user.userId;
  }

  if (filters?.district) {
    where.district = { contains: filters.district };
  }
  if (filters?.block) {
    where.block = { contains: filters.block };
  }

  const page = filters?.page || 0;
  const pageSize = 50;

  const results = await prisma.farmer.findMany({
    where,
    orderBy: { name: "asc" },
    take: pageSize,
    skip: page * pageSize,
  });

  return results.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone,
    address: f.address,
    town: f.town,
    district: f.district,
    block: f.block,
    fatherName: f.fatherName,
    farmerCode: f.farmerCode,
    village: f.village,
    registeredByName: f.registeredByName,
  }));
}

export async function getFarmerById(id: number) {
  const user = await getSessionUser();
  const isAdmin = user.role === "ADMIN";

  const f = await prisma.farmer.findUniqueOrThrow({
    where: { id },
  });

  if (!isAdmin && f.registeredBy !== user.userId) {
    throw new Error("You are not authorized to view this farmer's profile");
  }

  return {
    id: f.id,
    name: f.name,
    phone: f.phone,
    address: f.address,
    town: f.town,
    district: f.district,
    block: f.block,
    fatherName: f.fatherName,
    farmerCode: f.farmerCode,
    village: f.village,
    registeredBy: f.registeredBy,
    registeredByName: f.registeredByName,
    createdByAdmin: f.createdByAdmin,
    createdAt: f.createdAt.toISOString(),
  };
}

export async function registerFarmer(data: {
  name: string;
  phone: string;
  address: string;
  town?: string;
  district: string;
  block: string;
  fatherName: string;
  village: string;
  farmerCode?: string; // Optional: If not provided, we generate it
  agentId?: string; // Admin can assign to a specific agent
}) {
  const user = await getSessionUser();
  const isAdmin = user.role === "ADMIN";
  const code = data.farmerCode || (await generateFarmerCode());

  let registeredById = user.userId;
  let registeredByName = user.userName;
  let createdByAdmin = false;

  if (isAdmin && data.agentId && data.agentId !== user.userId) {
    // Admin is assigning to another agent
    const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
    if (agent) {
      registeredById = agent.id;
      registeredByName = agent.name;
      createdByAdmin = true;
    }
  }

  const farmer = await prisma.farmer.create({
    data: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      town: data.town || data.village,
      district: data.district,
      block: data.block,
      fatherName: data.fatherName,
      farmerCode: code,
      village: data.village,
      registeredBy: registeredById,
      registeredByName: registeredByName,
      createdByAdmin,
    },
  });

  return {
    success: true,
    id: farmer.id,
    farmer: {
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      address: farmer.address,
      town: farmer.town,
      district: farmer.district,
      block: farmer.block,
      fatherName: farmer.fatherName,
      farmerCode: farmer.farmerCode,
      village: farmer.village,
      registeredByName: farmer.registeredByName,
    },
  };
}
