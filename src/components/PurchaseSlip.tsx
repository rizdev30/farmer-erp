"use client";

import { useState, useEffect } from "react";
import { ProcurementReceipt } from "@/app/actions/procurement";
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  Sprout,
  Loader2,
  FileText,
  Printer
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Narrow the type to the success case of the ProcurementReceipt union
type SuccessReceipt = Extract<ProcurementReceipt, { success: true }>;

interface Props {
  receipts: SuccessReceipt[];
  onClose: () => void;
}

export default function PurchaseSlip({ receipts, onClose }: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const userRoles = (session?.user as any)?.roles || [];
  const canMakePO = userRoles.includes("L3_PO_MAKER") || userRoles.includes("L4_ADMIN") || (session?.user as any)?.isSuperAdmin;

  // Computed immediately on render
  const currentTime = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const firstReceipt = receipts[0];
  const formattedDate = new Date(firstReceipt.timestamp).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const formattedDateShort = new Date(firstReceipt.timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Calculate grand totals
  const grandTotal = receipts.reduce((sum, r) => sum + r.total, 0);
  const grandBones = receipts.reduce((sum, r) => sum + (r.bones * r.grossQuantity), 0);

  async function handleWhatsApp() {
    setIsSharing(true);
    try {
      // Update the timestamp right before snapshot
      const el = document.getElementById("timestamp-text");
      if (el) {
        el.innerText = `Downloaded / Printed on: ${new Date().toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })}`;
      }

      const { default: html2canvas } = await import("html2canvas");
      const element = document.getElementById("purchase-slip");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `Receipt_${firstReceipt.slipId}.jpg`, {
          type: "image/jpeg",
        });

        const shareData = {
          files: [file],
          title: "Purchase Receipt",
          text: `Farmer ERP Receipt - ${firstReceipt.slipId}`,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          alert("Your device doesn't support direct WhatsApp image sharing. The receipt has been downloaded as an image so you can send it manually.");
        }
      }, "image/jpeg", 0.9);
    } catch (err) {
      console.error("Error generating receipt image:", err);
      alert("Failed to generate receipt image.");
    } finally {
      setIsSharing(false);
    }
  }

  function handlePrint() {
    // Update the timestamp right before printing
    const el = document.getElementById("timestamp-text");
    if (el) {
      el.innerText = `Downloaded / Printed on: ${new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    }

    const originalTitle = document.title;
    document.title = `Receipt_${firstReceipt.farmerName.replace(/\s+/g, "_")}_${firstReceipt.slipId}`;
    window.print();
    document.title = originalTitle;
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-center p-4 sm:p-6 overflow-y-auto items-start md:items-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md modal-spring my-auto">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden print:shadow-none print:w-full print:max-w-full print:rounded-none">
          {/* Success Banner - Hidden on print */}
          <div className="bg-gradient-to-r from-forest-800 to-forest-700 px-6 py-5 text-center print:hidden">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-forest-200" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Purchase Successful!
            </h2>
          </div>

          {/* ========================================= */}
          {/* SLIP CONTENT — Colored on screen */}
          {/* ========================================= */}
          <div className="px-6 py-6 relative bg-white print:px-2 print:py-2" id="purchase-slip">

            {/* ======= ON-SCREEN COLORED VERSION ======= */}
            <div className="print:hidden">
              {/* Header */}
              <div className="text-center mb-5 pb-4 border-b-2 border-slate-800">
                <h2 className="text-xl font-black uppercase tracking-widest text-forest-900">Purchase Slip</h2>
                <p className="text-sm font-semibold text-slate-500 mt-1">FARMER ERP PVT. LTD.</p>
              </div>

              {/* Slip Info */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Slip No.</span>
                  <span className="block text-sm font-mono font-bold text-slate-800">{firstReceipt.slipId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Date & Time</span>
                  <span className="block text-xs font-medium text-slate-700">{formattedDate}</span>
                </div>
              </div>

              {/* Project & Mandi */}
              <div className="flex justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400">Project Name</span>
                  <span className="block text-xs font-medium text-slate-700">—</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Mandi</span>
                  <span className="block text-xs font-medium text-slate-700">{firstReceipt.village || "—"}</span>
                </div>
              </div>

              {/* Farmer / Trader Section */}
              {firstReceipt.category === "TRADER" ? (
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Trader Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Trader Code</span>
                      <span className="text-xs font-mono font-bold text-blue-700">{firstReceipt.farmerCode || "N/A"}</span>
                    </div>
                    {firstReceipt.company && (
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400">Company</span>
                        <span className="text-xs font-semibold text-slate-800">{firstReceipt.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Promoter Name</span>
                      <span className="text-xs font-semibold text-slate-800">{firstReceipt.promoterName || firstReceipt.farmerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Address</span>
                      <span className="text-xs font-medium text-slate-700 text-right max-w-[55%]">{firstReceipt.village || "N/A"}</span>
                    </div>
                    {firstReceipt.panGst && (
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400">PAN/GST</span>
                        <span className="text-xs font-medium text-slate-700">{firstReceipt.panGst}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2">Farmer Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Farmer Code</span>
                      <span className="text-xs font-mono font-bold text-forest-700">{firstReceipt.farmerCode || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Name</span>
                      <span className="text-xs font-semibold text-slate-800">{firstReceipt.farmerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Father Name</span>
                      <span className="text-xs font-medium text-slate-700">{firstReceipt.fatherName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Address</span>
                      <span className="text-xs font-medium text-slate-700 text-right max-w-[55%]">{firstReceipt.village || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="mb-4 pb-3 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Adtiya Name</span>
                    <span className="text-xs font-semibold text-slate-800">{firstReceipt.adtiyaName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Lot No.</span>
                    <span className="text-xs font-semibold text-slate-800">{firstReceipt.lotNo || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              {receipts.map((receipt, index) => (
                <div key={index} className="mb-4 pb-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2">
                    {receipts.length > 1 ? `Transaction ${index + 1}` : "Transaction Details"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Crop</span>
                      <span className="text-xs font-bold text-slate-800">{receipt.crop}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Variety</span>
                      <span className="text-xs font-bold text-slate-700">{receipt.variety || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">No. of Bags</span>
                      <span className="text-xs font-bold text-slate-800">{receipt.bags.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Packing Unit</span>
                      <span className="text-xs font-bold text-slate-700">{receipt.packingSize} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Weight Qtl.</span>
                      <span className="text-xs font-bold text-slate-800">{receipt.grossQuantity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">RATE/Qtl.</span>
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{receipt.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Deduction/Qtl (in kg)</span>
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{receipt.deduction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Bones/Qtl</span>
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{receipt.bones.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Item subtotal */}
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Total Amount</span>
                      <span className="font-bold text-slate-800 whitespace-nowrap">{(receipt.grossQuantity * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Total Bones</span>
                      <span className="font-bold text-slate-800 whitespace-nowrap">{(receipt.grossQuantity * receipt.bones).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-600">
                      <span className="font-medium">Total Deduction</span>
                      <span className="font-bold whitespace-nowrap">- {((receipt.grossQuantity * receipt.deduction / 100) * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand Total Payout */}
              <div className="bg-forest-50 rounded-xl p-4 mb-4 text-center border border-forest-100">
                <p className="text-[10px] text-forest-600 font-bold uppercase tracking-wider mb-1">Total Payout</p>
                <p className="text-lg sm:text-xl print:text-[14px] font-black text-forest-800 print:text-black tracking-tighter whitespace-nowrap">
                  ₹{(grandTotal + grandBones).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Purchase / Approved By */}
              <div className="flex justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400">Purchase by</span>
                  <span className="block text-xs font-bold text-slate-800">{firstReceipt.agentName || "Agent"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Approved by</span>
                  <span className="block text-xs font-bold text-slate-700">Pending</span>
                </div>
              </div>

              {/* Farmer Signature */}
              <div className="pt-1 pb-3 border-b border-slate-100">
                <span className="text-[10px] text-slate-400">{firstReceipt.category === "TRADER" ? "Trader Signature" : "Farmer Signature"}</span>
                <div className="h-8 border-b border-dotted border-slate-300 mt-1"></div>
              </div>

              {/* Note */}
              <div className="mb-2">
                <span className="text-[10px] text-slate-400">Note:</span>
                <p className="text-[10px] text-amber-600 font-semibold mt-1 leading-tight">
                  * This slip is going for approval. This is not an official receipt. Official receipt will be available after final approval.
                </p>
              </div>

              {/* Timestamp */}
              <div className="text-center mt-3">
                <p id="timestamp-text" className="text-[10px] text-slate-400 font-mono">
                  Downloaded / Printed on: {currentTime}
                </p>
              </div>
            </div>

            {/* ======= PRINT-ONLY: 2-inch THERMAL RECEIPT FORMAT ======= */}
            <div className="hidden print:block" style={{ width: '48mm', fontFamily: 'monospace, Courier, "Courier New"', fontSize: '10px', lineHeight: '1.35', color: '#000' }}>

              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
                <div style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '1px' }}>Purchase Slip</div>
                <div style={{ fontSize: '9px', fontWeight: 700 }}>FARMER ERP PVT. LTD.</div>
              </div>

              {/* Slip & Date */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                <div><strong>Slip No.:</strong> {firstReceipt.slipId}</div>
                <div>Date & Time: {formattedDateShort}</div>
              </div>

              {/* Project & Mandi */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                <div>Project Name: —</div>
                <div>Mandi: {firstReceipt.village || "—"}</div>
              </div>

              {/* Farmer / Trader */}
              {firstReceipt.category === "TRADER" ? (
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                  <div><strong>Trader Code: {firstReceipt.farmerCode || "N/A"}</strong></div>
                  {firstReceipt.company && <div><strong>Company:</strong> {firstReceipt.company}</div>}
                  <div><strong>Promoter Name:</strong> {firstReceipt.promoterName || firstReceipt.farmerName}</div>
                  <div><strong>Address:</strong> {firstReceipt.village || "N/A"}</div>
                  {firstReceipt.panGst && <div>PAN/GST: {firstReceipt.panGst}</div>}
                </div>
              ) : (
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                  <div><strong>Farmer Code: {firstReceipt.farmerCode || "N/A"}</strong></div>
                  <div><strong>Name:</strong> {firstReceipt.farmerName}</div>
                  <div><strong>Father</strong> Name: {firstReceipt.fatherName || "N/A"}</div>
                  <div><strong>Address:</strong> {firstReceipt.village || "N/A"}</div>
                </div>
              )}

              {/* Additional Details */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                <div>Adtiya Name: <strong>{firstReceipt.adtiyaName || "—"}</strong></div>
                <div>Lot No.: <strong>{firstReceipt.lotNo || "—"}</strong></div>
              </div>

              {/* Transaction Details */}
              {receipts.map((receipt, index) => (
                <div key={index} style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                  <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', marginBottom: '2px' }}>
                    {receipts.length > 1 ? `Transaction ${index + 1}:` : "Transaction Details:"}
                  </div>
                  <div>Crop: <strong>{receipt.crop}</strong></div>
                  <div>Variety: <strong>{receipt.variety || "—"}</strong></div>
                  <div>No. of Bags: <strong>{receipt.bags.toLocaleString("en-IN")}</strong></div>
                  <div>Packing Unit: <strong>{receipt.packingSize} kg</strong></div>
                  <div>Weight Qtl.: <strong>{receipt.grossQuantity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                  <div>RATE/Qtl.: <strong>{receipt.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                  <div>Deduction/Qtl (in kg): <strong>{receipt.deduction}</strong></div>
                  <div>Bones/Qtl: <strong>{receipt.bones.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                  <div style={{ borderTop: '1px dotted #000', marginTop: '2px', paddingTop: '2px' }}>
                    <div>Total Amount: <strong>{(receipt.grossQuantity * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                    <div>Total Bones: <strong>{(receipt.bones * receipt.grossQuantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                    <div>Total Deduction: <strong>-{((receipt.grossQuantity * receipt.deduction / 100) * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                  </div>
                </div>
              ))}

              {/* Total Payout */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '3px', paddingTop: '2px' }}>
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Total Payout:</div>
                <div style={{ fontWeight: 900, fontSize: '11px', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                  ₹{(grandTotal + grandBones).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Purchase / Approved By */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                <div>Purchase by: <strong>{firstReceipt.agentName || "Agent"}</strong></div>
                <div>Approved by: <strong>Pending</strong></div>
              </div>

              {/* Farmer Signature */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '3px', marginBottom: '3px' }}>
                <div>{firstReceipt.category === "TRADER" ? "Trader Signature" : "Farmer Signature"}:</div>
                <div style={{ height: '20px', borderBottom: '1px dotted #000', marginTop: '2px' }}></div>
              </div>

              {/* Note */}
              <div style={{ fontSize: '8px', textAlign: 'center', paddingTop: '2px' }}>
                <div>Note:</div>
                <div>This slip is going for</div>
                <div>approval. Not an official</div>
                <div>receipt.</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3 print:hidden">
            <button
              onClick={handleWhatsApp}
              disabled={isSharing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-green-600 text-white text-sm font-semibold 
                hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Share2 size={16} />
              )}
              {isSharing ? "Generating..." : "WhatsApp"}
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                border border-slate-200 text-slate-700 text-sm font-semibold 
                hover:bg-slate-50 transition-colors"
            >
              <Printer size={16} />
              Print Slip
            </button>

            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl text-slate-400 hover:text-slate-600 
                hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Make PO Button for L3/L4 users */}
          {canMakePO && (
            <div className="px-6 pb-6 print:hidden">
              <button
                onClick={() => router.push(`/dashboard/po-maker?slipId=${firstReceipt.slipId}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-forest-600 text-white text-sm font-semibold hover:bg-forest-700 transition-colors shadow-sm"
              >
                <FileText size={16} />
                Make a PO
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Print Styles: 2-inch thermal receipt */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: 58mm auto;
            margin: 2mm 3mm;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          #purchase-slip, #purchase-slip * {
            visibility: visible;
          }
          #purchase-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 52mm !important;
            padding: 1mm !important;
            margin: 0 !important;
            background: white !important;
          }
          /* Hide sidebar / nav / other global elements */
          #sidebar { display: none !important; }
        }
      `}} />
    </div>
  );
}
