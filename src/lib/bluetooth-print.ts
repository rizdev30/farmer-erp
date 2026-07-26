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
 * Clean string to pure 1-byte ASCII for thermal printer hardware compatibility.
 * Replaces Unicode symbols like em-dash, Rupee symbol, emojis to prevent printer buffer glitches.
 */
function cleanAscii(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/—|–/g, "-")          // Replace em-dash and en-dash with standard hyphen
    .replace(/₹/g, "Rs. ")          // Replace Rupee symbol with Rs.
    .replace(/⏳/g, "")             // Remove hourglass emoji
    .replace(/[^\x00-\x7F]/g, "");    // Strip any remaining non-ASCII Unicode characters
}

/**
 * Format two strings into a 32-column fixed-width line for 58mm paper (32 characters per line)
 */
function formatLine(left: string, right: string, width = 32): string {
  const leftStr = cleanAscii(left);
  const rightStr = cleanAscii(right);
  const totalLength = leftStr.length + rightStr.length;

  if (totalLength <= width) {
    const spaceLength = width - totalLength;
    return leftStr + " ".repeat(spaceLength) + rightStr;
  }

  // If combined length exceeds 32, trim right string safely to fit
  const availableRight = width - leftStr.length - 1;
  if (availableRight > 3) {
    return leftStr + " " + rightStr.substring(0, availableRight);
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
    const sanitized = cleanAscii(text);
    const encoded = encoder.encode(sanitized);
    for (let i = 0; i < encoded.length; i++) {
      parts.push(encoded[i]);
    }
  };

  // Helper to print a line with regular label and bold value matching Direct Print typography
  const pushLine = (left: string, right: string, boldValue = true) => {
    const leftStr = cleanAscii(left);
    const rightStr = cleanAscii(right);
    const totalLength = leftStr.length + rightStr.length;
    
    let spacesCount = 1;
    let finalRight = rightStr;

    if (totalLength <= 32) {
      spacesCount = 32 - totalLength;
    } else {
      const availRight = 32 - leftStr.length - 1;
      if (availRight > 3) {
        finalRight = rightStr.substring(0, availRight);
      } else {
        finalRight = rightStr.substring(0, 32 - leftStr.length);
      }
      spacesCount = 1;
    }

    // Label: Regular font weight (ESC E 0)
    pushBytes([0x1b, 0x45, 0x00]);
    pushText(leftStr + " ".repeat(spacesCount));
    
    // Value: Bold font weight (ESC E 1) matching Direct Print font hierarchy
    if (boldValue) {
      pushBytes([0x1b, 0x45, 0x01]);
    } else {
      pushBytes([0x1b, 0x45, 0x00]);
    }
    pushText(finalRight + "\n");
    pushBytes([0x1b, 0x45, 0x00]); // Reset Bold OFF
  };

  // ESC @: Initialize printer
  pushBytes([0x1b, 0x40]);

  // ESC M 0: Select Font A (Standard 12x24 Monospaced Font matching Courier)
  pushBytes([0x1b, 0x4d, 0x00]);

  // ESC 3 30: Set line spacing (30 dots ~ 1.2 line height)
  pushBytes([0x1b, 0x33, 0x1e]);

  // Center align
  pushBytes([0x1b, 0x61, 0x01]);

  // Header Title: PURCHASE SLIP (Bold ON + Double Height & Width matching 13.5pt)
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON
  pushBytes([0x1d, 0x21, 0x11]); // Double height & width
  pushText("PURCHASE SLIP\n");

  pushBytes([0x1d, 0x21, 0x00]); // Normal size
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

  let dateVal = "";
  if (data.createdAt) {
    const d = new Date(data.createdAt);
    const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    dateVal = `${datePart} ${timePart}`;
  } else if (data.dateStr) {
    dateVal = data.dateStr;
  } else {
    const d = new Date();
    const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    dateVal = `${datePart} ${timePart}`;
  }

  pushLine("Slip No.", data.slipId || "-", true);
  pushLine("Date & Time", dateVal, true);
  pushLine("Project Name", "-", false);
  pushLine("Mandi", data.village || data.town || "-", true);

  pushText("--------------------------------\n");

  // Trader vs Farmer Details
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON for section title
  if (data.category === "TRADER") {
    pushText("TRADER DETAILS\n");
    pushBytes([0x1b, 0x45, 0x00]); // Bold OFF
    pushLine("Trader Code", data.farmerCode || "N/A", true);
    pushLine("Name", data.farmerName || "-", true);
    if (data.company) pushLine("Company", data.company, true);
    pushLine("Promoter Name", data.promoterName || data.farmerName || "-", true);
    pushLine("Address", data.village || data.town || "N/A", true);
    if (data.panGst) pushLine("PAN/GST", data.panGst, true);
  } else {
    pushText("FARMER DETAILS\n");
    pushBytes([0x1b, 0x45, 0x00]); // Bold OFF
    pushLine("Farmer Code", data.farmerCode || "N/A", true);
    pushLine("Name", data.farmerName || "-", true);
    pushLine("Father Name", data.fatherName || "N/A", true);
    pushLine("Address", data.village || data.town || "N/A", true);
  }

  pushText("--------------------------------\n");

  // Additional Details
  pushLine("Adtiya Name", data.adtiyaName || "-", true);
  pushLine("Lot No.", data.lotNo || "-", true);

  pushText("--------------------------------\n");

  // Transaction Items Loop & Grand Totals
  let grandTotal = 0;
  let grandBones = 0;

  const items = data.items && data.items.length > 0 ? data.items : [];

  items.forEach((item, index) => {
    pushBytes([0x1b, 0x45, 0x01]); // Bold ON for section title
    const sectionTitle = items.length > 1 ? `TRANSACTION ${index + 1}` : "TRANSACTION DETAILS";
    pushText(`${sectionTitle}\n`);
    pushBytes([0x1b, 0x45, 0x00]); // Bold OFF

    if (item.crop) pushLine("Crop", item.crop, true);
    pushLine("Variety", item.variety || "-", true);
    pushLine("No. of Bags", Number(item.bags || 0).toLocaleString("en-IN"), true);
    
    const packingStr = item.packingSize ? `${item.packingSize} kg` : (item.packingUnit || "-");
    pushLine("Packing Unit", packingStr, true);

    const gross = item.grossQuantity || 0;
    pushLine("Weight Qtl.", fmtCurrency(gross), true);

    const rateVal = item.rate || 0;
    pushLine("RATE/Qtl.", fmtCurrency(rateVal), true);

    const dedVal = item.deduction || 0;
    pushLine("Deduction/Qtl (in kg)", String(dedVal), true);

    const bonesVal = item.bones || 0;
    pushLine("Bones/Qtl", fmtCurrency(bonesVal), true);

    // Math Subtotals per Item
    const deductionWeightQtl = (gross * dedVal) / 100;
    const netQty = gross - deductionWeightQtl;
    const totalAmt = item.total !== undefined ? item.total : (netQty * rateVal);
    const bonesAmt = gross * bonesVal;
    const dedAmt = deductionWeightQtl * rateVal;

    grandTotal += totalAmt;
    grandBones += bonesAmt;

    pushText(" - - - - - - - - - - - - - - - -\n");
    pushLine("Total Amount", fmtCurrency(gross * rateVal), true);
    pushLine("Total Bones", fmtCurrency(bonesAmt), true);
    pushLine("Total Deduction", `- ${fmtCurrency(dedAmt)}`, true);
    pushText("--------------------------------\n");
  });

  // Grand Total Payout
  const totalPayout = grandTotal + grandBones;

  pushBytes([0x1b, 0x61, 0x01]); // Center align
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON
  pushText("TOTAL PAYOUT\n");
  pushBytes([0x1d, 0x21, 0x11]); // Double height & width (12.5pt bold equivalent)
  pushText(`Rs. ${fmtCurrency(totalPayout)}\n`);
  pushBytes([0x1d, 0x21, 0x00]); // Reset size
  pushBytes([0x1b, 0x45, 0x00]); // Bold OFF

  pushText("================================\n");

  pushBytes([0x1b, 0x61, 0x00]); // Left align
  const agentStr = data.agentName || "Admin";
  const approverStr = data.l3ApproverName || data.l2ApproverName || (isApproved ? "Approved" : "Pending");

  pushLine("Purchase by", "Approved by", false);
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON for signatory names
  pushLine(agentStr, approverStr, true);
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
