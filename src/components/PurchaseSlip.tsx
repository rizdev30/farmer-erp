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
} from "lucide-react";

interface Props {
  receipt: ProcurementReceipt;
  onClose: () => void;
}

export default function PurchaseSlip({ receipt, onClose }: Props) {
  const [isSharing, setIsSharing] = useState(false);

  // Computed immediately on render
  const currentTime = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const formattedDate = new Date(receipt.timestamp).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

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
        const file = new File([blob], `Receipt_${receipt.slipId}.jpg`, {
          type: "image/jpeg",
        });

        const shareData = {
          files: [file],
          title: "Purchase Receipt",
          text: `Farmer ERP Receipt - ${receipt.slipId}`,
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
    document.title = `Receipt_${receipt.farmerName.replace(/\s+/g, "_")}_${receipt.slipId}`;
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

          {/* Slip Content */}
          <div className="px-6 py-6 relative bg-white" id="purchase-slip">
            {/* No watermark for initial slip */}

            {/* Official Header */}
            <div className="text-center mb-5 pb-4 border-b-2 border-slate-800 print:border-black relative z-10">
              <h2 className="text-xl font-black uppercase tracking-widest text-forest-900 print:text-black">FARMER ERP PVT. LTD.</h2>
              <p className="text-sm font-semibold text-slate-500 print:text-black mt-1">Official Purchase Slip</p>
            </div>

            {/* Slip ID & Agent */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200 print:border-black relative z-10">
              <div className="relative z-10 text-left">
                <span className="text-xs text-slate-400 print:text-black">Authorized Agent</span>
                <span className="block text-sm font-semibold text-slate-800 print:text-black">
                  {receipt.agentName || "Agent"}
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

              <div className="h-px bg-slate-100 print:bg-black mb-3" />

              {/* Data Table */}
              <div className="pt-2 text-slate-800 print:text-black">
                <table className="w-full text-xs sm:text-sm border-collapse border border-slate-400 print:border-black table-fixed">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 print:border-black p-2 w-1/2">
                        Crop: <span className="font-semibold ml-1">{receipt.crop}</span>
                      </td>
                      <td className="border border-slate-400 print:border-black p-2 w-1/2">
                        Variety: <span className="font-semibold ml-1">{receipt.variety || "-"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 print:border-black p-2">
                        No. of Bags: <span className="font-semibold ml-1">{receipt.bags}</span>
                      </td>
                      <td className="border border-slate-400 print:border-black p-2">
                        Packing Size: <span className="font-semibold ml-1">{receipt.packingSize}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 print:border-black p-2">
                        Weight Qtl.: <span className="font-semibold ml-1">{receipt.grossQuantity}</span>
                      </td>
                      <td className="border border-slate-400 print:border-black p-2">
                        Deduction Qtl./Bag: <span className="font-semibold ml-1">{receipt.deduction}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 print:border-black p-2">
                        RATE PER QUINTAL: <span className="font-semibold ml-1">{receipt.rate}</span>
                      </td>
                      <td className="border border-slate-400 print:border-black p-2">
                        Bones: <span className="font-semibold ml-1">{receipt.bones}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 print:border-black p-2">
                        Adtiya Name: <span className="font-semibold ml-1">{receipt.adtiyaName || "-"}</span>
                      </td>
                      <td className="border border-slate-400 print:border-black p-2">
                        Lot no.: <span className="font-semibold ml-1">{receipt.lotNo || "-"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-slate-400 print:border-black p-2">
                        <span className="font-semibold">Total Payout: </span>
                        <span className="font-bold text-base ml-2">₹{receipt.total.toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Caption and Timestamp of Generation */}
              <div className="mt-6 pt-3 border-t border-slate-100 print:border-black/10 text-center">
                <p className="text-[10px] text-amber-600 print:text-black font-semibold mb-2 max-w-sm mx-auto leading-tight">
                  * This slip is going for approval. This is not an official receipt. Official receipt will be downloaded after final approval.
                </p>
                <p id="timestamp-text" className="text-[10px] text-slate-400 print:text-black/60 font-mono">
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
