"use server";

import dolibarr from "@/lib/dolibarr";

function generateSlipId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FE-${date}-${rand}`;
}

function roundQuintal(value: number): number {
  return Math.round(value * 100) / 100;
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
  grossQuantity: number; // in Quintals
  deduction: number; // in Quintals
  rate: number; // ₹ per Quintal
  agentName?: string;
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
  grossQuantity: number;
  deduction: number;
  netQuantity: number;
  rate: number;
  total: number;
  agentName?: string;
}

export async function createProcurement(
  data: ProcurementData
): Promise<ProcurementReceipt> {
  const grossQuantity = roundQuintal(data.grossQuantity);
  const deduction = roundQuintal(data.deduction || 0);
  const netQuantity = roundQuintal(grossQuantity - deduction);
  const rate = roundQuintal(data.rate);
  const total = roundQuintal(netQuantity * rate);
  const slipId = generateSlipId();

  // 1. Create Supplier Invoice in Dolibarr
  const invoiceId = await dolibarr.createSupplierInvoice({
    socid: data.farmerId,
    label: `Procurement: ${data.crop} (${data.variety}) - ${slipId}`,
    ref_supplier: slipId,
  });

  // 2. Add line item
  const desc = `${data.crop} (${data.variety}) procurement\nBags: ${data.bags}\nGross Qty: ${grossQuantity} Qtl\nDeduction: ${deduction} Qtl\nNet Qty: ${netQuantity} Qtl @ ₹${rate}/Qtl`;
  
  await dolibarr.addInvoiceLine(invoiceId, {
    label: data.crop,
    description: desc,
    qty: netQuantity,
    subprice: rate,
    tva_tx: 0,
  });

  // 3. Validate the invoice
  try {
    await dolibarr.validateInvoice(invoiceId);
  } catch {
    // Invoice created but validation may need manual approval
    console.warn("Invoice created but auto-validation skipped");
  }

  return {
    success: true,
    slipId,
    invoiceId,
    timestamp: new Date().toISOString(),
    farmerName: data.farmerName,
    fatherName: data.fatherName,
    farmerCode: data.farmerCode,
    village: data.village,
    agentName: data.agentName,
    crop: data.crop,
    variety: data.variety,
    bags: data.bags,
    grossQuantity,
    deduction,
    netQuantity,
    rate,
    total,
  };
}

export async function getProcurementHistory() {
  const invoices = await dolibarr.getSupplierInvoices({
    limit: "50",
    sortfield: "t.datec",
    sortorder: "DESC",
  });

  return invoices;
}
