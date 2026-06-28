"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function generateFarmerCode(category: string = "FARMER"): Promise<string> {
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
 * Returns { userId, userName, roles }
 */
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return {
    userId: session.user.id,
    userName: session.user.name || "Unknown",
    roles: (session.user as any).roles || ["L1_AGENT"],
    isSuperAdmin: (session.user as any).isSuperAdmin || false,
    assignedStates: (session.user as any).assignedStates || [],
    assignedMandis: (session.user as any).assignedMandis || [],
    assignedL1Users: (session.user as any).assignedL1Users || [],
    assignedL2Users: (session.user as any).assignedL2Users || [],
    assignedL3Users: (session.user as any).assignedL3Users || [],
  };
}

export async function searchFarmers(query: string, categoryFilter?: string) {
  if (!query || query.length < 2) return [];

  const user = await getSessionUser();

  const whereF: any = {
    active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { farmerCode: { contains: query, mode: "insensitive" } },
      { village: { contains: query, mode: "insensitive" } },
    ],
  };

  const whereT: any = {
    active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { traderCode: { contains: query, mode: "insensitive" } },
      { village: { contains: query, mode: "insensitive" } },
    ],
  };

  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    if (user.assignedStates.includes("ALL") || user.assignedMandis.includes("ALL")) {
      // User has explicit ALL access, do not apply scope filters
    } else {
      const scope: any[] = [{ registeredBy: user.userId }];
      if (user.assignedStates.length > 0) scope.push({ state: { in: user.assignedStates } });
      if (user.assignedMandis.length > 0) scope.push({ town: { in: user.assignedMandis } });
      whereF.AND = [{ OR: scope }];
      whereT.AND = [{ OR: scope }];
    }
  }

  let farmers: any[] = [];
  let traders: any[] = [];

  if (!categoryFilter || categoryFilter === "FARMER") {
    farmers = await prisma.farmer.findMany({
      where: whereF,
      take: 20,
      orderBy: { name: "asc" },
    });
  }

  if (!categoryFilter || categoryFilter === "TRADER") {
    traders = await prisma.trader.findMany({
      where: whereT,
      take: 20,
      orderBy: { name: "asc" },
    });
  }

  const results = [
    ...farmers.map((f) => ({ ...f, category: f.category || "FARMER" })),
    ...traders.map((t) => ({ ...t, category: "TRADER", farmerCode: t.traderCode }))
  ].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);

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
    bankName: f.bankName,
    ifscCode: f.ifscCode,
    accountNumber: f.accountNumber,
    assignedL3Id: f.assignedL3Id || "",
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

  const whereF: Record<string, unknown> = { active: true };
  const whereT: Record<string, unknown> = { active: true };

  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    if (user.assignedStates.includes("ALL") || user.assignedMandis.includes("ALL")) {
      // User has explicit ALL access, do not apply scope filters
    } else {
      const scope: any[] = [{ registeredBy: user.userId }];
      if (user.assignedStates.length > 0) scope.push({ state: { in: user.assignedStates } });
      if (user.assignedMandis.length > 0) scope.push({ town: { in: user.assignedMandis } });
      whereF.AND = [{ OR: scope }];
      whereT.AND = [{ OR: scope }];
    }
  }

  if (filters?.district) {
    whereF.district = { contains: filters.district, mode: "insensitive" };
    whereT.district = { contains: filters.district, mode: "insensitive" };
  }
  if (filters?.block) {
    whereF.block = { contains: filters.block, mode: "insensitive" };
    whereT.block = { contains: filters.block, mode: "insensitive" };
  }
  if (filters?.village) {
    whereF.village = { contains: filters.village, mode: "insensitive" };
    whereT.village = { contains: filters.village, mode: "insensitive" };
  }

  const page = filters?.page || 0;
  const pageSize = 50;
  let farmers: any[] = [];
  let traders: any[] = [];

  if (!filters?.category || filters.category === "FARMER") {
    farmers = await prisma.farmer.findMany({
      where: whereF,
      orderBy: { name: "asc" },
      take: pageSize,
      skip: page * pageSize,
    });
  }

  if (!filters?.category || filters.category === "TRADER") {
    traders = await prisma.trader.findMany({
      where: whereT,
      orderBy: { name: "asc" },
      take: pageSize,
      skip: page * pageSize,
    });
  }

  const results = [
    ...farmers.map((f) => ({ ...f, category: f.category || "FARMER" })),
    ...traders.map((t) => ({ ...t, category: "TRADER", farmerCode: t.traderCode }))
  ].sort((a, b) => a.name.localeCompare(b.name)).slice(0, pageSize);

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
    bankName: f.bankName,
    ifscCode: f.ifscCode,
    accountNumber: f.accountNumber,
    assignedL3Id: f.assignedL3Id || "",
  }));
}

