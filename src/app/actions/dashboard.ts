"use server";

import dolibarr from "@/lib/dolibarr";

export interface DashboardStats {
  totalFarmers: number;
  todayProcurements: number;
  totalQuantity: string; // In Quintals
  totalPayout: string; // Formatted
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total farmers (suppliers)
    const farmers = await dolibarr.getThirdParties({ limit: "0" });
    const totalFarmers = Array.isArray(farmers) ? farmers.length : 0;

    // Get recent invoices
    const invoices = await dolibarr.getSupplierInvoices({ limit: "100" });
    const invoiceList = Array.isArray(invoices) ? invoices : [];

    // Calculate today's procurements
    const today = new Date().toISOString().slice(0, 10);
    const todayInvoices = invoiceList.filter((inv: unknown) => {
      const i = inv as { datec?: string; date_creation?: string };
      const dateStr = i.datec || i.date_creation || "";
      return dateStr.startsWith(today);
    });

    // Calculate totals from all invoices
    let totalQty = 0;
    let totalAmount = 0;
    invoiceList.forEach((inv: unknown) => {
      const i = inv as { total_ht?: number; lines?: { qty?: number }[] };
      totalAmount += Number(i.total_ht) || 0;
      if (i.lines) {
        i.lines.forEach((line) => {
          totalQty += Number(line.qty) || 0;
        });
      }
    });

    return {
      totalFarmers,
      todayProcurements: todayInvoices.length,
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
