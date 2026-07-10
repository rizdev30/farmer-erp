"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logAuditAction } from "@/lib/logger";

function generateSlipId(state?: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  
  let prefix = "FE";
  if (state) {
    const stateMap: Record<string, string> = {
      "UTTAR PRADESH": "UP", "MADHYA PRADESH": "MP", "ANDHRA PRADESH": "AP",
      "ARUNACHAL PRADESH": "AR", "ASSAM": "AS", "BIHAR": "BR", "CHHATTISGARH": "CG",
      "GOA": "GA", "GUJARAT": "GJ", "HARYANA": "HR", "HIMACHAL PRADESH": "HP",
      "JHARKHAND": "JH", "KARNATAKA": "KA", "KERALA": "KL", "MAHARASHTRA": "MH",
      "MANIPUR": "MN", "MEGHALAYA": "ML", "MIZORAM": "MZ", "NAGALAND": "NL",
      "ODISHA": "OD", "PUNJAB": "PB", "RAJASTHAN": "RJ", "SIKKIM": "SK",
      "TAMIL NADU": "TN", "TELANGANA": "TG", "TRIPURA": "TR", "UTTARAKHAND": "UK",
      "WEST BENGAL": "WB", "ANDAMAN AND NICOBAR ISLANDS": "AN", "CHANDIGARH": "CH",
      "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DH", "DELHI": "DL",
      "JAMMU AND KASHMIR": "JK", "JAMMU": "JK", "LADAKH": "LA", "LAKSHADWEEP": "LD",
      "PUDUCHERRY": "PY"
    };
    const upper = state.trim().toUpperCase();
    if (stateMap[upper]) {
      prefix = stateMap[upper];
    } else {
      prefix = upper.slice(0, 2) || "FE";
    }
  }
  
  return `${prefix}-${date}-${rand}`;
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
    roles: (session.user as any).roles || ["L1_AGENT"],
    isSuperAdmin: (session.user as any).isSuperAdmin || false,
    assignedStates: (session.user as any).assignedStates || [],
    assignedMandis: (session.user as any).assignedMandis || [],
    assignedL1Users: (session.user as any).assignedL1Users || [],
    assignedL2Users: (session.user as any).assignedL2Users || [],
    assignedL3Users: (session.user as any).assignedL3Users || [],
  };
}