export async function getFarmerById(idParam: string | number) {
  const user = await getSessionUser();
  const idStr = String(idParam);
  const isTrader = idStr.startsWith("t");
  const parsedId = parseInt(idStr.replace(/^[ft]/, ""), 10);

  if (isTrader) {
    const t = await prisma.trader.findUniqueOrThrow({
      where: { id: parsedId },
    });

    if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
      if (!user.assignedStates.includes("ALL") && !user.assignedMandis.includes("ALL")) {
        const isRegisteredByMe = t.registeredBy === user.userId;
        const inAssignedState = user.assignedStates.includes(t.state);
        const inAssignedMandi = user.assignedMandis.includes(t.town);
        if (!isRegisteredByMe && !inAssignedState && !inAssignedMandi) {
          throw new Error("You are not authorized to view this trader's profile");
        }
      }
    }

    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      address: t.address,
      town: t.town,
      district: t.district,
      block: t.block,
      fatherName: t.fatherName,
      farmerCode: t.traderCode,
      village: t.village,
      registeredBy: t.registeredBy,
      registeredByName: t.registeredByName,
      createdByAdmin: false,
      category: "TRADER",
      gender: t.gender,
      pinCode: t.pinCode,
      projectName: t.projectName,
      state: t.state,
      panGst: t.panGst,
      company: t.company,
      promoterName: t.promoterName,
      bankName: t.bankName,
      ifscCode: t.ifscCode,
      accountNumber: t.accountNumber,
      createdAt: t.createdAt.toISOString(),
      assignedL3Id: "",
    };
  }

  const f = await prisma.farmer.findUniqueOrThrow({
    where: { id: parsedId },
  });

  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    if (!user.assignedStates.includes("ALL") && !user.assignedMandis.includes("ALL")) {
      const isRegisteredByMe = f.registeredBy === user.userId;
      const inAssignedState = user.assignedStates.includes(f.state);
      const inAssignedMandi = user.assignedMandis.includes(f.town);
      if (!isRegisteredByMe && !inAssignedState && !inAssignedMandi) {
        throw new Error("You are not authorized to view this farmer's profile");
      }
    }
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
    bankName: f.bankName,
    ifscCode: f.ifscCode,
    accountNumber: f.accountNumber,
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
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
  farmerCode?: string; // Optional: If not provided, we generate it
  agentId?: string; // Admin can assign to a specific agent
  assignedL3Id?: string; // Admin can assign to L3
}) {
  let user;
  try {
    user = await getSessionUser();
  } catch (e) {
    return { success: false, error: "Not authenticated" };
  }

  // Role authorization check (only L1 agents can register farmers)
  if (!user.roles.includes("L1_AGENT")) {
    return { success: false, error: "Only L1 agents are authorized to register farmers" };
  }

  // Input Validation
  if (!data.name || typeof data.name !== "string" || !data.name.trim() || data.name.length > 100) {
    return { success: false, error: "Invalid name (must be 1-100 characters)" };
  }
  if (!data.phone || typeof data.phone !== "string" || !/^\+?[0-9]{10,15}$/.test(data.phone.trim())) {
    return { success: false, error: "Invalid phone number (must be 10-15 digits)" };
  }
  if (!data.address || typeof data.address !== "string" || !data.address.trim() || data.address.length > 500) {
    return { success: false, error: "Invalid address (must be 1-500 characters)" };
  }
  if (!data.district || typeof data.district !== "string" || !data.district.trim() || data.district.length > 100) {
    return { success: false, error: "Invalid district (must be 1-100 characters)" };
  }
  if (!data.block || typeof data.block !== "string" || !data.block.trim() || data.block.length > 100) {
    return { success: false, error: "Invalid block (must be 1-100 characters)" };
  }
  if (!data.village || typeof data.village !== "string" || !data.village.trim() || data.village.length > 100) {
    return { success: false, error: "Invalid village (must be 1-100 characters)" };
  }
  if (!data.fatherName || typeof data.fatherName !== "string" || !data.fatherName.trim() || data.fatherName.length > 100) {
    return { success: false, error: "Invalid father's name (must be 1-100 characters)" };
  }

  // Optional string fields length limits to prevent buffer/DB size attack
  if (data.town && data.town.length > 100) return { success: false, error: "Town is too long" };
  if (data.state && data.state.length > 100) return { success: false, error: "State is too long" };
  if (data.gender && data.gender.length > 20) return { success: false, error: "Gender is too long" };
  if (data.pinCode && data.pinCode.length > 10) return { success: false, error: "Pin code is too long" };
  if (data.projectName && data.projectName.length > 100) return { success: false, error: "Project name is too long" };
  if (data.panGst && data.panGst.length > 30) return { success: false, error: "PAN/GST is too long" };
  if (data.company && data.company.length > 100) return { success: false, error: "Company name is too long" };
  if (data.promoterName && data.promoterName.length > 100) return { success: false, error: "Promoter name is too long" };
  if (data.bankName && data.bankName.length > 100) return { success: false, error: "Bank name is too long" };
  if (data.ifscCode && data.ifscCode.length > 20) return { success: false, error: "IFSC code is too long" };
  if (data.accountNumber && data.accountNumber.length > 30) return { success: false, error: "Account number is too long" };

  try {
    const isAdmin = user.roles.includes("L4_ADMIN") || user.isSuperAdmin;
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
        name: data.name.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        town: (data.town || data.village).trim(),
        district: data.district.trim(),
        block: data.block.trim(),
        fatherName: data.fatherName.trim(),
        farmerCode: code,
        village: data.village.trim(),
        gender: data.gender || "",
        pinCode: data.pinCode || "",
        projectName: data.projectName || "",
        category: data.category || "FARMER",
        state: data.state || "",
        panGst: data.panGst || "",
        company: data.company || "",
        promoterName: data.promoterName || "",
        bankName: data.bankName || "",
        ifscCode: data.ifscCode || "",
        accountNumber: data.accountNumber || "",
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
        bankName: farmer.bankName,
        ifscCode: farmer.ifscCode,
        accountNumber: farmer.accountNumber,
        assignedL3Id: farmer.assignedL3Id,
      },
    };
  } catch (error: any) {
    console.error("Failed to register farmer:", error);
    return { success: false, error: error.message || "Failed to register farmer" };
  }
}
