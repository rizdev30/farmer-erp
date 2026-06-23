"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

function generateSlipId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FE-${date}-${rand}`;
}

function roundQuintal(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Get current session user info for agent-scoping.
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

export interface ProcurementData {
  farmerId: number;
  farmerName: string;
  fatherName?: string;
  farmerCode?: string;
  village?: string;
  crop: string;
  variety: string;
  bags: number;
  packingSize: number;
  grossQuantity: number; // in Quintals (Weight Qtl.)
  deduction: number; // Deduction Qtl./Bag
  rate: number; // RATE PER QUINTAL
  bones: number;
  adtiyaName?: string;
  lotNo?: string;
  agentId?: string; // Admin can assign to a specific agent
}

export interface ProcurementReceipt {
  success: boolean;
  slipId: string;
  invoiceId: number;
  timestamp: string;
  farmerName: string;
  fatherName?: string;
  farmerCode?: string;
  village?: string;
  crop: string;
  variety: string;
  bags: number;
  packingSize: number;
  grossQuantity: number;
  deduction: number;
  netQuantity: number;
  rate: number;
  bones: number;
  adtiyaName?: string;
  lotNo?: string;
  total: number;
  agentName?: string;
}

export async function createProcurement(
  data: ProcurementData
): Promise<ProcurementReceipt> {
  const user = await getSessionUser();

  let procurementAgentId = user.userId;
  let procurementAgentName = user.userName;
  let createdByAdmin = false;

  if (user.role === "L3_PO_MAKER" || user.role === "L4_ADMIN") {
    throw new Error("PO Makers and Admins cannot create procurements");
  }

  if (user.role === "L4_ADMIN" && data.agentId && data.agentId !== user.userId) {
    const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
    if (agent) {
      procurementAgentId = agent.id;
      procurementAgentName = agent.name;
      createdByAdmin = true;
    }
  }

  // Verify the farmer belongs to this agent (if not admin)
  if (user.role !== "L4_ADMIN" && user.role !== "L2_APPROVAL") {
    const farmer = await prisma.farmer.findUnique({
      where: { id: data.farmerId },
      select: { registeredBy: true },
    });
    if (!farmer || farmer.registeredBy !== user.userId) {
      throw new Error("You can only procure from farmers you registered");
    }
  }

  const grossQuantity = roundQuintal(data.grossQuantity);
  const deduction = roundQuintal(data.deduction || 0);
  const totalDeduction = roundQuintal(deduction * data.bags);
  const netQuantity = roundQuintal(grossQuantity - totalDeduction);
  const rate = roundQuintal(data.rate);
  const total = roundQuintal(netQuantity * rate);
  const slipId = generateSlipId();

  // Create procurement record in local DB
  const procurement = await prisma.procurement.create({
    data: {
      slipId,
      farmerId: data.farmerId,
      farmerName: data.farmerName,
      fatherName: data.fatherName || "",
      farmerCode: data.farmerCode || "",
      village: data.village || "",
      crop: data.crop,
      variety: data.variety,
      bags: data.bags,
      packingSize: data.packingSize,
      grossQuantity,
      deduction,
      netQuantity,
      rate,
      bones: data.bones,
      adtiyaName: data.adtiyaName || "",
      lotNo: data.lotNo || "",
      total,
      agentId: procurementAgentId,
      agentName: procurementAgentName,
      status: "PENDING_L2",
      createdByAdmin,
      validated: true,
    },
  });

  return {
    success: true,
    slipId,
    invoiceId: procurement.id,
    timestamp: procurement.createdAt.toISOString(),
    farmerName: data.farmerName,
    fatherName: data.fatherName,
    farmerCode: data.farmerCode,
    village: data.village,
    agentName: user.userName,
    crop: data.crop,
    variety: data.variety,
    bags: data.bags,
    packingSize: data.packingSize,
    grossQuantity,
    deduction,
    netQuantity,
    rate,
    bones: data.bones,
    adtiyaName: data.adtiyaName,
    lotNo: data.lotNo,
    total,
  };
}

/**
 * Get procurement history.
 * - Agents: only their own procurements
 * - Admins: all procurements (can filter by agentId)
 * - Supports monthly filtering via year/month params
 */
export async function getProcurementHistory(filters?: {
  year?: number;
  month?: number;
  agentId?: string;
  status?: string;
}) {
  const user = await getSessionUser();

  const where: Record<string, unknown> = {};

  if (user.role === "L3_PO_MAKER") {
    if (filters?.status) {
      if (filters.status === "PENDING") {
        where.status = "PENDING_L3";
      } else if (filters.status === "REJECTED") {
        where.status = "REJECTED_L3";
      } else {
        where.status = filters.status;
      }
    } else {
      where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
    }
  } else {
    if (filters?.status) {
      if (filters.status === "PENDING") {
        where.status = { in: ["PENDING_L2", "PENDING_L3"] };
      } else if (filters.status === "REJECTED") {
        where.status = { in: ["REJECTED_L2", "REJECTED_L3"] };
      } else {
        where.status = filters.status;
      }
    }

    if (user.role === "L1_AGENT") {
      where.agentId = user.userId;
    } else if (user.role === "L2_APPROVAL") {
      // Level 2 can see their own, pending L2, or records they approved
      where.OR = [
        { agentId: user.userId },
        { status: "PENDING_L2" },
        { l2ApprovedBy: user.userId }
      ];
    } else if (user.role === "L4_ADMIN") {
      if (filters?.agentId) {
        where.agentId = filters.agentId;
      }
    }
  }

  // Monthly filter
  if (filters?.year && filters?.month) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  const procurements = await prisma.procurement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      farmer: {
        select: { name: true, farmerCode: true, village: true, registeredByName: true },
      },
    },
  });

  const userIds = new Set<string>();
  procurements.forEach((p) => {
    if (p.l2ApprovedBy) userIds.add(p.l2ApprovedBy);
    if (p.l3ApprovedBy) userIds.add(p.l3ApprovedBy);
  });

  const userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true },
    });
    users.forEach((u) => userMap.set(u.id, u.name));
  }

  return procurements.map((p) => ({
    id: p.id,
    slipId: p.slipId,
    farmerId: p.farmerId,
    farmerName: p.farmerName,
    fatherName: p.fatherName,
    farmerCode: p.farmerCode,
    village: p.village,
    crop: p.crop,
    variety: p.variety,
    bags: p.bags,
    packingSize: p.packingSize,
    grossQuantity: p.grossQuantity,
    deduction: p.deduction,
    netQuantity: p.netQuantity,
    rate: p.rate,
    bones: p.bones,
    adtiyaName: p.adtiyaName,
    lotNo: p.lotNo,
    total: p.total,
    agentId: p.agentId,
    agentName: p.agentName,
    status: p.status,
    l2ApproverName: p.l2ApprovedBy ? userMap.get(p.l2ApprovedBy) : null,
    l3ApproverName: p.l3ApprovedBy ? userMap.get(p.l3ApprovedBy) : null,
    createdByAdmin: p.createdByAdmin,
    validated: p.validated,
    createdAt: p.createdAt.toISOString(),
  }));
}

/**
 * Get full details of a specific procurement record by Slip ID.
 */
export async function getProcurementBySlipId(slipId: string) {
  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";

  const procurement = await prisma.procurement.findUniqueOrThrow({
    where: { slipId },
    include: {
      farmer: true,
    },
  });

  if (user.role === "L1_AGENT" && procurement.agentId !== user.userId) {
    throw new Error("You are not authorized to view this record.");
  } else if (user.role === "L2_APPROVAL") {
    if (procurement.agentId !== user.userId && procurement.status !== "PENDING_L2" && procurement.l2ApprovedBy !== user.userId) {
      throw new Error("You are not authorized to view this record.");
    }
  } else if (user.role === "L3_PO_MAKER") {
    if (!["PENDING_L3", "APPROVED", "REJECTED_L3"].includes(procurement.status)) {
      throw new Error("You are not authorized to view this record.");
    }
  }

  const agent = await prisma.user.findUnique({
    where: { id: procurement.agentId },
    select: { email: true, name: true },
  });

  let l2ApproverName = null;
  if (procurement.l2ApprovedBy) {
    const l2User = await prisma.user.findUnique({
      where: { id: procurement.l2ApprovedBy },
      select: { name: true },
    });
    if (l2User) l2ApproverName = l2User.name;
  }

  let l3ApproverName = null;
  if (procurement.l3ApprovedBy) {
    const l3User = await prisma.user.findUnique({
      where: { id: procurement.l3ApprovedBy },
      select: { name: true },
    });
    if (l3User) l3ApproverName = l3User.name;
  }

  return {
    ...procurement,
    farmer: {
      ...procurement.farmer,
    },
    agentDetails: agent,
    l2ApproverName,
    l3ApproverName,
  };
}

/**
 * Get monthly summary for cross-verification.
 * Groups procurement data by month with totals.
 */
export async function getMonthlySummary(filters?: { agentId?: string }) {
  const user = await getSessionUser();

  const where: Record<string, unknown> = {};

  if (user.role === "L1_AGENT") {
    where.agentId = user.userId;
  } else if (user.role === "L2_APPROVAL") {
    where.OR = [
      { agentId: user.userId },
      { status: "PENDING_L2" },
      { l2ApprovedBy: user.userId }
    ];
  } else if (user.role === "L3_PO_MAKER") {
    where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
  } else if (user.role === "L4_ADMIN") {
    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }
  }

  const procurements = await prisma.procurement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      netQuantity: true,
      total: true,
      createdAt: true,
      agentName: true,
      agentId: true,
    },
  });

  // Group by month
  const monthMap = new Map<
    string,
    {
      monthKey: string;
      label: string;
      totalTransactions: number;
      totalQuantity: number;
      totalPayout: number;
      agents: Set<string>;
    }
  >();

  for (const p of procurements) {
    const d = new Date(p.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
    });

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        label,
        totalTransactions: 0,
        totalQuantity: 0,
        totalPayout: 0,
        agents: new Set(),
      });
    }

    const entry = monthMap.get(monthKey)!;
    entry.totalTransactions += 1;
    entry.totalQuantity += p.netQuantity;
    entry.totalPayout += p.total;
    if (p.agentName) entry.agents.add(p.agentName);
  }

  return Array.from(monthMap.values()).map((m) => ({
    ...m,
    totalQuantity: Math.round(m.totalQuantity * 100) / 100,
    totalPayout: Math.round(m.totalPayout * 100) / 100,
    agents: Array.from(m.agents),
  }));
}

/**
 * Get list of all agents (for admin filter dropdown).
 */
export async function getAgentsList() {
  const user = await getSessionUser();
  if (user.role !== "L4_ADMIN") return [];

  const agents = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
  }));
}

export async function updateProcurementStatus(
  slipId: string,
  action: "L2_APPROVE" | "L2_REJECT" | "L3_APPROVE" | "L3_REJECT",
  updates?: { rate?: number; deduction?: number }
) {
  const user = await getSessionUser();
  const procurement = await prisma.procurement.findUniqueOrThrow({ where: { slipId } });

  const dataToUpdate: any = {};

  if (action === "L2_APPROVE") {
    if (user.role !== "L2_APPROVAL" && user.role !== "L4_ADMIN") throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L2") throw new Error("Invalid status");
    dataToUpdate.status = "PENDING_L3";
    dataToUpdate.l2ApprovedBy = user.userId;
  } else if (action === "L2_REJECT") {
    if (user.role !== "L2_APPROVAL" && user.role !== "L4_ADMIN") throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L2") throw new Error("Invalid status");
    dataToUpdate.status = "REJECTED_L2";
  } else if (action === "L3_APPROVE") {
    if (user.role !== "L3_PO_MAKER" && user.role !== "L4_ADMIN") throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L3") throw new Error("Invalid status");
    dataToUpdate.status = "APPROVED";
    dataToUpdate.l3ApprovedBy = user.userId;
  } else if (action === "L3_REJECT") {
    if (user.role !== "L3_PO_MAKER" && user.role !== "L4_ADMIN") throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L3") throw new Error("Invalid status");
    dataToUpdate.status = "REJECTED_L3";
  }

  if (updates) {
    if (updates.rate !== undefined) dataToUpdate.rate = updates.rate;
    if (updates.deduction !== undefined) dataToUpdate.deduction = updates.deduction;
    // Recalculate total if needed
    const newRate = updates.rate !== undefined ? updates.rate : procurement.rate;
    const newDeduction = updates.deduction !== undefined ? updates.deduction : procurement.deduction;
    const totalDeduction = newDeduction * procurement.bags;
    const netQuantity = procurement.grossQuantity - totalDeduction;
    dataToUpdate.netQuantity = Math.round(netQuantity * 100) / 100;
    dataToUpdate.total = Math.round((dataToUpdate.netQuantity * newRate) * 100) / 100;
  }

  return await prisma.procurement.update({
    where: { slipId },
    data: dataToUpdate,
  });
}
