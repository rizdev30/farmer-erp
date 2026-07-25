/**
 * Web Bluetooth ESC/POS Thermal Receipt Printing Utility (58mm / 32 Columns)
 */

export interface ReceiptItem {
  crop: string;
  variety?: string;
  bags: number;
  packingSize?: number;
  packingUnit?: string;
  grossQuantity: number;
  deduction: number;
  bones: number;
  rate: number;
  total?: number;
}

export interface ReceiptPrintData {
  slipId: string;
  createdAt?: string | Date;
  dateStr?: string;
  category?: string;
  farmerName: string;
  fatherName?: string;
  farmerCode?: string;
  company?: string;
  promoterName?: string;
  panGst?: string;
  village?: string;
  town?: string;
  adtiyaName?: string;
  lotNo?: string;
  status?: string;
  agentName?: string;
  l2ApproverName?: string;
  l3ApproverName?: string;
  items: ReceiptItem[];
}

// Global cached bluetooth device & characteristic
let cachedCharacteristic: any = null;

/**
 * Check if Bluetooth printer is already paired and GATT server connected
 */
export function isBluetoothConnected(): boolean {
  return Boolean(cachedCharacteristic && cachedCharacteristic.service?.device?.gatt?.connected);
}

/**
 * Format two strings into a 32-column fixed-width line for 58mm paper (32 characters per line)
 */
function formatLine(left: string, right: string, width = 32): string {
  const leftStr = String(left || "");
  const rightStr = String(right || "");
  const spaceLength = width - leftStr.length - rightStr.length;
  if (spaceLength > 0) {
    return leftStr + " ".repeat(spaceLength) + rightStr;
  }
  return (leftStr + " " + rightStr).substring(0, width);
}

/**
 * Format currency without symbol for ESC/POS
 */
