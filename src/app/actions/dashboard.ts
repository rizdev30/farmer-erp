"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export interface DashboardStats {
  totalPurchase: number;
  todayProcurements: number;
  pendingApproval: number;
  approved: number;
  totalPurchaseQtl: string;
  todaysPurchaseQtl: string;
  todaysAveragePrice: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role || "L1_AGENT";
    const userId = session?.user?.id || "";

    const farmerWhere: Record<string, unknown> = { active: true };
    const procurementWhere: Record<string, unknown> = {};

    if (role === "L1_AGENT") {
      farmerWhere.registeredBy = userId;
      procurementWhere.agentId = userId;
    } else if (role === "L2_APPROVAL") {
      // Level 2 sees their own and pending L2
      procurementWhere.OR = [
        { agentId: userId },
        { status: "PENDING_L2" },
        { l2ApprovedBy: userId }
      ];
    } else if (role === "L3_PO_MAKER") {
      procurementWhere.status = { in: ["PENDING_L3", "APPROVED", "REJECTED_L3"] };
    }
    // L4_ADMIN sees everything so where clauses remain empty

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalPurchase = await prisma.procurement.count({
      where: procurementWhere,
    });

    const todayProcurements = await prisma.procurement.count({
      where: {
        ...procurementWhere,
        createdAt: { gte: todayStart, lte: todayEnd }
      }
    });

    const pendingApproval = await prisma.procurement.count({
      where: {
        ...procurementWhere,
        status: { in: ["PENDING_L2", "PENDING_L3"] }
      }
    });

    const approved = await prisma.procurement.count({
      where: {
        ...procurementWhere,
        status: "APPROVED"
      }
    });

    const allAgg = await prisma.procurement.aggregate({
      where: procurementWhere,
      _sum: { netQuantity: true }
    });
    
    const todayAgg = await prisma.procurement.aggregate({
      where: {
        ...procurementWhere,
        createdAt: { gte: todayStart, lte: todayEnd }
      },
      _sum: { netQuantity: true },
      _avg: { rate: true }
    });

    return {
      totalPurchase,
      todayProcurements,
      pendingApproval,
      approved,
      totalPurchaseQtl: (Math.round((allAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysPurchaseQtl: (Math.round((todayAgg._sum.netQuantity || 0) * 100) / 100).toFixed(2),
      todaysAveragePrice: (Math.round((todayAgg._avg.rate || 0) * 100) / 100).toFixed(2),
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      totalPurchase: 0,
      todayProcurements: 0,
      pendingApproval: 0,
      approved: 0,
      totalPurchaseQtl: "0.00",
      todaysPurchaseQtl: "0.00",
      todaysAveragePrice: "0.00",
    };
  }
}
