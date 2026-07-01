"use client";

import { useEffect, useState } from "react";
import { getPOHistory } from "@/app/actions/po";
import { 
  FileText, ArrowLeft, Loader2, Calendar, Edit3, ChevronRight 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function PORecordsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

    const fetchHistory = async () => {
    try {
      const data = await getPOHistory();
      setRecords(data);
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to fetch PO records"
      });
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (v: any) => parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-100 to-indigo-200">
            <FileText size={16} className="text-indigo-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight truncate">
              PO Records Hub
            </h1>
            <p className="text-xs text-slate-400">View and manage all generated Purchase Orders</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Generated POs</h2>
            <p className="text-xs text-slate-400">
              {records.length} record{records.length !== 1 && 's'}
            </p>
          </div>
          <Link
            href="/dashboard/po-maker"
            className="text-xs font-bold text-white bg-forest-600 px-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors shadow-sm"
          >
            Create New PO
          </Link>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-forest-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No PO records found</p>
            <p className="text-slate-300 text-xs mt-1">Create a new Purchase Order to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">PO Number</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Supplier</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500">Procurement Total</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-500">Payment Date</th>
                  <th className="px-5 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-sm font-semibold text-slate-700">{rec.poNumber}</div>
                      <div className="text-xs text-slate-400">Slip: {rec.slipId}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{rec.supplierName}</div>
                      <div className="text-xs text-slate-400">{rec.supplierLocation}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {rec.procurement ? (
                        <>
                          <div className="font-bold text-slate-700 tabular-nums">₹{fmtCurrency(rec.procurement.total)}</div>
                          <div className="text-xs text-slate-400">{rec.procurement.crop} - {rec.procurement.variety}</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        <Calendar size={12} />
                        {rec.paymentDate ? fmtDate(rec.paymentDate) : "N/A"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/po-maker?slipId=${rec.slipId}`)}
                        className="p-2 text-slate-400 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
