"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProcurementBySlipId, updateProcurementStatus } from "@/app/actions/procurement";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Share2,
  Download,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useSWRCache, invalidateCache } from "@/lib/swr-cache";

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const slipId = params.slipId as string;

  const {
    data: record,
    isLoading: loading,
    error: swrError,
  } = useSWRCache<any>(
    slipId ? `receipt-${slipId}` : null,
    async () => {
      const data = await getProcurementBySlipId(slipId);
      // Pre-fill edit forms
      setEditRate(data.rate);
      setEditDeduction(data.deduction);
      return data;
    },
    { ttl: 60000 }
  );

  const error = swrError?.message || "";

  const [isSharing, setIsSharing] = useState(false);
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles || [];

  const [editRate, setEditRate] = useState<number | "">("");
  const [editDeduction, setEditDeduction] = useState<number | "">("");
  const [isUpdating, setIsUpdating] = useState(false);

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

  async function handleWhatsApp() {
    setIsSharing(true);
    try {
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
        const file = new File([blob], `Receipt_${record.slipId}.jpg`, {
          type: "image/jpeg",
        });

        const shareData = {
          files: [file],
          title: "Purchase Receipt",
          text: `Farmer ERP Receipt - ${record.slipId}`,
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

  async function handleAction(action: "L2_APPROVE" | "L2_REJECT" | "L3_APPROVE" | "L3_REJECT") {
    if (!window.confirm("Are you sure you want to " + action.split("_")[1].toLowerCase() + " this record?")) return;
    setIsUpdating(true);
    try {
      const updates = (action === "L2_APPROVE" || action === "L3_APPROVE") ? { 
        rate: Number(editRate), 
        deduction: Number(editDeduction) 
      } : undefined;
      await updateProcurementStatus(slipId, action, updates);
      
      // Invalidate caches so lists update instantly
      invalidateCache(`receipt-${slipId}`);
      invalidateCache("history-*");
      invalidateCache("dashboard-*");
      
      alert("Status updated successfully.");
      router.push("/dashboard/history");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setIsUpdating(false);
  }

  const isL2Pending = record.status === "PENDING_L2" && (roles.includes("L2_APPROVAL") || roles.includes("L4_ADMIN"));
  const isL3Pending = record.status === "PENDING_L3" && (roles.includes("L3_PO_MAKER") || roles.includes("L4_ADMIN"));

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

        {/* Slip Content */}
        <div className="px-6 py-6 relative bg-white" id="purchase-slip">
          {/* Watermark for anti-copy */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-30 print:opacity-[0.15]">
            <div className={`transform -rotate-45 text-4xl sm:text-6xl font-black tracking-widest whitespace-nowrap ${record.status === "APPROVED" ? "text-slate-300" : "text-amber-200"}`}>
              {record.status === "APPROVED" ? "OFFICIAL RECEIPT" : "UNOFFICIAL SLIP"}
            </div>
          </div>

          {/* Official Header */}
          <div className="text-center mb-5 pb-4 border-b-2 border-slate-800 print:border-black relative z-10">
            <h2 className="text-xl font-black uppercase tracking-widest text-forest-900 print:text-black">FARMER ERP PVT. LTD.</h2>
            <p className={`text-sm font-semibold mt-1 print:text-black ${record.status === "APPROVED" ? "text-slate-500" : "text-amber-600"}`}>
              {record.status === "APPROVED" ? "Official Purchase Slip" : "Unofficial Purchase Slip (Pending)"}
            </p>
          </div>

          {/* Slip ID & Approvals */}
          <div className="flex items-start justify-between mb-5 pb-4 border-b border-dashed border-slate-200 print:border-black relative z-10">
            <div className="relative z-10 text-left space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">Agent (L1)</span>
                <span className="block text-xs font-semibold text-slate-800 print:text-black">
                  {record.agentName || "Unknown"}
                </span>
              </div>
              {record.l2ApproverName && (
                <div>
                  <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">
                    {record.l2Edited ? "Updated & Approved By (L2)" : "Approved By (L2)"}
                  </span>
                  <span className="block text-xs font-semibold text-slate-800 print:text-black">
                    {record.l2ApproverName}
                  </span>
                </div>
              )}
              {record.l3ApproverName && (
                <div>
                  <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">
                    {record.l3Edited ? "Updated & Final PO By (L3)" : "Final PO Maker (L3)"}
                  </span>
                  <span className="block text-xs font-semibold text-slate-800 print:text-black">
                    {record.l3ApproverName}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 print:text-black">Slip ID</p>
              <p className="text-sm font-mono font-bold text-slate-800 print:text-black">
                {record.slipId}
              </p>
              <div className="mt-2 text-right">
                {record.status === "APPROVED" ? (
                  <>
                    <p className="text-[12px] font-black text-emerald-600 print:text-black">
                      STATUS: APPROVED
                    </p>
                    {record.l3ApproverName && (
                      <p className="text-[10px] font-bold text-slate-700 print:text-black uppercase mt-0.5">
                        BY: {record.l3ApproverName}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-indigo-600 print:text-black mt-1 uppercase">
                    STATUS: {record.status}
                  </p>
                )}
              </div>
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
                <span className="opacity-80">Less: Deduction (per Bag)</span>
                {(isL2Pending || isL3Pending) ? (
                  <input 
                    type="number"
                    value={editDeduction}
                    onChange={(e) => setEditDeduction(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-16 border rounded text-right p-1"
                  />
                ) : (
                  <span className="font-medium">
                    - {record.deduction} Qtl
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 print:border-black">
                <span className="text-slate-500 font-medium print:text-black">Net Quantity</span>
                <span className="font-bold text-slate-800 print:text-black">
                  {(isL2Pending || isL3Pending) && editDeduction !== "" ? 
                    Math.round((record.grossQuantity - Number(editDeduction) * record.bags) * 100) / 100 
                    : record.netQuantity} Qtl
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 print:text-black">Rate</span>
                {(isL2Pending || isL3Pending) ? (
                  <input 
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-20 border rounded text-right p-1 text-slate-700"
                  />
                ) : (
                  <span className="font-medium text-slate-700 print:text-black">
                    ₹{record.rate.toLocaleString("en-IN")} / Qtl
                  </span>
                )}
              </div>
            </div>

            <div className="h-[2px] border-b-2 border-dashed border-slate-200 mt-3 mb-2 print:border-black" />

            {/* Total */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-base font-semibold text-slate-700 print:text-black">
                Total Payout
              </span>
              <span className="text-2xl font-bold text-forest-700 print:text-black">
                {(isL2Pending || isL3Pending) && editRate !== "" && editDeduction !== "" ? 
                  "₹" + (Math.round((record.grossQuantity - Number(editDeduction) * record.bags) * Number(editRate) * 100) / 100).toLocaleString("en-IN")
                  : "₹" + record.total.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Caption */}
            {record.status !== "APPROVED" && (
              <div className="mt-4 text-center">
                <p className="text-[10px] text-amber-600 print:text-black font-semibold mb-2 max-w-sm mx-auto leading-tight">
                  * This slip is going for approval. This is not an official receipt. Official receipt will be downloaded after final approval.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Approvals */}
        {isL2Pending && (
          <div className="px-6 pb-6 flex gap-3 print:hidden">
            <button
              onClick={() => handleAction("L2_REJECT")}
              disabled={isUpdating}
              className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-semibold hover:bg-red-200"
            >
              Reject
            </button>
            <button
              onClick={() => handleAction("L2_APPROVE")}
              disabled={isUpdating}
              className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600"
            >
              Approve (L2)
            </button>
          </div>
        )}

        {isL3Pending && (
          <div className="px-6 pb-6 flex gap-3 print:hidden">
            <button
              onClick={() => handleAction("L3_REJECT")}
              disabled={isUpdating}
              className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-semibold hover:bg-red-200"
            >
              Reject
            </button>
            <button
              onClick={() => handleAction("L3_APPROVE")}
              disabled={isUpdating}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
            >
              Final Approve (L3)
            </button>
          </div>
        )}

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
