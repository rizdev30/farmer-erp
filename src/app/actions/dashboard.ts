"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export interface DashboardStats {
  totalFarmers: number;
  todayProcurements: number;
  totalQuantity: string; // In Quintals
  totalPayout: string; // Formatted
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role || "AGENT";
    const userId = session?.user?.id || "";
    const isAdmin = role === "ADMIN";

    // Scope filter: agents only see their own data
    const farmerWhere: Record<string, unknown> = { active: true };
    const procurementWhere: Record<string, unknown> = {};

    if (!isAdmin) {
      farmerWhere.registeredBy = userId;
      procurementWhere.agentId = userId;
    }

    // Get total farmers
    const totalFarmers = await prisma.farmer.count({
      where: farmerWhere,
    });

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Count today's procurements
    const todayProcurements = await prisma.procurement.count({
      where: {
        ...procurementWhere,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Calculate totals from all procurements
    const aggregation = await prisma.procurement.aggregate({
      where: procurementWhere,
      _sum: {
        netQuantity: true,
        total: true,
      },
    });

    const totalQty = aggregation._sum.netQuantity || 0;
    const totalAmount = aggregation._sum.total || 0;

    return {
      totalFarmers,
      todayProcurements,
      totalQuantity: (Math.round(totalQty * 100) / 100).toFixed(2),
      totalPayout: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(totalAmount),
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      totalFarmers: 0,
      todayProcurements: 0,
      totalQuantity: "0.00",
      totalPayout: "₹0",
    };
  }
}
