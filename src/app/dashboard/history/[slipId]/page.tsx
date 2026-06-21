"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProcurementBySlipId } from "@/app/actions/procurement";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Share2,
  Download,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const slipId = params.slipId as string;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecord() {
      try {
        const data = await getProcurementBySlipId(slipId);
        setRecord(data);
      } catch (err: any) {
        setError(err.message || "Failed to load record.");
      }
      setLoading(false);
    }
    loadRecord();
  }, [slipId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-forest-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading receipt...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
          <FileText className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Record Not Found</h2>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => router.push("/dashboard/history")}
          className="mt-4 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          Back to History
        </button>
      </div>
    );
  }

  const formattedDate = new Date(record.createdAt).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Receipt_${record.farmerName.replace(/\s+/g, "_")}_${record.slipId}`;
    window.print();
    document.title = originalTitle;
  };

  function handleWhatsApp() {
    const text = encodeURIComponent(
      `🌾 *FARMER ERP PVT. LTD. — Purchase Slip*\n` +
        `----------------------------------------\n` +
        `📋 Slip ID: ${record.slipId}\n` +
        `📅 Date: ${formattedDate}\n` +
        `👨‍💼 Agent: ${record.agentName || "Unknown"} (${record.agentDetails?.email || "N/A"})\n\n` +
        `*FARMER DETAILS*\n` +
        `👤 Name: ${record.farmerName}\n` +
        `👨‍👦 Father: ${record.fatherName || "N/A"}\n` +
        `🆔 Code: ${record.farmerCode || "N/A"}\n` +
        `📍 Village: ${record.village || "N/A"}\n\n` +
        `*CROP DETAILS*\n` +
        `🌾 Crop: ${record.crop}\n` +
        `🏷️ Variety: ${record.variety || "N/A"}\n` +
        `📦 Bags: ${record.bags || 0}\n\n` +
        `*PAYMENT CALCULATION*\n` +
        `⚖️ Gross Qty: ${record.grossQuantity} Qtl\n` +
        `➖ Deduction: ${record.deduction} Qtl\n` +
        `✅ Net Qty: ${record.netQuantity} Qtl\n` +
        `💰 Rate: ₹${record.rate.toLocaleString("en-IN")}/Qtl\n\n` +
        `💵 *TOTAL PAYOUT: ₹${record.total.toLocaleString("en-IN")}*\n` +
        `----------------------------------------`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Back button (hidden on print) */}
      <div className="print:hidden mb-6">
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Records
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-black/5 overflow-hidden print:shadow-none print:w-full print:max-w-full">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-forest-800 to-forest-700 px-6 py-5 text-center print:hidden">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-forest-200" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Procurement Record
          </h2>
          <p className="text-forest-200 text-sm mt-1">
            Archived Transaction Data
          </p>
        </div>

        {/* Print-only Banner */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-center">
           <h2 className="text-xl font-bold uppercase tracking-widest">FARMER ERP PVT. LTD.</h2>
           <p className="text-sm">Official Purchase Slip</p>
        </div>

        {/* Slip Content */}
        <div className="px-6 py-6" id="purchase-slip">
          {/* Slip ID & Agent */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200 print:border-black">
            <div>
              <span className="text-sm font-bold text-forest-800 block print:hidden">
                FARMER ERP PVT. LTD.
              </span>
              <span className="text-xs text-slate-500 print:text-black">
                Agent: {record.agentName || "Unknown"}
              </span>
              <span className="block text-[10px] text-slate-400 print:text-black">
                {record.agentDetails?.email || "No Email"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 print:text-black">Slip ID</p>
              <p className="text-sm font-mono font-bold text-slate-800 print:text-black">
                {record.slipId}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3.5">
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
                  <span className="block text-xs font-semibold text-slate-800 print:text-black">{record.farmerName}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 print:text-black">Father</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{record.fatherName || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 print:text-black">Code</span>
                  <span className="block text-xs font-mono font-medium text-slate-700 print:text-black">{record.farmerCode || "N/A"}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 print:text-black">Phone</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{record.farmer?.phone || "N/A"}</span>
                </div>
                <div className="col-span-2 border-t border-slate-50 pt-2 print:border-black/10 mt-1">
                  <span className="block text-[10px] text-slate-400 print:text-black">Full Location</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">
                    {[record.village, record.farmer?.block, record.farmer?.district].filter(Boolean).join(", ") || "N/A"}
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
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{record.crop}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 print:text-black">Variety</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{record.variety || "-"}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 print:text-black">Bags</span>
                  <span className="block text-xs font-medium text-slate-700 print:text-black">{record.bags || 0}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 print:bg-black" />

            {/* Math Section */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 print:text-black">Gross Quantity</span>
                <span className="font-semibold text-slate-800 print:text-black">
                  {record.grossQuantity} Qtl
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-red-600 print:text-black">
                <span className="opacity-80">Less: Deduction</span>
                <span className="font-medium">
                  - {record.deduction} Qtl
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 print:border-black">
                <span className="text-slate-500 font-medium print:text-black">Net Quantity</span>
                <span className="font-bold text-slate-800 print:text-black">
                  {record.netQuantity} Qtl
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 print:text-black">Rate</span>
                <span className="font-medium text-slate-700 print:text-black">
                  ₹{record.rate.toLocaleString("en-IN")} / Qtl
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
                ₹{record.total.toLocaleString("en-IN")}
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
        </div>
      </div>

      {/* Global Print Styles to make background white and remove shadows */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .glass-card { box-shadow: none !important; border: none !important; }
          /* Hide sidebar or other global layouts if needed */
          #sidebar { display: none !important; }
        }
      `}} />
    </div>
  );
}