function fmtCurrency(val: number): string {
  return Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Convert receipt print data into ESC/POS Command Uint8Array matching Direct Print 1:1 in font size, weights & formatting
 */
function buildEscPosBuffer(data: ReceiptPrintData): Uint8Array {
  const encoder = new TextEncoder();
  const parts: number[] = [];

  const pushBytes = (bytes: number[]) => parts.push(...bytes);
  const pushText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      parts.push(encoded[i]);
    }
  };

  // ESC @: Initialize printer
  pushBytes([0x1b, 0x40]);

  // ESC M 0: Select Font A (Standard 12x24 font matching ~10.5pt text)
  pushBytes([0x1b, 0x4d, 0x00]);

  // ESC 3 30: Set line spacing (30 dots ~ 1.2 line height)
  pushBytes([0x1b, 0x33, 0x1e]);

  // Center align
  pushBytes([0x1b, 0x61, 0x01]);

  // Header Title: PURCHASE SLIP (Bold ON + Double Height & Width matching 13.5pt)
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON
  pushBytes([0x1d, 0x21, 0x11]); // Double height & width
  pushText("PURCHASE SLIP\n");

  pushBytes([0x1d, 0x21, 0x00]); // Normal size (10.5pt equivalent)
  pushText("FARMER ERP PVT. LTD.\n");

  const isApproved = data.status === "APPROVED";
  if (isApproved) {
    pushText("Official Receipt\n");
  } else {
    pushText("Approval is Pending\n");
    pushText("UNOFFICIAL SLIP\n");
  }
  pushBytes([0x1b, 0x45, 0x00]); // Bold OFF

  pushText("--------------------------------\n");

  // Left align for receipt metadata
  pushBytes([0x1b, 0x61, 0x00]);

  const dateVal = data.dateStr || (data.createdAt ? new Date(data.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));

  pushText(formatLine("Slip No.", data.slipId || "-") + "\n");
  pushText(formatLine("Date & Time", dateVal) + "\n");
  pushText(formatLine("Project Name", "—") + "\n");
  pushText(formatLine("Mandi", data.village || data.town || "—") + "\n");

  pushText("--------------------------------\n");

  // Trader vs Farmer Details
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON for section title
  if (data.category === "TRADER") {
    pushText("TRADER DETAILS\n");
    pushBytes([0x1b, 0x45, 0x00]); // Bold OFF
    pushText(formatLine("Trader Code", data.farmerCode || "N/A") + "\n");
    pushText(formatLine("Name", data.farmerName || "-") + "\n");
    if (data.company) pushText(formatLine("Company", data.company) + "\n");
    pushText(formatLine("Promoter Name", data.promoterName || data.farmerName || "-") + "\n");
    pushText(formatLine("Address", data.village || data.town || "N/A") + "\n");
    if (data.panGst) pushText(formatLine("PAN/GST", data.panGst) + "\n");
  } else {
    pushText("FARMER DETAILS\n");
    pushBytes([0x1b, 0x45, 0x00]); // Bold OFF
    pushText(formatLine("Farmer Code", data.farmerCode || "N/A") + "\n");
    pushText(formatLine("Name", data.farmerName || "-") + "\n");
    pushText(formatLine("Father Name", data.fatherName || "N/A") + "\n");
    pushText(formatLine("Address", data.village || data.town || "N/A") + "\n");
  }

  pushText("--------------------------------\n");

  // Additional Details
  pushText(formatLine("Adtiya Name", data.adtiyaName || "—") + "\n");
  pushText(formatLine("Lot No.", data.lotNo || "—") + "\n");

  pushText("--------------------------------\n");

  // Transaction Items Loop & Grand Totals
  let grandTotal = 0;
  let grandBones = 0;

  const items = data.items && data.items.length > 0 ? data.items : [];

  items.forEach((item, index) => {
    pushBytes([0x1b, 0x45, 0x01]);
    const sectionTitle = items.length > 1 ? `TRANSACTION ${index + 1}` : "TRANSACTION DETAILS";
    pushText(`${sectionTitle}\n`);
    pushBytes([0x1b, 0x45, 0x00]);

    if (item.crop) pushText(formatLine("Crop", item.crop) + "\n");
    pushText(formatLine("Variety", item.variety || "—") + "\n");
    pushText(formatLine("No. of Bags", Number(item.bags || 0).toLocaleString("en-IN")) + "\n");
    
    const packingStr = item.packingSize ? `${item.packingSize} kg` : (item.packingUnit || "—");
    pushText(formatLine("Packing Unit", packingStr) + "\n");

    const gross = item.grossQuantity || 0;
    pushText(formatLine("Weight Qtl.", fmtCurrency(gross)) + "\n");

    const rateVal = item.rate || 0;
    pushText(formatLine("RATE/Qtl.", fmtCurrency(rateVal)) + "\n");

    const dedVal = item.deduction || 0;
    pushText(formatLine("Deduction/Qtl", `${dedVal} kg`) + "\n");

    const bonesVal = item.bones || 0;
    pushText(formatLine("Bones/Qtl", fmtCurrency(bonesVal)) + "\n");

    // Math Subtotals per Item
    const deductionWeightQtl = (gross * dedVal) / 100;
    const netQty = gross - deductionWeightQtl;
    const totalAmt = item.total !== undefined ? item.total : (netQty * rateVal);
    const bonesAmt = gross * bonesVal;
    const dedAmt = deductionWeightQtl * rateVal;

    grandTotal += totalAmt;
    grandBones += bonesAmt;

    pushText(" - - - - - - - - - - - - - - - -\n");
    pushText(formatLine("Total Amount", fmtCurrency(gross * rateVal)) + "\n");
    pushText(formatLine("Total Bones", fmtCurrency(bonesAmt)) + "\n");
    pushText(formatLine("Total Deduction", `- ${fmtCurrency(dedAmt)}`) + "\n");
    pushText("--------------------------------\n");
  });

  // Grand Total Payout
  const totalPayout = grandTotal + grandBones;

  pushBytes([0x1b, 0x61, 0x01]); // Center align
  pushBytes([0x1b, 0x45, 0x01]); // Bold
  pushText("TOTAL PAYOUT\n");
  pushBytes([0x1d, 0x21, 0x11]); // Double height & width (12.5pt bold equivalent)
  pushText(`Rs. ${fmtCurrency(totalPayout)}\n`);
  pushBytes([0x1d, 0x21, 0x00]); // Reset size
  pushBytes([0x1b, 0x45, 0x00]);

  pushText("================================\n");

  pushBytes([0x1b, 0x61, 0x00]); // Left align
  const agentStr = data.agentName || "Agent";
  const approverStr = data.l3ApproverName || data.l2ApproverName || (isApproved ? "Approved" : "Pending");

  pushText(formatLine("Purchase by", "Approved by") + "\n");
  pushBytes([0x1b, 0x45, 0x01]);
  pushText(formatLine(agentStr, approverStr) + "\n");
  pushBytes([0x1b, 0x45, 0x00]);

  pushText("\n" + (data.category === "TRADER" ? "Trader Signature" : "Farmer Signature") + "\n\n");
  pushText("--------------------------------\n");

  if (!isApproved) {
    pushText("* This slip is going for approval.\n  This is not an official receipt.\n");
    pushText("--------------------------------\n");
  }

  const printedOn = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  pushText(`Downloaded / Printed on:\n${printedOn}\n`);

  // Feed 4 lines and cut paper
  pushBytes([0x0a, 0x0a, 0x0a, 0x0a]);
  pushBytes([0x1d, 0x56, 0x41, 0x03]);

  return new Uint8Array(parts);
}

/**
 * Connect to Web Bluetooth Thermal Printer & Print ESC/POS Buffer
 */
export async function printViaWebBluetooth(data: ReceiptPrintData): Promise<boolean> {
  if (typeof window === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth is not supported in this browser. Please use Chrome/Edge on Android or Desktop.");
  }

  const buffer = buildEscPosBuffer(data);

  let characteristic = cachedCharacteristic;

  if (!characteristic || !characteristic.service?.device?.gatt?.connected) {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "00001101-0000-1000-8000-00805f9b34fb",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "49535343-fe7d-41a3-ac56-64b9e3543570",
      ],
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let writeChar = null;
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error("Could not find write characteristic on the selected Bluetooth printer.");
    }

    cachedCharacteristic = writeChar;
    characteristic = writeChar;
  }

  // Send data in chunks of 512 bytes
  const chunkSize = 512;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
  }

  return true;
}
