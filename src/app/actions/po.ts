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
    companyName: "Farmer ERP Pvt Ltd",
    companyAddress: "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
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

  const { slipId, poNumber, items, paymentDuration, paymentDate, companyName, companyAddress, supplierName, supplierLocation, status } = data;

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
        status: status || existing.status,
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
        companyName: companyName || "Farmer ERP Pvt Ltd",
        companyAddress: companyAddress || "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
        supplierName: supplierName || "",
        supplierLocation: supplierLocation || "",
        status: status || "SAVED",
        createdById: user.userId,
      },
    });

    await logAuditAction(user.userId, "PO_CREATED", `Created PO ${created.poNumber} for slip ${slipId}`);
    return created;
  }
}

export async function getPOHistory(limit?: number) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  return await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: limit ?? 50,
    include: {
      procurement: {
        select: {
          netQuantity: true,
          rate: true,
          total: true,
          crop: true,
          variety: true,
          adtiyaName: true,
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

  // Fetch all Purchase Orders to compute already billed bags/quantities
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    select: {
      slipId: true,
      items: true
    }
  });

  const billedMap = new Map<string, { bags: number; qty: number }>();
  for (const po of purchaseOrders) {
    let itemsObj: any = po.items;
    if (typeof itemsObj === "string") {
      try { itemsObj = JSON.parse(itemsObj); } catch (e) { itemsObj = {}; }
    }
    const list = itemsObj?.selectedProcurements || [];
    for (const item of list) {
      if (item.slipId) {
        const prev = billedMap.get(item.slipId) || { bags: 0, qty: 0 };
        billedMap.set(item.slipId, {
          bags: prev.bags + (Number(item.bags) || 0),
          qty: prev.qty + (Number(item.netQuantity) || 0)
        });
      }
    }
  }

  const results = procurements.map(proc => {
    const billed = billedMap.get(proc.slipId) || { bags: 0, qty: 0 };
    const remainingBags = Math.max(0, proc.bags - billed.bags);
    const remainingQty = Math.max(0, Math.round((proc.netQuantity - billed.qty) * 100) / 100);
    return {
      ...proc,
      originalBags: proc.bags,
      originalNetQuantity: proc.netQuantity,
      remainingBags,
      remainingQty,
      // override initial values for selection
      bags: remainingBags,
      netQuantity: remainingQty,
      total: Math.round((remainingQty * proc.rate) * 100) / 100
    };
  });

  return results.filter(r => r.remainingBags > 0);
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
  if (!user.userId) {
    throw new Error("Unauthorized");
  }

  const { id, name, address, village, block, pinCode, state, district, mandi, gstNo, mobile, email } = data;

  if (!gstNo || !gstNo.trim()) {
    throw new Error("GST/PAN No. is required.");
  }
  if (!mobile || !mobile.trim()) {
    throw new Error("Mobile No. is required.");
  }

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
        gstNo: gstNo.trim(),
        mobile: mobile.trim(),
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "ADAHATIYA_UPDATED", `Updated Adhatiya ${name} by user ${user.userName}`);
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
        gstNo: gstNo.trim(),
        mobile: mobile.trim(),
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "ADAHATIYA_CREATED", `Created Adhatiya ${name} by user ${user.userName}`);
    return created;
  }
}

export async function deleteAdhatiya(id: number) {
  const user = await getSessionUser();
  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const targetAdhatiya = await prisma.adhatiya.findUnique({
    where: { id }
  });

  const deleted = await prisma.adhatiya.delete({
    where: { id }
  });
  await logAuditAction(user.userId, "ADAHATIYA_DELETED", `Deleted Adhatiya "${targetAdhatiya?.name || 'Unknown'}" (ID: ${id}) by user ${user.userName}`);
  return deleted;
}

export async function markPOAsBilled(slipId: string) {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { slipId },
    data: { status: "BILLED" }
  });

  await logAuditAction(user.userId, "PO_BILLED", `Marked PO ${updated.poNumber} as BILLED/APPROVED`);
  return updated;
}

