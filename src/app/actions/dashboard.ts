"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { CROP_VARIETIES, VarietyStat, DashboardStats, VarietyRecord, SlipRecord, SlipStats } from "@/lib/crop-varieties";

function buildProcurementWhere(user: any): Record<string, unknown> {
  const roles = user?.roles || ["L1_AGENT"];
  const userId = user?.id || "";
  const isSuperAdmin = user?.isSuperAdmin || false;
  const assignedStates: string[] = user?.assignedStates || [];
  const assignedMandis: string[] = user?.assignedMandis || [];
  const assignedL1Users: string[] = user?.assignedL1Users || [];
  const assignedL2Users: string[] = user?.assignedL2Users || [];

  const where: Record<string, unknown> = {};

  if (roles.includes("L4_ADMIN") || isSuperAdmin) {
    return where;
  }

  const assignmentOr: any[] = [{ agentId: userId }];
  if (assignedL1Users.length > 0) assignmentOr.push({ agentId: { in: assignedL1Users } });
  if (assignedStates.length > 0) assignmentOr.push({ farmer: { state: { in: assignedStates } } });
  if (assignedMandis.length > 0) assignmentOr.push({ farmer: { town: { in: assignedMandis } } });

  if (roles.includes("L3_PO_MAKER")) {
    if (assignedL2Users.length > 0) assignmentOr.push({ l2ApprovedBy: { in: assignedL2Users } });
    assignmentOr.push({ l3ApprovedBy: userId });
    where.OR = assignmentOr;
    where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
  } else if (roles.includes("L2_APPROVAL")) {
    assignmentOr.push({ l2ApprovedBy: userId });
    where.OR = assignmentOr;
  } else if (roles.includes("L1_AGENT")) {
    where.OR = assignmentOr;
  }

  return where;
}

function buildFilteredWhere(user: any, filters?: {
  state?: string;
  district?: string;
  mandi?: string;
  agentId?: string;
}) {
  const roles = user?.roles || ["L1_AGENT"];
  const userId = user?.id || "";
  const isSuperAdmin = user?.isSuperAdmin || false;
  const assignedStates: string[] = user?.assignedStates || [];
  const assignedMandis: string[] = user?.assignedMandis || [];
  const assignedL1Users: string[] = user?.assignedL1Users || [];
  const assignedL2Users: string[] = user?.assignedL2Users || [];

  const where: Record<string, any> = {};

  if (filters?.agentId) {
    where.agentId = filters.agentId;
  }

  if (roles.includes("L4_ADMIN") || isSuperAdmin) {
    // Admin has no base geographic scoping restriction.
  } else {
    // Non-admin (L1, L2, L3) scoping:
    const geoConditions: any[] = [];
    const hasAssignedStates = assignedStates.length > 0 && !assignedStates.includes("ALL");
    const hasAssignedMandis = assignedMandis.length > 0 && !assignedMandis.includes("ALL");

    if (hasAssignedStates) {
      geoConditions.push({ farmer: { state: { in: assignedStates } } });
    }
    if (hasAssignedMandis) {
      geoConditions.push({ farmer: { town: { in: assignedMandis } } });
    }

    if (geoConditions.length > 0) {
      where.OR = geoConditions;
    } else {
      // Default to agent id or hierarchy
      const assignmentOr: any[] = [{ agentId: userId }];
      if (assignedL1Users.length > 0) assignmentOr.push({ agentId: { in: assignedL1Users } });
      
      if (roles.includes("L3_PO_MAKER")) {
        if (assignedL2Users.length > 0) assignmentOr.push({ l2ApprovedBy: { in: assignedL2Users } });
        assignmentOr.push({ l3ApprovedBy: userId });
        where.OR = assignmentOr;
        where.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
      } else if (roles.includes("L2_APPROVAL")) {
        assignmentOr.push({ l2ApprovedBy: userId });
        where.OR = assignmentOr;
      } else {
        where.OR = assignmentOr;
      }
    }
  }

  // Admin filter narrow down
  if (filters?.state || filters?.district || filters?.mandi) {
    const farmerFilter: any = {};
    if (filters.state) farmerFilter.state = filters.state;
    if (filters.district) farmerFilter.district = filters.district;
    if (filters.mandi) farmerFilter.town = filters.mandi;

    if (where.farmer) {
      where.farmer = { ...where.farmer, ...farmerFilter };
    } else {
      where.farmer = farmerFilter;
    }
  }

  return where;
}

