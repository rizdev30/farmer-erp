"use client";

import { ProcurementReceipt } from "@/app/actions/procurement";
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  Sprout,
} from "lucide-react";

interface Props {
  receipt: ProcurementReceipt;
  onClose: () => void;
}

export default function PurchaseSlip({ receipt, onClose }: Props) {
  const formattedDate = new Date(receipt.timestamp).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  function handleWhatsApp() {
    const text = encodeURIComponent(
      `🌾 *FARMER ERP PVT. LTD. — Purchase Slip*\n` +
        `----------------------------------------\n` +
        `📋 Slip ID: ${receipt.slipId}\n` +
        `📅 Date: ${formattedDate}\n` +
        `👨‍💼 Agent: ${receipt.agentName || "Agent"}\n\n` +
        `*FARMER DETAILS*\n` +
        `👤 Name: ${receipt.farmerName}\n` +
        `👨‍👦 Father: ${receipt.fatherName || "N/A"}\n` +
        `🆔 Code: ${receipt.farmerCode || "N/A"}\n` +
        `📍 Village: ${receipt.village || "N/A"}\n\n` +
        `*CROP DETAILS*\n` +
        `🌾 Crop: ${receipt.crop}\n` +
        `🏷️ Variety: ${receipt.variety || "N/A"}\n` +
        `📦 Bags: ${receipt.bags || 0}\n\n` +
        `*PAYMENT CALCULATION*\n` +
        `⚖️ Gross Qty: ${receipt.grossQuantity} Qtl\n` +
        `➖ Deduction: ${receipt.deduction} Qtl\n` +
        `✅ Net Qty: ${receipt.netQuantity} Qtl\n` +
        `💰 Rate: ₹${receipt.rate.toLocaleString("en-IN")}/Qtl\n\n` +
        `💵 *TOTAL PAYOUT: ₹${receipt.total.toLocaleString("en-IN")}*\n` +
        `----------------------------------------`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handlePrint() {
    const originalTitle = document.title;
    document.title = `Receipt_${receipt.farmerName.replace(/\s+/g, "_")}_${receipt.slipId}`;
    window.print();
    document.title = originalTitle;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md modal-spring">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden print:shadow-none print:w-full print:max-w-full">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-forest-800 to-forest-700 px-6 py-5 text-center print:hidden">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-forest-200" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Purchase Successful!
            </h2>
          </div>

          {/* Print-only Banner */}
          <div className="hidden print:block border-b-2 border-black pb-4 mt-6 text-center">
             <h2 className="text-xl font-bold uppercase tracking-widest">FARMER ERP PVT. LTD.</h2>
             <p className="text-sm">Official Purchase Slip</p>
          </div>

          {/* Slip Content */}
          <div className="px-6 py-6 relative" id="purchase-slip">
            {/* Watermark for anti-copy */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-30 print:opacity-[0.15]">
              <div className="transform -rotate-45 text-4xl sm:text-6xl font-black text-slate-300 tracking-widest whitespace-nowrap">
                OFFICIAL RECEIPT
              </div>
            </div>

            {/* Slip ID */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200 print:border-black relative z-10">
              <div className="relative z-10">
              <span className="text-sm font-bold text-forest-800 block print:hidden">
                FARMER ERP PVT. LTD.
              </span>
              <span className="text-xs text-slate-500 font-medium print:text-black">
                Authorized Agent: {receipt.agentName || "Agent"}
              </span>
            </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 print:text-black">Slip ID</p>
                <p className="text-sm font-mono font-bold text-slate-800 print:text-black">
                  {receipt.slipId}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 print:text-black">Date & Time</span>
                <span className="text-xs font-medium text-slate-700 print:text-black">
                  {formattedDate}
                </span>
              </div>

              {/* Farmer Section */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2 print:text-black">Farmer Details</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                  <div>
                    <span className="block text-[10px] text-slate-400 print:text-black">Name</span>
                    <span className="block text-xs font-semibold text-slate-800 print:text-black">{receipt.farmerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 print:text-black">Father</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">{receipt.fatherName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 print:text-black">Code</span>
                    <span className="block text-xs font-mono font-medium text-slate-700 print:text-black">{receipt.farmerCode || "N/A"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 print:text-black">Phone</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">See Details</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-50 pt-2 print:border-black/10 mt-1">
                    <span className="block text-[10px] text-slate-400 print:text-black">Location</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">
                      {receipt.village || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 print:bg-black" />

              {/* Crop Section */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2 print:text-black">Crop Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] text-slate-400 print:text-black">Crop</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">{receipt.crop}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-400 print:text-black">Variety</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">{receipt.variety || "-"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 print:text-black">Bags</span>
                    <span className="block text-xs font-medium text-slate-700 print:text-black">{receipt.bags || 0}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 print:bg-black" />

              {/* Math Section */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 print:text-black">Gross Quantity</span>
                  <span className="font-semibold text-slate-800 print:text-black">
                    {receipt.grossQuantity} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-red-600 print:text-black">
                  <span className="opacity-80">Less: Deduction</span>
                  <span className="font-medium">
                    - {receipt.deduction} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 print:border-black">
                  <span className="text-slate-500 font-medium print:text-black">Net Quantity</span>
                  <span className="font-bold text-slate-800 print:text-black">
                    {receipt.netQuantity} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 print:text-black">Rate</span>
                  <span className="font-medium text-slate-700 print:text-black">
                    ₹{receipt.rate.toLocaleString("en-IN")} / Qtl
                  </span>
                </div>
              </div>

              <div className="h-[2px] border-b-2 border-dashed border-slate-200 mt-3 mb-2 print:border-black" />

              {/* Total */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-semibold text-slate-700 print:text-black">
                  Total Payout
                </span>
                <span className="text-2xl font-bold text-forest-700 print:text-black">
                  ₹{receipt.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3 print:hidden">
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-green-600 text-white text-sm font-semibold 
                hover:bg-green-700 transition-colors shadow-sm"
            >
              <Share2 size={16} />
              WhatsApp
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                border border-slate-200 text-slate-700 text-sm font-semibold 
                hover:bg-slate-50 transition-colors"
            >
              <Download size={16} />
              Print / PDF
            </button>

            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl text-slate-400 hover:text-slate-600 
                hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          /* Hide sidebar or other global layouts if needed */
          #sidebar { display: none !important; }
        }
      `}} />
    </div>
  );
}