export interface ProcurementData {
  farmerId: number;
  farmerName: string;
  fatherName?: string;
  farmerCode?: string;
  village?: string;
  category?: string;
  company?: string;
  panGst?: string;
  promoterName?: string;
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

export type ProcurementReceipt =
  | {
      success: true;
      slipId: string;
      invoiceId: number;
      timestamp: string;
      farmerName: string;
      fatherName?: string;
      farmerCode?: string;
      village?: string;
      category?: string;
      company?: string;
      panGst?: string;
      promoterName?: string;
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
      status: string;
      error?: undefined;
    }
  | {
      success: false;
      error: string;
      slipId?: undefined;
      invoiceId?: undefined;
      timestamp?: undefined;
      farmerName?: undefined;
      fatherName?: undefined;
      farmerCode?: undefined;
      village?: undefined;
      category?: undefined;
      company?: undefined;
      panGst?: undefined;
      promoterName?: undefined;
      crop?: undefined;
      variety?: undefined;
      bags?: undefined;
      packingSize?: undefined;
      grossQuantity?: undefined;
      deduction?: undefined;
      netQuantity?: undefined;
      rate?: undefined;
      bones?: undefined;
      adtiyaName?: undefined;
      lotNo?: undefined;
      total?: undefined;
      agentName?: undefined;
      status?: undefined;
    };

export async function createProcurement(
  data: ProcurementData
): Promise<ProcurementReceipt> {
  let user;
  try {
    user = await getSessionUser();
  } catch (e) {
    return { success: false, error: "Not authenticated" };
  }

  // 1. Role authorization check
  if (!user.roles.includes("L1_AGENT")) {
    return { success: false, error: "Only L1 Agents can create procurements" };
  }

  // 2. Input Validation
  if (!data.farmerId || typeof data.farmerId !== "number") {
    return { success: false, error: "Invalid farmer ID" };
  }
  if (!data.crop || typeof data.crop !== "string" || !data.crop.trim() || data.crop.length > 100) {
    return { success: false, error: "Invalid crop type (must be 1-100 characters)" };
  }
  if (data.variety === undefined || typeof data.variety !== "string" || data.variety.length > 100) {
    return { success: false, error: "Invalid variety" };
  }
  if (!data.bags || !Number.isInteger(data.bags) || data.bags <= 0) {
    return { success: false, error: "Number of bags must be a positive integer" };
  }
  if (!data.packingSize || typeof data.packingSize !== "number" || data.packingSize <= 0) {
    return { success: false, error: "Packing size must be a positive number" };
  }
  if (!data.grossQuantity || typeof data.grossQuantity !== "number" || data.grossQuantity <= 0) {
    return { success: false, error: "Gross quantity must be a positive number" };
  }
  if (data.deduction === undefined || typeof data.deduction !== "number" || data.deduction < 0) {
    return { success: false, error: "Deduction must be a non-negative number" };
  }
  if (!data.rate || typeof data.rate !== "number" || data.rate <= 0) {
    return { success: false, error: "Rate per quintal must be a positive number" };
  }
  if (data.bones === undefined || typeof data.bones !== "number" || data.bones < 0) {
    return { success: false, error: "Bones must be a non-negative number" };
  }
  if (data.adtiyaName && data.adtiyaName.length > 100) {
    return { success: false, error: "Adtiya name is too long" };
  }
  if (data.lotNo && data.lotNo.length > 100) {
    return { success: false, error: "Lot number is too long" };
  }

  let procurementAgentId = user.userId;
  let procurementAgentName = user.userName;
  let createdByAdmin = false;

  if (user.isSuperAdmin && data.agentId && data.agentId !== user.userId) {
    const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
    if (agent) {
      procurementAgentId = agent.id;
      procurementAgentName = agent.name;
      createdByAdmin = true;
    }
  }

  // Verify the farmer/trader belongs to this agent (if not admin/approver)
  let entity: any = null;
  if (data.category === "TRADER") {
    entity = await prisma.trader.findUnique({
      where: { id: data.farmerId },
      select: { registeredBy: true, state: true },
    });
  } else {
    entity = await prisma.farmer.findUnique({
      where: { id: data.farmerId },
      select: { registeredBy: true, state: true },
    });
  }

  if (!entity) {
    return { success: false, error: `${data.category === "TRADER" ? "Trader" : "Farmer"} not found` };
  }
  
  if (!user.isSuperAdmin && !user.roles.includes("L2_APPROVAL")) {
    if (entity.registeredBy !== user.userId) {
      return { success: false, error: `You can only procure from ${data.category === "TRADER" ? "traders" : "farmers"} you registered` };
    }
  }

  try {
    const grossQuantity = roundQuintal(data.grossQuantity);
    const deduction = roundQuintal(data.deduction || 0);
    // deduction is now kg per quintal.
    const rate = roundQuintal(data.rate);
    
    // Net quantity is conceptually gross minus the deduction weight.
    // Deduction weight in Qtl = (grossQuantity * deduction) / 100
    const deductionWeightQtl = (grossQuantity * deduction) / 100;
    const netQuantity = roundQuintal(grossQuantity - deductionWeightQtl);
    
    // Total Amount (Gross)
    const totalAmount = roundQuintal(grossQuantity * rate);
    
    // Total Deduction Amount
    const totalDeductionAmount = roundQuintal(deductionWeightQtl * rate);
    
    // We save the 'total' as the net amount for backend consistency if needed, 
    // or as gross. Let's save it as grossAmount - deductionAmount.
    const total = roundQuintal(totalAmount - totalDeductionAmount);
    const slipId = generateSlipId(entity.state);

    // Create procurement record in local DB
    const procurement = await prisma.procurement.create({
      data: {
        slipId,
        farmerId: data.farmerId,
        farmerName: data.farmerName.trim(),
        fatherName: (data.fatherName || "").trim(),
        farmerCode: (data.farmerCode || "").trim(),
        village: (data.village || "").trim(),
        crop: data.crop.trim(),
        variety: data.variety.trim(),
        bags: data.bags,
        packingSize: data.packingSize,
        grossQuantity,
        deduction,
        netQuantity,
        rate,
        bones: data.bones,
        adtiyaName: (data.adtiyaName || "").trim(),
        lotNo: (data.lotNo || "").trim(),
        total,
        agentId: procurementAgentId,
        agentName: procurementAgentName,
        status: "PENDING_L2",
        createdByAdmin,
        validated: true,
      },
    });

    await logAuditAction(user.userId, "PROCUREMENT_CREATED", `Created procurement slip ${slipId} for farmer ${data.farmerName}`);

    // Create Notification for Level 2 Approvers and L4 Admin
    try {
      await prisma.notification.create({
        data: {
          title: "New Approval Required",
          message: `A new procurement list **${slipId}** has arrived from L1 agent **${user.userName}** for approval.`,
          type: "PROCUREMENT_CREATED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L2_APPROVAL",
          senderName: user.userName,
        },
      });

      // Notify L4 Admin about new procurement
      await prisma.notification.create({
        data: {
          title: "New Procurement Created",
          message: `L1 agent **${user.userName}** created procurement **${slipId}** for farmer **${data.farmerName}**.`,
          type: "PROCUREMENT_CREATED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L4_ADMIN",
          senderName: user.userName,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification inside createProcurement:", notifErr);
    }

    return {
      success: true,
      slipId,
      invoiceId: procurement.id,
      timestamp: procurement.createdAt.toISOString(),
      farmerName: data.farmerName,
      fatherName: data.fatherName,
      farmerCode: data.farmerCode,
      village: data.village,
      category: data.category,
      company: data.company,
      panGst: data.panGst,
      promoterName: data.promoterName,
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
      status: procurement.status,
    };
  } catch (error: any) {
    console.error("Failed to create procurement:", error);
    return { success: false, error: error.message || "Failed to create procurement" };
  }
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
  limit?: number;
  skip?: number;
}) {
  const user = await getSessionUser();

  const where: Record<string, unknown> = {};

  if (user.roles.includes("L4_ADMIN") || user.isSuperAdmin) {
    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters?.status) {
      if (filters.status === "PENDING") {
        where.status = { in: ["PENDING_L2", "PENDING_L3"] };
      } else if (filters.status === "REJECTED") {
        where.status = { in: ["REJECTED_L2", "REJECTED_L3"] };
      } else {
        where.status = filters.status;
      }
    }
  } else {
    const hasAllAccess = user.assignedStates.includes("ALL") || user.assignedMandis.includes("ALL");
    const assignmentOr: any[] = [{ agentId: user.userId }];
    if (!hasAllAccess) {
      if (user.assignedL1Users.length > 0) assignmentOr.push({ agentId: { in: user.assignedL1Users } });
      if (user.assignedStates.length > 0) assignmentOr.push({ farmer: { state: { in: user.assignedStates } } });
      if (user.assignedMandis.length > 0) assignmentOr.push({ farmer: { town: { in: user.assignedMandis } } });
    }

    if (user.roles.includes("L3_PO_MAKER")) {
      if (!hasAllAccess) {
        if (user.assignedL2Users.length > 0) assignmentOr.push({ l2ApprovedBy: { in: user.assignedL2Users } });
        assignmentOr.push({ l3ApprovedBy: user.userId });
        where.OR = assignmentOr;
      }
      
      if (filters?.status) {
        if (filters.status === "PENDING") {
          where.status = "APPROVED"; // Since they don't approve anymore, they process APPROVED slips
        } else if (filters.status === "REJECTED") {
          where.status = "REJECTED_L3"; // legacy, or could just skip
        } else {
          where.status = filters.status;
        }
      } else {
        where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
      }
    } else if (user.roles.includes("L2_APPROVAL")) {
      if (!hasAllAccess) {
        assignmentOr.push({ l2ApprovedBy: user.userId });
        where.OR = assignmentOr;
      }

      if (filters?.status) {
        if (filters.status === "PENDING") {
          where.status = { in: ["PENDING_L2", "PENDING_L3"] };
        } else if (filters.status === "REJECTED") {
          where.status = { in: ["REJECTED_L2", "REJECTED_L3"] };
        } else {
          where.status = filters.status;
        }
      }
    } else if (user.roles.includes("L1_AGENT")) {
      if (!hasAllAccess) {
        where.OR = assignmentOr;
      }

      if (filters?.status) {
        if (filters.status === "PENDING") {
          where.status = { in: ["PENDING_L2", "PENDING_L3"] };
        } else if (filters.status === "REJECTED") {
          where.status = { in: ["REJECTED_L2", "REJECTED_L3"] };
        } else {
          where.status = filters.status;
        }
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
    take: filters?.limit ?? 15,
    skip: filters?.skip ?? 0,
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
    l2Edited: p.l2Edited,
    l3Edited: p.l3Edited,
    createdByAdmin: p.createdByAdmin,
    validated: p.validated,
    createdAt: p.createdAt.toISOString(),
  }));
}

/**
 * Get full details of a specific procurement record by Slip ID.
 */
export async function getProcurementBySlipId(slipId: string) {
  try {
    const user = await getSessionUser();
    const isAdmin = user.roles.includes("L4_ADMIN");

    let procurement = await prisma.procurement.findUnique({
      where: { slipId },
      include: {
        farmer: true,
      },
    });

    if (!procurement) {
      return { error: "Record not found in the database." };
    }

    // If this is a Trader procurement, the farmerId actually mapped to a Farmer with the same ID.
    // We must fetch the actual Trader using the farmerCode.
    if (procurement.farmerCode && procurement.farmerCode.startsWith("T")) {
      const trader = await prisma.trader.findUnique({
        where: { traderCode: procurement.farmerCode },
      });
      if (trader) {
        (procurement as any).farmer = { ...trader, category: "TRADER" };
      }
    }

    if (user.roles.includes("L4_ADMIN") || user.isSuperAdmin) {
      // allowed
    } else {
      const hasAllAccess = user.assignedStates.includes("ALL") || user.assignedMandis.includes("ALL");
      if (!hasAllAccess) {
        const isMyAgent = procurement.agentId === user.userId;
        const isAssignedL1 = user.assignedL1Users.includes(procurement.agentId);
        const isAssignedL2 = user.assignedL2Users.includes(procurement.l2ApprovedBy || "");
        const inAssignedState = user.assignedStates.includes((procurement as any).farmer?.state);
        const inAssignedMandi = user.assignedMandis.includes((procurement as any).farmer?.town);
        const iApprovedL2 = procurement.l2ApprovedBy === user.userId;
        const iApprovedL3 = procurement.l3ApprovedBy === user.userId;

        if (!isMyAgent && !isAssignedL1 && !isAssignedL2 && !inAssignedState && !inAssignedMandi && !iApprovedL2 && !iApprovedL3) {
          return { error: "You are not authorized to view this record." };
        }
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
      data: {
        ...procurement,
        farmer: {
          ...procurement.farmer,
        },
        agentDetails: agent,
        l2ApproverName,
        l3ApproverName,
      }
    };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred while fetching the record." };
  }
}

/**
 * Get monthly summary for cross-verification.
 * Groups procurement data by month with totals.
 */
/**
 * Fetch previous procurements for a specific farmer/trader by farmer ID.
 * Returns the most recent records to auto-populate crop details.
 */
export async function getProcurementsByFarmer(farmerId: number, category?: string) {
  const user = await getSessionUser();

  const where: any = { farmerId };

  if (category === "TRADER") {
    where.status = { in: ["APPROVED", "PENDING_L3"] };
  }

  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    where.agentId = user.userId;
  }

  const records = await prisma.procurement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      crop: true,
      variety: true,
      rate: true,
      bags: true,
      packingSize: true,
      grossQuantity: true,
      deduction: true,
      bones: true,
    },
  });

  return records;
}