function getStatusFilterList(statusFilter?: string) {
  if (statusFilter === "PENDING") {
    return ["PENDING_L2", "PENDING_L3"];
  }
  if (statusFilter === "APPROVED") {
    return ["APPROVED"];
  }
  if (statusFilter === "CANCEL") {
    return ["REJECTED_L2", "REJECTED_L3"];
  }
  // Default is "ALL" -> APPROVED and PENDING
  return ["APPROVED", "PENDING_L2", "PENDING_L3"];
}

export async function getDashboardStats(filters?: {
  state?: string;
  district?: string;
  mandi?: string;
  status?: string;
  month?: string;
  agentId?: string;
}): Promise<DashboardStats> {
  try {
    const session = await auth();
    const baseWhere = buildFilteredWhere(session?.user, filters);

    // Get date range for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get date range for total (monthly)
    const now = new Date();
    let monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    if (filters?.month) {
      const [yearStr, monthStr] = filters.month.split("-");
      const year = parseInt(yearStr);
      const monthIndex = parseInt(monthStr) - 1;
      monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    }

    const todayWhere = { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } };
    const monthWhere = { ...baseWhere, createdAt: { gte: monthStart, lte: monthEnd } };

    // Today's slip counts (independent of the metrics status filter)
    const [
      todaysTotalSlips,
      todaysApprovedSlips,
      todaysPendingSlips,
      todaysCancelSlips,
    ] = await Promise.all([
      prisma.procurement.count({ where: todayWhere }),
      prisma.procurement.count({ where: { ...todayWhere, status: "APPROVED" } }),
      prisma.procurement.count({ where: { ...todayWhere, status: { in: ["PENDING_L2", "PENDING_L3"] } } }),
      prisma.procurement.count({ where: { ...todayWhere, status: { in: ["REJECTED_L2", "REJECTED_L3"] } } }),
    ]);

    // Monthly/Total slip counts (independent of the metrics status filter)
    const [
      totalPurchase,
      approved,
      pendingApproval,
      rejected,
    ] = await Promise.all([
      prisma.procurement.count({ where: monthWhere }),
      prisma.procurement.count({ where: { ...monthWhere, status: "APPROVED" } }),
      prisma.procurement.count({ where: { ...monthWhere, status: { in: ["PENDING_L2", "PENDING_L3"] } } }),
      prisma.procurement.count({ where: { ...monthWhere, status: { in: ["REJECTED_L2", "REJECTED_L3"] } } }),
    ]);

    // Status filter list for metrics
    const metricsStatusList = getStatusFilterList(filters?.status);

    // Today's purchase metrics (filtered by metricsStatusList)
    const todayMetricsWhere = { ...todayWhere, status: { in: metricsStatusList } };
    const todayAgg = await prisma.procurement.aggregate({
      where: todayMetricsWhere,
      _sum: { netQuantity: true, bags: true, total: true },
      _avg: { rate: true },
    });

    // Monthly purchase metrics (filtered by metricsStatusList)
    const monthMetricsWhere = { ...monthWhere, status: { in: metricsStatusList } };
    const monthAgg = await prisma.procurement.aggregate({
      where: monthMetricsWhere,
      _sum: { netQuantity: true, bags: true, total: true },
      _avg: { rate: true },
    });

    return {
      totalPurchase,
      todayProcurements: todaysTotalSlips,
      pendingApproval,
      approved,
      rejected,
      totalPurchaseQtl: (Math.round((monthAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysPurchaseQtl: (Math.round((todayAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysAveragePrice: (Math.round((todayAgg._avg.rate || 0) * 100) / 100).toFixed(2),
      totalBags: monthAgg._sum.bags || 0,
      todaysBags: todayAgg._sum.bags || 0,
      totalAveragePrice: (Math.round((monthAgg._avg.rate || 0) * 100) / 100).toFixed(2),
      todaysValue: (todayAgg._sum.total || 0).toString(),
      totalValue: (monthAgg._sum.total || 0).toString(),
      todaysTotalSlips,
      todaysApprovedSlips,
      todaysPendingSlips,
      todaysCancelSlips,
      totalApprovedSlips: approved,
      totalPendingSlips: pendingApproval,
      totalCancelSlips: rejected,
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      totalPurchase: 0,
      todayProcurements: 0,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      totalPurchaseQtl: "0.00",
      todaysPurchaseQtl: "0.00",
      todaysAveragePrice: "0.00",
      totalBags: 0,
      todaysBags: 0,
      totalAveragePrice: "0.00",
      todaysValue: "0",
      totalValue: "0",
      todaysTotalSlips: 0,
      todaysApprovedSlips: 0,
      todaysPendingSlips: 0,
      todaysCancelSlips: 0,
      totalApprovedSlips: 0,
      totalPendingSlips: 0,
      totalCancelSlips: 0,
    };
  }
}

export async function getVarietyStats(filters?: {
  state?: string;
  district?: string;
  mandi?: string;
  status?: string;
  month?: string;
  agentId?: string;
}): Promise<VarietyStat[]> {
  try {
    const session = await auth();
    const baseWhere = buildFilteredWhere(session?.user, filters);

    // Date range filter for monthly crop variety summary:
    const now = new Date();
    let monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    if (filters?.month) {
      const [yearStr, monthStr] = filters.month.split("-");
      const year = parseInt(yearStr);
      const monthIndex = parseInt(monthStr) - 1;
      monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    }
    const where: any = { ...baseWhere, createdAt: { gte: monthStart, lte: monthEnd } };

    // Apply status filter for crop variety metrics
    const metricsStatusList = getStatusFilterList(filters?.status);
    where.status = { in: metricsStatusList };

    const results = await prisma.procurement.groupBy({
      by: ["variety"],
      where,
      _sum: { bags: true, netQuantity: true, total: true },
      _avg: { rate: true },
    });

    // Build a map for quick lookup
    const resultMap = new Map(
      results.map((r) => [r.variety, r])
    );

    // Return rows for all 6 standard varieties, even if zero
    return CROP_VARIETIES.map((v) => {
      const r = resultMap.get(v);
      const bags = r?._sum.bags ?? 0;
      const weight = r?._sum.netQuantity ?? 0;
      const value = r?._sum.total ?? 0;
      const avg = r?._avg.rate ?? 0;
      return {
        variety: v,
        bags,
        weightQtl: (Math.round(weight * 100) / 100).toFixed(2),
        value: value.toFixed(2),
        avgCost: (Math.round(avg * 100) / 100).toFixed(2),
      };
    });
  } catch (error) {
    console.error("Variety stats error:", error);
    return CROP_VARIETIES.map((v) => ({
      variety: v,
      bags: 0,
      weightQtl: "0.00",
      value: "0.00",
      avgCost: "0.00",
    }));
  }
}

/** Drill-down: stats + records for a single variety, scoped by role */
export async function getVarietyDetail(variety: string): Promise<{
  stats: DashboardStats;
  records: VarietyRecord[];
}> {
  try {
    const session = await auth();
    const baseWhere = { variety, ...buildProcurementWhere(session?.user) };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalPurchase, todayProcurements, pendingApproval, approved, rejected, allAgg, todayAgg, rows] =
      await Promise.all([
        prisma.procurement.count({ where: baseWhere }),
        prisma.procurement.count({ where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } } }),
        prisma.procurement.count({ where: { ...baseWhere, status: { in: ["PENDING_L2", "PENDING_L3"] } } }),
        prisma.procurement.count({ where: { ...baseWhere, status: "APPROVED" } }),
        prisma.procurement.count({ where: { ...baseWhere, status: { in: ["REJECTED_L2", "REJECTED_L3"] } } }),
        prisma.procurement.aggregate({
          where: baseWhere,
          _sum: { netQuantity: true, bags: true },
          _avg: { rate: true },
        }),
        prisma.procurement.aggregate({
          where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } },
          _sum: { netQuantity: true, bags: true },
          _avg: { rate: true },
        }),
        prisma.procurement.findMany({
          where: baseWhere,
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, slipId: true, farmerName: true, farmerCode: true,
            village: true, bags: true, netQuantity: true, rate: true,
            total: true, status: true, agentName: true, createdAt: true,
          },
        }),
      ]);

    const stats: DashboardStats = {
      totalPurchase,
      todayProcurements,
      pendingApproval,
      approved,
      rejected,
      totalPurchaseQtl: (Math.round((allAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysPurchaseQtl: (Math.round((todayAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysAveragePrice: (Math.round((todayAgg._avg.rate || 0) * 100) / 100).toFixed(2),
      totalBags: allAgg._sum.bags || 0,
      todaysBags: todayAgg._sum.bags || 0,
      totalAveragePrice: (Math.round((allAgg._avg.rate || 0) * 100) / 100).toFixed(2),
    };

    const records: VarietyRecord[] = rows.map((r) => ({
      id: r.id,
      slipId: r.slipId,
      farmerName: r.farmerName,
      farmerCode: r.farmerCode,
      village: r.village,
      bags: r.bags,
      weightQtl: r.netQuantity,
      rate: r.rate,
      total: r.total,
      status: r.status,
      agentName: r.agentName,
      createdAt: r.createdAt.toISOString(),
    }));

    return { stats, records };
  } catch (error) {
    console.error("Variety detail error:", error);
    const empty: DashboardStats = {
      totalPurchase: 0, todayProcurements: 0, pendingApproval: 0, approved: 0,
      rejected: 0, totalPurchaseQtl: "0.00", todaysPurchaseQtl: "0.00",
      todaysAveragePrice: "0.00", totalBags: 0, todaysBags: 0, totalAveragePrice: "0.00",
    };
    return { stats: empty, records: [] };
  }
}

/** Today-only drill-down: stats + all of today's procurement records */
export async function getTodayDetail(): Promise<{
  stats: DashboardStats;
  records: SlipRecord[];
}> {
  try {
    const session = await auth();
    const baseWhere = buildProcurementWhere(session?.user);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayWhere = { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } };

    const [tp, ta, tPending, tApproved, tRejected, tAgg, allAgg, rows] = await Promise.all([
      prisma.procurement.count({ where: todayWhere }),
      prisma.procurement.count({ where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.procurement.count({ where: { ...todayWhere, status: { in: ["PENDING_L2", "PENDING_L3"] } } }),
      prisma.procurement.count({ where: { ...todayWhere, status: "APPROVED" } }),
      prisma.procurement.count({ where: { ...todayWhere, status: { in: ["REJECTED_L2", "REJECTED_L3"] } } }),
      prisma.procurement.aggregate({ where: todayWhere, _sum: { netQuantity: true, bags: true }, _avg: { rate: true } }),
      prisma.procurement.aggregate({ where: baseWhere, _sum: { netQuantity: true, bags: true }, _avg: { rate: true } }),
      prisma.procurement.findMany({
        where: todayWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true, slipId: true, farmerName: true, farmerCode: true, village: true,
          crop: true, variety: true, bags: true, netQuantity: true, rate: true,
          total: true, status: true, agentName: true, createdAt: true,
        },
      }),
    ]);

    const stats: DashboardStats = {
      totalPurchase: tp,
      todayProcurements: ta,
      pendingApproval: tPending,
      approved: tApproved,
      rejected: tRejected,
      totalPurchaseQtl: (Math.round((allAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysPurchaseQtl: (Math.round((tAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysAveragePrice: (Math.round((tAgg._avg.rate || 0) * 100) / 100).toFixed(2),
      totalBags: allAgg._sum.bags || 0,
      todaysBags: tAgg._sum.bags || 0,
      totalAveragePrice: (Math.round((allAgg._avg.rate || 0) * 100) / 100).toFixed(2),
    };

    const records: SlipRecord[] = rows.map((r) => ({
      id: r.id, slipId: r.slipId, farmerName: r.farmerName, farmerCode: r.farmerCode,
      village: r.village, crop: r.crop, variety: r.variety, bags: r.bags,
      weightQtl: r.netQuantity, rate: r.rate, total: r.total,
      status: r.status, agentName: r.agentName, createdAt: r.createdAt.toISOString(),
    }));

    return { stats, records };
  } catch (e) {
    console.error("getTodayDetail error:", e);
    const empty: DashboardStats = {
      totalPurchase: 0, todayProcurements: 0, pendingApproval: 0, approved: 0,
      rejected: 0, totalPurchaseQtl: "0.00", todaysPurchaseQtl: "0.00",
      todaysAveragePrice: "0.00", totalBags: 0, todaysBags: 0, totalAveragePrice: "0.00",
    };
    return { stats: empty, records: [] };
  }
}

/** All-slips drill-down: slip counts by status + all procurement records */
export async function getAllSlipsDetail(): Promise<{
  slipStats: SlipStats;
  records: SlipRecord[];
}> {
  try {
    const session = await auth();
    const baseWhere = buildProcurementWhere(session?.user);

    const [total, approved, awaiting, cancelled, agg, rows] = await Promise.all([
      prisma.procurement.count({ where: baseWhere }),
      prisma.procurement.count({ where: { ...baseWhere, status: "APPROVED" } }),
      prisma.procurement.count({ where: { ...baseWhere, status: { in: ["PENDING_L2", "PENDING_L3"] } } }),
      prisma.procurement.count({ where: { ...baseWhere, status: { in: ["REJECTED_L2", "REJECTED_L3"] } } }),
      prisma.procurement.aggregate({ where: baseWhere, _sum: { bags: true, netQuantity: true, total: true } }),
      prisma.procurement.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          id: true, slipId: true, farmerName: true, farmerCode: true, village: true,
          crop: true, variety: true, bags: true, netQuantity: true, rate: true,
          total: true, status: true, agentName: true, createdAt: true,
        },
      }),
    ]);

    const slipStats: SlipStats = {
      total,
      approved,
      awaiting,
      cancelled,
      totalBags: agg._sum.bags || 0,
      totalWeightQtl: (Math.round((agg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      totalValue: (Math.round((agg._sum.total || 0) * 100) / 100).toFixed(2),
    };

    const records: SlipRecord[] = rows.map((r) => ({
      id: r.id, slipId: r.slipId, farmerName: r.farmerName, farmerCode: r.farmerCode,
      village: r.village, crop: r.crop, variety: r.variety, bags: r.bags,
      weightQtl: r.netQuantity, rate: r.rate, total: r.total,
      status: r.status, agentName: r.agentName, createdAt: r.createdAt.toISOString(),
    }));

    return { slipStats, records };
  } catch (e) {
    console.error("getAllSlipsDetail error:", e);
    return {
      slipStats: { total: 0, approved: 0, awaiting: 0, cancelled: 0, totalBags: 0, totalWeightQtl: "0.00", totalValue: "0.00" },
      records: [],
    };
  }
}
