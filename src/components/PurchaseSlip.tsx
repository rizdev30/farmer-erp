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

      <div className="relative w-full max-w-md modal-spring my-4 md:my-8">
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

            {/* Watermark for anti-copy */}
            <div className="absolute inset-0 flex flex-col items-center justify-evenly pointer-events-none z-0 overflow-hidden opacity-30 print:opacity-[0.15]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="transform -rotate-45 text-4xl sm:text-6xl print:text-[24px] font-black tracking-widest whitespace-nowrap text-amber-200 print:text-black">
                  UNOFFICIAL SLIP
                </div>
              ))}
            </div>

            {/* Official Header */}
            <div className="text-center mb-5 pb-4 border-b-2 border-slate-800 print:border-black relative z-10">
              <h2 className="text-xl font-black uppercase tracking-widest text-forest-900 print:text-black">Purchase Slip</h2>
              <p className="text-sm font-semibold text-slate-500 print:text-black mt-1">FARMER ERP PVT. LTD.</p>
              <p className="text-[10px] font-bold mt-1 text-amber-600 print:text-black">⏳ Approval is Pending</p>
            </div>

            {/* Slip Info */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200 print:border-black relative z-10">
              <div className="max-w-[50%]">
                <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">Slip No.</span>
                <span className="block text-sm font-mono font-bold text-slate-800 print:text-black break-words">{firstReceipt.slipId}</span>
              </div>
              <div className="text-right max-w-[50%]">
                <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">Date & Time</span>
                <span className="block text-xs font-medium text-slate-700 print:text-black">{formattedDate}</span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3.5 relative z-10">

              {/* Project & Mandi */}
              <div className="flex justify-between pb-3 border-b border-slate-100 print:border-black/20">
                <div>
                  <span className="block text-[10px] text-slate-400 print:text-black">Project Name</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">—</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 print:text-black">Mandi</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{firstReceipt.village || "—"}</span>
                </div>
              </div>

              {/* Farmer / Trader Section */}
              {firstReceipt.category === "TRADER" ? (
                <div className="pb-3 border-b border-slate-100 print:border-black/20">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 print:text-black">Trader Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Trader Code</span>
                      <span className="text-xs font-mono font-bold text-blue-700 print:text-black">{firstReceipt.farmerCode || "N/A"}</span>
                    </div>
                    {firstReceipt.company && (
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400 print:text-black">Company</span>
                        <span className="text-xs font-semibold text-slate-800 print:text-black">{firstReceipt.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Promoter Name</span>
                      <span className="text-xs font-semibold text-slate-800 print:text-black">{firstReceipt.promoterName || firstReceipt.farmerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Address</span>
                      <span className="text-xs font-medium text-slate-700 print:text-black text-right max-w-[55%]">{firstReceipt.village || "N/A"}</span>
                    </div>
                    {firstReceipt.panGst && (
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400 print:text-black">PAN/GST</span>
                        <span className="text-xs font-medium text-slate-700 print:text-black">{firstReceipt.panGst}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pb-3 border-b border-slate-100 print:border-black/20">
                  <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2 print:text-black">Farmer Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Farmer Code</span>
                      <span className="text-xs font-mono font-bold text-forest-700 print:text-black">{firstReceipt.farmerCode || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Name</span>
                      <span className="text-xs font-semibold text-slate-800 print:text-black">{firstReceipt.farmerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Father Name</span>
                      <span className="text-xs font-medium text-slate-700 print:text-black">{firstReceipt.fatherName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Address</span>
                      <span className="text-xs font-medium text-slate-700 print:text-black text-right max-w-[55%]">{firstReceipt.village || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="pb-3 border-b border-slate-100 print:border-black/20">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Adtiya Name</span>
                    <span className="text-xs font-semibold text-slate-800 print:text-black">{firstReceipt.adtiyaName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Lot No.</span>
                    <span className="text-xs font-semibold text-slate-800 print:text-black">{firstReceipt.lotNo || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              {receipts.map((receipt, index) => (
                <div key={index} className="pb-3 border-b border-slate-100 print:border-black/20 mt-4">
                  <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2 print:text-black">
                    {receipts.length > 1 ? `Transaction ${index + 1}` : "Transaction Details"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Crop</span>
                      <span className="font-bold text-slate-800 print:text-black">{receipt.crop}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Variety</span>
                      <span className="font-bold text-slate-700 print:text-black">{receipt.variety || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">No. of Bags</span>
                      <span className="font-bold text-slate-800 print:text-black">{receipt.bags.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Packing Unit</span>
                      <span className="font-bold text-slate-700 print:text-black">{receipt.packingSize} kg</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Weight Qtl.</span>
                      <span className="font-bold text-slate-800 print:text-black">{receipt.grossQuantity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">RATE/Qtl.</span>
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{receipt.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Deduction/Qtl (in kg)</span>
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{receipt.deduction}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 print:text-black">Bones/Qtl</span>
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{receipt.bones.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Item subtotal */}
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-100 print:border-black/20 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium print:text-black">Total Amount</span>
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{(receipt.grossQuantity * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium print:text-black">Total Bones</span>
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{(receipt.grossQuantity * receipt.bones).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-600 print:text-black">
                      <span className="font-medium">Total Deduction</span>
                      <span className="font-bold whitespace-nowrap">- {((receipt.grossQuantity * receipt.deduction / 100) * receipt.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand Total Payout */}
              <div className="bg-forest-50 rounded-xl p-3 mb-4 text-center border border-forest-100 print:bg-transparent print:border-black">
                <p className="text-[10px] text-forest-600 font-bold uppercase tracking-wider mb-1 print:text-black">Total Payout</p>
                <p className="text-lg sm:text-xl print:text-[14px] font-black text-forest-800 print:text-black tracking-tighter whitespace-nowrap">
                  ₹{(grandTotal + grandBones).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="h-px bg-slate-100 print:bg-black mb-3" />

              {/* Purchase / Approved By */}
              <div className="flex justify-between mb-3 pb-3 border-b border-slate-100 print:border-black/20">
                <div>
                  <span className="block text-[10px] text-slate-400 print:text-black">Purchase by</span>
                  <span className="block text-xs font-bold text-slate-800 print:text-black">{firstReceipt.agentName || "Agent"}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 print:text-black">Approved by</span>
                  <span className="block text-xs font-bold text-slate-700 print:text-black">Pending</span>
                </div>
              </div>

              {/* Farmer Signature */}
              <div className="pt-1 pb-3 border-b border-slate-100 print:border-black/20">
                <span className="text-[10px] text-slate-400 print:text-black">{firstReceipt.category === "TRADER" ? "Trader Signature" : "Farmer Signature"}</span>
                <div className="h-8 border-b border-dotted border-slate-300 mt-1 print:border-black"></div>
              </div>

              {/* Caption */}
              <div className="mt-2 text-center">
                <p className="text-[10px] text-amber-600 print:text-black font-semibold mb-2 max-w-sm mx-auto leading-tight">
                  * This slip is going for approval. This is not an official receipt.
                </p>
              </div>

              {/* Timestamp */}
              <div className="text-center mt-3">
                <p id="timestamp-text" className="text-[10px] text-slate-400 print:text-black font-mono">
                  Downloaded / Printed on: {currentTime}
                </p>
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