export async function getMonthlySummary(filters?: { agentId?: string }) {
  const user = await getSessionUser();

  const where: Record<string, unknown> = {};

  if (user.roles.includes("L4_ADMIN") || user.isSuperAdmin) {
    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }
  } else {
    const hasAllAccess = user.assignedStates.includes("ALL") || user.assignedMandis.includes("ALL");
    const assignmentOr: any[] = [{ agentId: user.userId }];
    
    if (!hasAllAccess) {
      if (user.assignedL1Users.length > 0) assignmentOr.push({ agentId: { in: user.assignedL1Users } });
      if (user.assignedStates.length > 0) assignmentOr.push({ farmer: { state: { in: user.assignedStates } } });
      if (user.assignedMandis.length > 0) assignmentOr.push({ farmer: { town: { in: user.assignedMandis } } });
    }

    if (user.roles.includes("L3_PO_MAKER")) {
      if (!hasAllAccess) {
        if (user.assignedL2Users.length > 0) assignmentOr.push({ l2ApprovedBy: { in: user.assignedL2Users } });
        assignmentOr.push({ l3ApprovedBy: user.userId });
        where.OR = assignmentOr;
      }
      where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
    } else if (user.roles.includes("L2_APPROVAL")) {
      if (!hasAllAccess) {
        assignmentOr.push({ l2ApprovedBy: user.userId });
        where.OR = assignmentOr;
      }
    } else if (user.roles.includes("L1_AGENT")) {
      if (!hasAllAccess) {
        where.OR = assignmentOr;
      }
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
  if (!user.roles.includes("L4_ADMIN")) return [];

  const agents = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, roles: true },
    orderBy: { name: "asc" },
  });

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    roles: a.roles,
  }));
}

