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
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md modal-spring">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-forest-800 to-forest-700 px-6 py-5 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-forest-200" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Purchase Successful!
            </h2>
            <p className="text-forest-200 text-sm mt-1">
              Transaction recorded in ERP
            </p>
          </div>

          {/* Slip Content */}
          <div className="px-6 py-6" id="purchase-slip">
            {/* Slip ID */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200">
              <div>
                <span className="text-sm font-bold text-forest-800 block">
                  FARMER ERP PVT. LTD.
                </span>
                <span className="text-xs text-slate-500">
                  Agent: {receipt.agentName || "Agent"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Slip ID</p>
                <p className="text-sm font-mono font-bold text-slate-800">
                  {receipt.slipId}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Date & Time</span>
                <span className="text-xs font-medium text-slate-700">
                  {formattedDate}
                </span>
              </div>

              {/* Farmer Section */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2">Farmer Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-slate-400">Name</span>
                    <span className="block text-xs font-semibold text-slate-800">{receipt.farmerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">Father</span>
                    <span className="block text-xs font-medium text-slate-700">{receipt.fatherName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Code</span>
                    <span className="block text-xs font-mono font-medium text-slate-700">{receipt.farmerCode || "N/A"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">Village</span>
                    <span className="block text-xs font-medium text-slate-700">{receipt.village || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Crop Section */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2">Crop Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] text-slate-400">Crop</span>
                    <span className="block text-xs font-medium text-slate-700">{receipt.crop}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-400">Variety</span>
                    <span className="block text-xs font-medium text-slate-700">{receipt.variety || "-"}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">Bags</span>
                    <span className="block text-xs font-medium text-slate-700">{receipt.bags || 0}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Math Section */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gross Quantity</span>
                  <span className="font-semibold text-slate-800">
                    {receipt.grossQuantity} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-red-600">
                  <span className="opacity-80">Less: Deduction</span>
                  <span className="font-medium">
                    - {receipt.deduction} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">Net Quantity</span>
                  <span className="font-bold text-slate-800">
                    {receipt.netQuantity} Qtl
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Rate</span>
                  <span className="font-medium text-slate-700">
                    ₹{receipt.rate.toLocaleString("en-IN")} / Qtl
                  </span>
                </div>
              </div>

              <div className="h-[2px] border-b-2 border-dashed border-slate-200 mt-3 mb-2" />

              {/* Total */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-semibold text-slate-700">
                  Total Payout
                </span>
                <span className="text-2xl font-bold text-forest-700">
                  ₹{receipt.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3 no-print">
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
    </div>
  );
}