export async function getCompanyAddresses() {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  return await prisma.companyAddress.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function saveCompanyAddress(data: {
  id?: number;
  name: string;
  address?: string;
  village?: string;
  block?: string;
  pinCode?: string;
  state?: string;
  district?: string;
  place?: string;
  gstNo?: string;
  mobile?: string;
  email?: string;
}) {
  const user = await getSessionUser();
  if (!user.userId) {
    throw new Error("Unauthorized");
  }

  const { id, name, address, village, block, pinCode, state, district, place, gstNo, mobile, email } = data;

  if (id) {
    const updated = await prisma.companyAddress.update({
      where: { id },
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        place: place || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "COMPANY_ADDRESS_UPDATED", `Updated Company Address ${name} by user ${user.userName}`);
    return updated;
  } else {
    const existing = await prisma.companyAddress.findUnique({
      where: { name }
    });
    if (existing) {
      throw new Error(`Company Address with name "${name}" already exists.`);
    }

    const created = await prisma.companyAddress.create({
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        place: place || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "COMPANY_ADDRESS_CREATED", `Created Company Address ${name} by user ${user.userName}`);
    return created;
  }
}

export async function deleteCompanyAddress(id: number) {
  const user = await getSessionUser();
  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const target = await prisma.companyAddress.findUnique({
    where: { id }
  });

  const deleted = await prisma.companyAddress.delete({
    where: { id }
  });
  await logAuditAction(user.userId, "COMPANY_ADDRESS_DELETED", `Deleted Company Address "${target?.name || 'Unknown'}" (ID: ${id}) by user ${user.userName}`);
  return deleted;
}

export async function getWarehouseAddresses() {
  const user = await getSessionUser();
  if (!user.roles.includes("L3_PO_MAKER") && !user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  return await prisma.warehouseAddress.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function saveWarehouseAddress(data: {
  id?: number;
  name: string;
  address?: string;
  village?: string;
  block?: string;
  pinCode?: string;
  state?: string;
  district?: string;
  place?: string;
  gstNo?: string;
  mobile?: string;
  email?: string;
}) {
  const user = await getSessionUser();
  if (!user.userId) {
    throw new Error("Unauthorized");
  }

  const { id, name, address, village, block, pinCode, state, district, place, gstNo, mobile, email } = data;

  if (id) {
    const updated = await prisma.warehouseAddress.update({
      where: { id },
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        place: place || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "WAREHOUSE_ADDRESS_UPDATED", `Updated Warehouse Address ${name} by user ${user.userName}`);
    return updated;
  } else {
    const existing = await prisma.warehouseAddress.findUnique({
      where: { name }
    });
    if (existing) {
      throw new Error(`Warehouse Address with name "${name}" already exists.`);
    }

    const created = await prisma.warehouseAddress.create({
      data: {
        name,
        address: address || "",
        village: village || "",
        block: block || "",
        pinCode: pinCode || "",
        state: state || "",
        district: district || "",
        place: place || "",
        gstNo: gstNo || "",
        mobile: mobile || "",
        email: email || "",
      }
    });
    await logAuditAction(user.userId, "WAREHOUSE_ADDRESS_CREATED", `Created Warehouse Address ${name} by user ${user.userName}`);
    return created;
  }
}

export async function deleteWarehouseAddress(id: number) {
  const user = await getSessionUser();
  if (!user.roles.includes("L4_ADMIN") && !user.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const target = await prisma.warehouseAddress.findUnique({
    where: { id }
  });

  const deleted = await prisma.warehouseAddress.delete({
    where: { id }
  });
  await logAuditAction(user.userId, "WAREHOUSE_ADDRESS_DELETED", `Deleted Warehouse Address "${target?.name || 'Unknown'}" (ID: ${id}) by user ${user.userName}`);
  return deleted;
}

