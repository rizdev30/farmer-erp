/**
 * Web Bluetooth ESC/POS Thermal Receipt Printing Utility (58mm / 32 Columns)
 */

interface ReceiptPrintData {
  slipId: string;
  createdAt?: string | Date;
  dateStr?: string;
  farmerName: string;
  fatherName?: string;
  farmerCode?: string;
  village?: string;
  town?: string;
  adtiyaName?: string;
  lotNo?: string;
  crop?: string;
  variety?: string;
  bags?: number;
  packingUnit?: string;
  grossQuantity?: number;
  deduction?: number;
  netQuantity?: number;
  rate?: number;
  total?: number;
  status?: string;
  agentName?: string;
  l2ApproverName?: string;
  l3ApproverName?: string;
}

// Global cached bluetooth device & characteristic
let cachedCharacteristic: any = null;

/**
 * Format two strings into a 32-column fixed-width line for 58mm paper
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
 * Convert text into ESC/POS Command Uint8Array
 */
function buildEscPosBuffer(data: ReceiptPrintData): Uint8Array {
  const encoder = new TextEncoder();
  const parts: number[] = [];

  // Helper push function
  const pushBytes = (bytes: number[]) => parts.push(...bytes);
  const pushText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      parts.push(encoded[i]);
    }
  };

  // ESC @: Initialize printer
  pushBytes([0x1b, 0x40]);

  // Center align
  pushBytes([0x1b, 0x61, 0x01]);

  // Bold & Double Height Title: PURCHASE SLIP
  pushBytes([0x1b, 0x45, 0x01]); // Bold ON
  pushBytes([0x1d, 0x21, 0x11]); // Double height & width
  pushText("PURCHASE SLIP\n");

  // Normal size
  pushBytes([0x1d, 0x21, 0x00]);
  pushText("FARMER ERP PVT. LTD.\n");

  const isApproved = data.status === "APPROVED";
  pushText(isApproved ? "Official Receipt\n" : "UNOFFICIAL SLIP\n");
  pushBytes([0x1b, 0x45, 0x00]); // Bold OFF

  pushText("--------------------------------\n");

  // Left align for details
  pushBytes([0x1b, 0x61, 0x00]);

  const dateVal = data.dateStr || (data.createdAt ? new Date(data.createdAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN"));

  pushText(formatLine("SLIP NO.", data.slipId || "-") + "\n");
  pushText(formatLine("DATE & TIME", dateVal) + "\n");
  pushText(formatLine("Project Name", "Mandi") + "\n");

  pushText("--------------------------------\n");

  pushBytes([0x1b, 0x45, 0x01]);
  pushText("FARMER DETAILS\n");
  pushBytes([0x1b, 0x45, 0x00]);

  if (data.farmerCode) pushText(formatLine("Farmer Code", data.farmerCode) + "\n");
  pushText(formatLine("Name", data.farmerName || "-") + "\n");
  if (data.fatherName) pushText(formatLine("Father Name", data.fatherName) + "\n");
  if (data.village || data.town) pushText(formatLine("Address", data.village || data.town || "-") + "\n");
  if (data.adtiyaName) pushText(formatLine("Adtiya Name", data.adtiyaName) + "\n");

  pushText("--------------------------------\n");

  pushBytes([0x1b, 0x45, 0x01]);
  pushText("TRANSACTION DETAILS\n");
  pushBytes([0x1b, 0x45, 0x00]);

  if (data.crop) pushText(formatLine("Crop", data.crop) + "\n");
  if (data.variety) pushText(formatLine("Variety", data.variety) + "\n");
  if (data.bags) pushText(formatLine("No. of Bags", String(data.bags)) + "\n");
  if (data.packingUnit) pushText(formatLine("Packing Unit", data.packingUnit) + "\n");
  if (data.netQuantity) pushText(formatLine("Weight Qtl.", Number(data.netQuantity).toFixed(2)) + "\n");
  if (data.rate) pushText(formatLine("RATE/Qtl.", Number(data.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })) + "\n");

  const totalVal = data.total ?? 0;
  pushText(formatLine("Total Amount", Number(totalVal).toLocaleString("en-IN", { minimumFractionDigits: 2 })) + "\n");

  pushText("================================\n");

  // Center align & Bold for Total Payout
  pushBytes([0x1b, 0x61, 0x01]);
  pushBytes([0x1b, 0x45, 0x01]);
  pushText("TOTAL PAYOUT\n");
  pushBytes([0x1d, 0x21, 0x11]); // Double size
  pushText(`Rs. ${Number(totalVal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n`);
  pushBytes([0x1d, 0x21, 0x00]);
  pushBytes([0x1b, 0x45, 0x00]);

  pushText("================================\n");

  pushBytes([0x1b, 0x61, 0x00]);
  const agentStr = data.agentName || "Admin";
  const approverStr = data.l3ApproverName || data.l2ApproverName || "Rishabh Dwivedi";

  pushText(formatLine("Purchase by", "Approved by") + "\n");
  pushBytes([0x1b, 0x45, 0x01]);
  pushText(formatLine(agentStr, approverStr) + "\n");
  pushBytes([0x1b, 0x45, 0x00]);

  pushText("\n\nFarmer Signature\n\n");
  pushText("--------------------------------\n");

  // Feed 4 lines and cut paper
  pushBytes([0x0a, 0x0a, 0x0a, 0x0a]);
  pushBytes([0x1d, 0x56, 0x41, 0x03]);

  return new Uint8Array(parts);
}

/**
 * Connect to Web Bluetooth Printer & Print ESC/POS Buffer
 */
export async function printViaWebBluetooth(data: ReceiptPrintData): Promise<boolean> {
  if (typeof window === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth is not supported in this browser. Please use Chrome/Edge on PC or Android.");
  }

  const buffer = buildEscPosBuffer(data);

  let characteristic = cachedCharacteristic;

  if (!characteristic || !characteristic.service?.device?.gatt?.connected) {
    // Request Bluetooth Device (Service UUIDs common to thermal printers)
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

  // Send data in chunks of 512 bytes for reliable Bluetooth transmission
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
