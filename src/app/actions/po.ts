"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logAuditAction } from "@/lib/logger";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return {
    userId: session.user.id,
    userName: session.user.name || "Unknown",
    roles: (session.user as any).roles || ["L1_AGENT"],
    isSuperAdmin: (session.user as any).isSuperAdmin || false,
  };
}

export async function getPOBySlipId(slipId: string) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const existingPO = await prisma.purchaseOrder.findUnique({
    where: { slipId },
    include: {
      procurement: {
        include: { farmer: true }
      }
    }
  });

  if (existingPO) {
    return existingPO;
  }

  const procurement = await prisma.procurement.findUnique({
    where: { slipId },
    include: { farmer: true },
  });

  if (!procurement) {
    throw new Error("Procurement not found");
  }

  return {
    slipId: procurement.slipId,
    supplierName: procurement.farmerName || procurement.farmer?.name || "",
    supplierLocation: procurement.village || procurement.farmer?.village || procurement.farmer?.town || "",
    companyName: "Farmer ERP",
    companyAddress: "123 Sample Address, Sample City, State 123456",
    items: [],
    paymentDuration: 10,
    paymentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    procurement,
  };
}

export async function savePO(data: any) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const { slipId, poNumber, items, paymentDuration, paymentDate, companyName, companyAddress, supplierName, supplierLocation } = data;

  if (!slipId) throw new Error("slipId is required");

  const existing = await prisma.purchaseOrder.findUnique({ where: { slipId } });

  if (existing) {
    const updated = await prisma.purchaseOrder.update({
      where: { slipId },
      data: {
        poNumber: poNumber || existing.poNumber,
        items: items ? (items as any) : (existing.items as any),
        paymentDuration,
        paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
        companyName,
        companyAddress,
        supplierName,
        supplierLocation,
      },
    });
    
    await logAuditAction(user.userId, "PO_UPDATED", `Updated PO ${updated.poNumber} for slip ${slipId}`);
    return updated;
  } else {
    // Check if PO number already exists
    const poNumberToCheck = poNumber || `PO-${slipId}`;
    const existingPoNumber = await prisma.purchaseOrder.findUnique({ where: { poNumber: poNumberToCheck } });
    
    if (existingPoNumber) {
      throw new Error(`PO Number ${poNumberToCheck} already exists.`);
    }

    const created = await prisma.purchaseOrder.create({
      data: {
        slipId,
        poNumber: poNumberToCheck,
        items: items ? (items as any) : [],
        paymentDuration: paymentDuration || 10,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        companyName: companyName || "Farmer ERP",
        companyAddress: companyAddress || "123 Sample Address, Sample City, State 123456",
        supplierName: supplierName || "",
        supplierLocation: supplierLocation || "",
        createdById: user.userId,
      },
    });

    await logAuditAction(user.userId, "PO_CREATED", `Created PO ${created.poNumber} for slip ${slipId}`);
    return created;
  }
}

export async function getPOHistory() {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  return await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      procurement: {
        select: {
          netQuantity: true,
          rate: true,
          total: true,
          crop: true,
          variety: true,
        }
      }
    }
  });
}

export async function getApprovedProcurementsByAdhatiya(adhatiyaName: string) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const procurements = await prisma.procurement.findMany({
    where: {
      adtiyaName: {
        contains: adhatiyaName,
        mode: "insensitive"
      },
      status: {
        in: ["APPROVED", "PENDING_L3"] // Approved by L2 (PENDING_L3) or fully APPROVED
      },
    },
    include: {
      farmer: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  return procurements;
}

export async function getAdhatiyas(query?: string) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  if (!query) {
    return await prisma.adhatiya.findMany({
      orderBy: { name: "asc" }
    });
  }

  return await prisma.adhatiya.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive"
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function saveAdhatiya(data: { 
  id?: number; 
  name: string; 
  address?: string; 
  village?: string;
  block?: string;
  pinCode?: string;
  state?: string;
  district?: string;
  mandi?: string;
  gstNo?: string; 
  mobile?: string; 
  email?: string;
}) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const { id, name, address, village, block, pinCode, state, district, mandi, gstNo, mobile, email } = data;

  if (id) {
    const updated = await prisma.adhatiya.update({
      where: { id },
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        mandi: mandi || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "ADAHATIYA_UPDATED", `Updated Adhatiya ${name}`);
    return updated;
  } else {
    const existing = await prisma.adhatiya.findUnique({
      where: { name }
    });
    if (existing) {
      throw new Error(`Adhatiya with name "${name}" already exists.`);
    }

    const created = await prisma.adhatiya.create({
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        mandi: mandi || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "ADAHATIYA_CREATED", `Created Adhatiya ${name}`);
    return created;
  }
}

export async function deleteAdhatiya(id: number) {
  const user = await getSessionUser();
  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const deleted = await prisma.adhatiya.delete({
    where: { id }
  });
  await logAuditAction(user.userId, "ADAHATIYA_DELETED", `Deleted Adhatiya ID ${id}`);
  return deleted;
}

