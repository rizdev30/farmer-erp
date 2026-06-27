"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

async function generateFarmerCode(category: string = "FARMER"): Promise<string> {
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
  
  const prefix = category === "TRADER" ? "T" : "F";
  return `${prefix}${yearStr}${monthStr}${weekStr}${nnnStr}`;
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
    role: (session.user as { role?: string }).role || "L1_AGENT",
  };
}

export async function searchFarmers(query: string, categoryFilter?: string) {
  if (!query || query.length < 2) return [];

  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";

  // Build where clause
  const where: Record<string, unknown> = {
    active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { farmerCode: { contains: query, mode: "insensitive" } },
      { village: { contains: query, mode: "insensitive" } },
    ],
  };

  if (user.role === "L1_AGENT") {
    where.registeredBy = user.userId;
  }

  if (categoryFilter) {
    where.category = categoryFilter;
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
    category: f.category,
    gender: f.gender,
    pinCode: f.pinCode,
    projectName: f.projectName,
    state: f.state,
    panGst: f.panGst,
    company: f.company,
    promoterName: f.promoterName,
    assignedL3Id: (f as any).assignedL3Id,
  }));
}

export async function getFarmers(filters?: {
  district?: string;
  block?: string;
  village?: string;
  category?: string;
  page?: number;
}) {
  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";

  const where: Record<string, unknown> = { active: true };

  if (user.role === "L1_AGENT") {
    where.registeredBy = user.userId;
  }

  if (filters?.district) {
    where.district = { contains: filters.district, mode: "insensitive" };
  }
  if (filters?.block) {
    where.block = { contains: filters.block, mode: "insensitive" };
  }
  if (filters?.village) {
    where.village = { contains: filters.village, mode: "insensitive" };
  }
  if (filters?.category) {
    where.category = filters.category;
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
    category: f.category,
    gender: f.gender,
    pinCode: f.pinCode,
    projectName: f.projectName,
    state: f.state,
    panGst: f.panGst,
    company: f.company,
    promoterName: f.promoterName,
    assignedL3Id: (f as any).assignedL3Id,
  }));
}

export async function getFarmerById(id: number) {
  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";

  const f = await prisma.farmer.findUniqueOrThrow({
    where: { id },
  });

  if (user.role === "L1_AGENT" && f.registeredBy !== user.userId) {
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
    category: f.category,
    gender: f.gender,
    pinCode: f.pinCode,
    projectName: f.projectName,
    state: f.state,
    panGst: f.panGst,
    company: f.company,
    promoterName: f.promoterName,
    createdAt: f.createdAt.toISOString(),
    assignedL3Id: f.assignedL3Id,
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
  gender?: string;
  pinCode?: string;
  projectName?: string;
  category?: string;
  state?: string;
  panGst?: string;
  company?: string;
  promoterName?: string;
  farmerCode?: string; // Optional: If not provided, we generate it
  agentId?: string; // Admin can assign to a specific agent
  assignedL3Id?: string; // Admin can assign to L3
}) {
  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";
  const code = data.farmerCode || (await generateFarmerCode(data.category));

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
      gender: data.gender || "",
      pinCode: data.pinCode || "",
      projectName: data.projectName || "",
      category: data.category || "FARMER",
      state: data.state || "",
      panGst: data.panGst || "",
      company: data.company || "",
      promoterName: data.promoterName || "",
      registeredBy: registeredById,
      registeredByName: registeredByName,
      assignedL3Id: data.assignedL3Id || "",
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
      category: farmer.category,
      gender: farmer.gender,
      pinCode: farmer.pinCode,
      projectName: farmer.projectName,
      state: farmer.state,
      panGst: farmer.panGst,
      company: farmer.company,
      promoterName: farmer.promoterName,
      assignedL3Id: farmer.assignedL3Id,
    },
  };
}