export async function updateProcurementStatus(
  slipId: string,
  action: "L2_APPROVE" | "L2_REJECT" | "L3_APPROVE" | "L3_REJECT",
  updates?: { rate?: number; deduction?: number; bones?: number }
) {
  const user = await getSessionUser();
  const procurement = await prisma.procurement.findUniqueOrThrow({ where: { slipId } });

  const dataToUpdate: any = {};

  if (action === "L2_APPROVE") {
    if (!user.roles.includes("L2_APPROVAL") && !user.isSuperAdmin) throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L2") throw new Error("Invalid status");
    dataToUpdate.status = "APPROVED";
    dataToUpdate.l2ApprovedBy = user.userId;
  } else if (action === "L2_REJECT") {
    if (!user.roles.includes("L2_APPROVAL") && !user.isSuperAdmin) throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L2") throw new Error("Invalid status");
    dataToUpdate.status = "REJECTED_L2";
  } else if (action === "L3_APPROVE") {
    if (!user.roles.includes("L3_PO_MAKER") && !user.isSuperAdmin) throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L3") throw new Error("Invalid status");
    dataToUpdate.status = "APPROVED";
    dataToUpdate.l3ApprovedBy = user.userId;
  } else if (action === "L3_REJECT") {
    if (!user.roles.includes("L3_PO_MAKER") && !user.isSuperAdmin) throw new Error("Unauthorized");
    if (procurement.status !== "PENDING_L3") throw new Error("Invalid status");
    dataToUpdate.status = "REJECTED_L3";
  }

  if (updates) {
    let hasEdit = false;
    if (updates.rate !== undefined) {
      if (typeof updates.rate !== "number" || updates.rate <= 0) {
        throw new Error("Rate must be a positive number");
      }
      if (updates.rate !== procurement.rate) {
        dataToUpdate.rate = updates.rate;
        hasEdit = true;
      }
    }
    if (updates.deduction !== undefined) {
      if (typeof updates.deduction !== "number" || updates.deduction < 0) {
        throw new Error("Deduction must be a non-negative number");
      }
      if (updates.deduction !== procurement.deduction) {
        dataToUpdate.deduction = updates.deduction;
        hasEdit = true;
      }
    }
    if (updates.bones !== undefined) {
      if (typeof updates.bones !== "number" || updates.bones < 0) {
        throw new Error("Bones must be a non-negative number");
      }
      if (updates.bones !== procurement.bones) {
        dataToUpdate.bones = updates.bones;
        hasEdit = true;
      }
    }
    
    if (hasEdit) {
      if (action.startsWith("L2")) dataToUpdate.l2Edited = true;
      if (action.startsWith("L3")) dataToUpdate.l3Edited = true;
    }

    // Recalculate total if needed
    const newRate = updates.rate !== undefined ? updates.rate : procurement.rate;
    const newDeduction = updates.deduction !== undefined ? updates.deduction : procurement.deduction;
    const newBones = updates.bones !== undefined ? updates.bones : procurement.bones;
    
    // deduction is in kg per quintal
    const dedWeightQtl = (procurement.grossQuantity * newDeduction) / 100;
    const netQuantity = procurement.grossQuantity - dedWeightQtl;
    dataToUpdate.netQuantity = Math.round(netQuantity * 100) / 100;
    
    const grossAmount = procurement.grossQuantity * newRate;
    const dedAmount = dedWeightQtl * newRate;
    const bonesAmount = procurement.grossQuantity * newBones;
    
    dataToUpdate.total = Math.round((grossAmount - dedAmount) * 100) / 100;
  }

  const updatedProcurement = await prisma.procurement.update({
    where: { slipId },
    data: dataToUpdate,
  });

  await logAuditAction(user.userId, `PROCUREMENT_${action}`, `Status changed to ${dataToUpdate.status} for slip ${slipId}`);

  // Create Notifications on Approval Status Change
  try {
    if (action === "L2_APPROVE") {
      // 1. Notify L1 Agent that their slip was approved
      await prisma.notification.create({
        data: {
          title: "Procurement Approved",
          message: `Your procurement list **${slipId}** has been approved by L2 approver **${user.userName}**.`,
          type: "PROCUREMENT_APPROVED",
          link: `/dashboard/history/${slipId}`,
          userId: procurement.agentId,
          senderName: user.userName,
        },
      });

      // 2. Notify L3 PO Makers that a new approved slip is ready
      await prisma.notification.create({
        data: {
          title: "New Approved Procurement",
          message: `A new approved procurement list **${slipId}** has arrived from L2 approver **${user.userName}** for PO creation.`,
          type: "PROCUREMENT_APPROVED_TO_PO",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L3_PO_MAKER",
          senderName: user.userName,
        },
      });

      // 3. Notify L4 Admin about the approval
      await prisma.notification.create({
        data: {
          title: "Slip Approved by L2",
          message: `Procurement **${slipId}** was approved by L2 approver **${user.userName}**.`,
          type: "PROCUREMENT_APPROVED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L4_ADMIN",
          senderName: user.userName,
        },
      });
    } else if (action === "L2_REJECT") {
      // 1. Notify L1 Agent that their slip was cancelled
      await prisma.notification.create({
        data: {
          title: "Procurement Cancelled",
          message: `Your procurement list **${slipId}** has been cancelled by L2 approver **${user.userName}**.`,
          type: "PROCUREMENT_CANCELLED",
          link: `/dashboard/history/${slipId}`,
          userId: procurement.agentId,
          senderName: user.userName,
        },
      });

      // 2. Notify L4 Admin about the cancellation
      await prisma.notification.create({
        data: {
          title: "Slip Cancelled by L2",
          message: `Procurement **${slipId}** was cancelled by L2 approver **${user.userName}**.`,
          type: "PROCUREMENT_CANCELLED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L4_ADMIN",
          senderName: user.userName,
        },
      });
    } else if (action === "L3_APPROVE") {
      // 1. Notify L1 Agent
      await prisma.notification.create({
        data: {
          title: "Procurement Fully Approved",
          message: `Your procurement list **${slipId}** has been fully approved by L3 PO Maker **${user.userName}**.`,
          type: "PROCUREMENT_APPROVED",
          link: `/dashboard/history/${slipId}`,
          userId: procurement.agentId,
          senderName: user.userName,
        },
      });

      // 2. Notify L4 Admin
      await prisma.notification.create({
        data: {
          title: "Slip Approved by L3",
          message: `Procurement **${slipId}** was approved by L3 PO Maker **${user.userName}**.`,
          type: "PROCUREMENT_APPROVED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L4_ADMIN",
          senderName: user.userName,
        },
      });
    } else if (action === "L3_REJECT") {
      // 1. Notify L1 Agent
      await prisma.notification.create({
        data: {
          title: "Procurement Rejected by L3",
          message: `Your procurement list **${slipId}** has been rejected by L3 PO Maker **${user.userName}**.`,
          type: "PROCUREMENT_CANCELLED",
          link: `/dashboard/history/${slipId}`,
          userId: procurement.agentId,
          senderName: user.userName,
        },
      });

      // 2. Notify L4 Admin
      await prisma.notification.create({
        data: {
          title: "Slip Rejected by L3",
          message: `Procurement **${slipId}** was rejected by L3 PO Maker **${user.userName}**.`,
          type: "PROCUREMENT_CANCELLED",
          link: `/dashboard/history/${slipId}`,
          targetRole: "L4_ADMIN",
          senderName: user.userName,
        },
      });
    }
  } catch (notifErr) {
    console.error("Failed to create notifications in updateProcurementStatus:", notifErr);
  }

  return updatedProcurement;
}
