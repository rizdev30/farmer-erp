"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProcurementBySlipId, updateProcurementStatus } from "@/app/actions/procurement";
import { useSession, signOut } from "next-auth/react";
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
import LoadingSkeleton from "./loading";

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
      const res = await getProcurementBySlipId(slipId);
      if (res.error) throw new Error(res.error);
      const data = res.data;
      if (!data) throw new Error("Record not found");
      // Pre-fill edit forms
      setEditRate(data.rate);
      setEditDeduction(data.deduction);
      setEditBones(data.bones);
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
  const [editBones, setEditBones] = useState<number | "">("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Security measure: if unauthorized, throw them out to the login page immediately
  if (error === "You are not authorized to view this record." || error === "Not authenticated") {
    signOut({ callbackUrl: "/login", redirect: true });
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-red-500 font-bold animate-pulse">Unauthorized access detected. Logging out...</p>
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
      const updates = (action === "L2_APPROVE") ? { 
        rate: Number(editRate), 
        deduction: Number(editDeduction),
        bones: Number(editBones)
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
          <div className="absolute inset-0 flex flex-col items-center justify-evenly pointer-events-none z-0 overflow-hidden opacity-30 print:opacity-[0.15]">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`transform -rotate-45 text-4xl sm:text-6xl print:text-[24px] font-black tracking-widest whitespace-nowrap print:text-black ${record.status === "APPROVED" ? "text-slate-300" : "text-amber-200"}`}>
                {record.status === "APPROVED" ? "OFFICIAL RECEIPT" : "UNOFFICIAL SLIP"}
              </div>
            ))}
          </div>

          {/* Official Header */}
          <div className="text-center mb-5 pb-4 border-b-2 border-slate-800 print:border-black relative z-10">
            <h2 className="text-xl font-black uppercase tracking-widest text-forest-900 print:text-black">Purchase Slip</h2>
            <p className="text-sm font-semibold text-slate-500 print:text-black mt-1">FARMER ERP PVT. LTD.</p>
            <p className={`text-[10px] font-bold mt-1 print:text-black ${record.status === "APPROVED" ? "text-emerald-600" : "text-amber-600"}`}>
              {record.status === "APPROVED" ? "✓ Official Receipt" : "⏳ " + (record.status || "PENDING_L2").replace(/_/g, " ")}
            </p>
          </div>

          {/* Slip Info */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200 print:border-black relative z-10">
            <div className="max-w-[50%]">
              <span className="text-[10px] text-slate-400 print:text-black uppercase tracking-wider">Slip No.</span>
              <span className="block text-sm font-mono font-bold text-slate-800 print:text-black break-words">{record.slipId}</span>
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
                <span className="block text-xs font-medium text-slate-700 print:text-black">{record.farmer?.projectName || "—"}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 print:text-black">Mandi</span>
                <span className="block text-xs font-medium text-slate-700 print:text-black">{record.farmer?.town || "—"}</span>
              </div>
            </div>

            {/* Farmer / Trader Section */}
            {record.farmer?.category === "TRADER" ? (
              <div className="pb-3 border-b border-slate-100 print:border-black/20">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 print:text-black">Trader Details</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Trader Code</span>
                    <span className="text-xs font-mono font-bold text-blue-700 print:text-black">{record.farmerCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Name</span>
                    <span className="text-xs font-semibold text-slate-800 print:text-black">{record.farmerName}</span>
                  </div>
                  {record.farmer?.company && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">Company</span>
                      <span className="text-xs font-semibold text-slate-800 print:text-black">{record.farmer.company}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Promoter Name</span>
                    <span className="text-xs font-semibold text-slate-800 print:text-black">{record.farmer?.promoterName || record.farmerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Address</span>
                    <span className="text-xs font-medium text-slate-700 print:text-black text-right max-w-[55%]">
                      {[record.village, record.farmer?.block, record.farmer?.district, record.farmer?.pinCode].filter(Boolean).join(", ") || "N/A"}
                    </span>
                  </div>
                  {record.farmer?.panGst && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 print:text-black">PAN/GST</span>
                      <span className="text-xs font-medium text-slate-700 print:text-black">{record.farmer.panGst}</span>
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
                    <span className="text-xs font-mono font-bold text-forest-700 print:text-black">{record.farmerCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Name</span>
                    <span className="text-xs font-semibold text-slate-800 print:text-black">{record.farmerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Father Name</span>
                    <span className="text-xs font-medium text-slate-700 print:text-black">{record.fatherName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 print:text-black">Address</span>
                    <span className="text-xs font-medium text-slate-700 print:text-black text-right max-w-[55%]">
                      {[record.village, record.farmer?.block, record.farmer?.district, record.farmer?.pinCode].filter(Boolean).join(", ") || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="pb-3 border-b border-slate-100 print:border-black/20">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400 print:text-black">Adtiya Name</span>
                  <span className="text-xs font-semibold text-slate-800 print:text-black">{record.adtiyaName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-400 print:text-black">Lot No.</span>
                  <span className="text-xs font-semibold text-slate-800 print:text-black">{record.lotNo || "—"}</span>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="pb-3 border-b border-slate-100 print:border-black/20">
              <p className="text-[10px] font-bold text-forest-600 uppercase tracking-wider mb-2 print:text-black">Transaction Details</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">Crop</span>
                    <span className="font-bold text-slate-800 print:text-black">{record.crop}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">Variety</span>
                    <span className="font-bold text-slate-700 print:text-black">{record.variety || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">No. of Bags</span>
                    <span className="font-bold text-slate-800 print:text-black">{(record.bags || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">Packing Unit</span>
                    <span className="font-bold text-slate-700 print:text-black">{record.packingSize || 0} kg</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">Weight Qtl.</span>
                    <span className="font-bold text-slate-800 print:text-black">{record.grossQuantity?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">RATE/Qtl.</span>
                    {isL2Pending ? (
                      <input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value === "" ? "" : Number(e.target.value))} className="w-20 border rounded text-right p-1 text-slate-700" />
                    ) : (
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{record.rate?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs print:text-black">
                    <span className="text-slate-500">Deduction/Qtl (in kg)</span>
                    {isL2Pending ? (
                      <input type="number" value={editDeduction} onChange={(e) => setEditDeduction(e.target.value === "" ? "" : Number(e.target.value))} className="w-16 border rounded text-right p-1" />
                    ) : (
                      <span className="font-bold text-slate-800 whitespace-nowrap">{record.deduction}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 print:text-black">Bones/Qtl</span>
                    {isL2Pending ? (
                      <input type="number" value={editBones} onChange={(e) => setEditBones(e.target.value === "" ? "" : Number(e.target.value))} className="w-16 border rounded text-right p-1" />
                    ) : (
                      <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">{record.bones?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>

            {/* Totals */}
            <div className="pb-3 border-b border-slate-100 print:border-black/20 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium print:text-black">Total Amount</span>
                <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">
                  {(isL2Pending && editRate !== "" ? 
                    Math.round(record.grossQuantity * Number(editRate) * 100) / 100 
                    : Math.round(record.grossQuantity * record.rate * 100) / 100)?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium print:text-black">Total Bones</span>
                <span className="font-bold text-slate-800 print:text-black whitespace-nowrap">
                  {(isL2Pending && editBones !== "" ? 
                    Math.round(record.grossQuantity * Number(editBones) * 100) / 100 
                    : record.bones * record.grossQuantity)?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-red-600 print:text-black">
                <span className="font-medium">Total Deduction</span>
                <span className="font-bold whitespace-nowrap">
                  -{(isL2Pending && editRate !== "" && editDeduction !== "" ? 
                    Math.round(((record.grossQuantity * Number(editDeduction)) / 100) * Number(editRate) * 100) / 100 
                    : Math.round(((record.grossQuantity * record.deduction) / 100) * record.rate * 100) / 100)?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Total Payout */}
            <div className="bg-forest-50 rounded-xl p-3 text-center border border-forest-100 print:bg-transparent print:border-black">
              <p className="text-[10px] text-forest-600 font-bold uppercase tracking-wider mb-1 print:text-black">Total Payout</p>
              <p className="text-lg sm:text-xl print:text-[14px] font-black text-forest-800 print:text-black tracking-tighter whitespace-nowrap">
                {isL2Pending && editRate !== "" && editDeduction !== "" && editBones !== "" ? 
                  "₹" + (Math.round((record.grossQuantity * Number(editRate)) * 100) / 100 + Math.round((record.grossQuantity * Number(editBones)) * 100) / 100 - Math.round(((record.grossQuantity * Number(editDeduction)) / 100) * Number(editRate) * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                  : "₹" + (Math.round((record.grossQuantity * record.rate) * 100) / 100 + Math.round((record.grossQuantity * record.bones) * 100) / 100 - Math.round(((record.grossQuantity * record.deduction) / 100) * record.rate * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="h-px bg-slate-100 print:bg-black" />

            {/* Purchase / Approved By */}
            <div className="flex justify-between pt-1 pb-3 border-b border-slate-100 print:border-black/20">
              <div>
                <span className="block text-[10px] text-slate-400 print:text-black">Purchase by</span>
                <span className="block text-xs font-bold text-slate-800 print:text-black">{record.agentName || "Agent"}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 print:text-black">Approved by</span>
                <span className="block text-xs font-bold text-slate-700 print:text-black">{record.l3ApproverName || record.l2ApproverName || "Pending"}</span>
              </div>
            </div>

            {/* Farmer Signature */}
            <div className="pt-1 pb-3 border-b border-slate-100 print:border-black/20">
              <span className="text-[10px] text-slate-400 print:text-black">{record.farmer?.category === "TRADER" ? "Trader Signature" : "Farmer Signature"}</span>
              <div className="h-8 border-b border-dotted border-slate-300 mt-1 print:border-black"></div>
            </div>

            {/* Caption */}
            {record.status !== "APPROVED" && (
              <div className="mt-2 text-center">
                <p className="text-[10px] text-amber-600 print:text-black font-semibold mb-2 max-w-sm mx-auto leading-tight">
                  * This slip is going for approval. This is not an official receipt.
                </p>
              </div>
            )}
          </div>
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

        {/* Make PO Button for L3/L4 users */}
        {(roles.includes("L3_PO_MAKER") || roles.includes("L4_ADMIN") || (session?.user as any)?.isSuperAdmin) && (
          <div className="px-6 pb-6 print:hidden">
            <button
              onClick={() => router.push(`/dashboard/po-maker?slipId=${record.slipId}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-forest-600 text-white text-sm font-semibold hover:bg-forest-700 transition-colors shadow-sm"
            >
              <FileText size={16} />
              Make a PO
            </button>
          </div>
        )}
      </div>

      {/* Global Print Styles - 2-inch thermal receipt format */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: 58mm auto; margin: 2mm 3mm; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #purchase-slip, #purchase-slip * { visibility: visible; }
          #purchase-slip {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 52mm !important;
            padding: 1mm !important;
            margin: 0 !important;
            background: white !important;
            font-family: monospace, Courier !important;
            font-size: 10px !important;
          }
          .glass-card { box-shadow: none !important; border: none !important; }
          #sidebar { display: none !important; }
        }
      `}} />
    </div>
  );
}
