"use client";

import { useEffect, useState, useMemo } from "react";
import { getPOHistory, markPOAsBilled } from "@/app/actions/po";
import { 
  FileText, Loader2, Calendar, Edit3, CheckCircle, Printer, Eye, X, AlertTriangle, AlertCircle, Download, Sprout, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { TableSkeleton } from "@/components/LoadingSkeleton";

// Utility to convert number to Indian Rupees words
function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const formatThousands = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + formatThousands(n % 100) : '');
    return '';
  };

  let word = '';
  
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crore > 0) {
    word += formatThousands(crore) + ' Crore ';
  }
  if (lakh > 0) {
    word += formatThousands(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    word += formatThousands(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    word += formatThousands(remaining);
  }

  // Handle decimal paise if any
  const paise = Math.round((num - remaining) * 100);
  let paiseWord = '';
  if (paise > 0) {
    paiseWord = ' and ' + formatThousands(paise) + ' Paise';
  }

  return word.trim() + paiseWord + " Rupees Only";
}

export default function PORecordsClient({ initialRecords }: { initialRecords: any[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [records, setRecords] = useState<any[]>(initialRecords || []);
  const [loading, setLoading] = useState(!initialRecords);
  const [billedConfirmPO, setBilledConfirmPO] = useState<any | null>(null);
  const [isBilling, setIsBilling] = useState(false);
  const [previewPO, setPreviewPO] = useState<any | null>(null);
  const [downloadPO, setDownloadPO] = useState<any | null>(null);

  useEffect(() => {
    if (!initialRecords) {
      fetchHistory();
    }
  }, [initialRecords]);

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

  const handleMarkAsBilled = async (slipId: string) => {
    setIsBilling(true);
    try {
      await markPOAsBilled(slipId);
      addToast({
        type: "success",
        title: "Success",
        message: "PO marked as BILLED successfully. You can now download or share it."
      });
      fetchHistory();
      setBilledConfirmPO(null);
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to mark PO as billed"
      });
    } finally {
      setIsBilling(false);
    }
  };

  const fmtCurrency = (v: any) => parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const parsedPOData = useMemo(() => {
    const targetPO = previewPO || downloadPO;
    if (!targetPO) return null;
    
    let parsed: any = {};
    try {
      parsed = typeof targetPO.items === 'string' ? JSON.parse(targetPO.items) : targetPO.items || {};
    } catch (e) {
      console.error("Failed to parse items json:", e);
    }
    
    const billing = parsed.billing || {
      name: targetPO.companyName || "Farmer ERP Pvt Ltd",
      address: targetPO.companyAddress || "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
      gstNo: "GST/PAN No.: 24AAACF1234A1Z5",
      mobile: "Mobile no.: +91 98765 43210",
      email: "Email Id: contact@farmererp.com"
    };
    
    const vendor = parsed.vendor || {
      name: targetPO.supplierName || "",
      address: targetPO.supplierLocation || "",
      gstNo: "",
      mobile: "",
      email: ""
    };
    
    const delivery = parsed.delivery || {
      name: targetPO.companyName || "Farmer ERP Pvt Ltd",
      address: targetPO.companyAddress || "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
      gstNo: "GST/PAN No.: 24AAACF1234A1Z5",
      mobile: "Mobile no.: +91 98765 43210",
      email: "Email Id: contact@farmererp.com"
    };

    const poNumber = targetPO.poNumber || `PO-${targetPO.slipId}`;
    const poDate = parsed.poDate || (targetPO.createdAt ? new Date(targetPO.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    const paymentTerms = parsed.paymentTerms || "-";
    const deliveryTerms = parsed.deliveryTerms || "-";
    const termsAndConditions = parsed.termsAndConditions || "THE INSTRUMENT CONTAINS ALL THE TERMS AND CONDITIONS WITH RESPECT TO PURCHASE OF THE MATERIAL OR SERVICES NAMED HEREIN.\nNO MODIFICATION OR AMENDMENT SHALL HAVE ANY FORCE OR EFFECT UNLESS CONFIRMED BY BUYERS IN WRITING.";
    const authorizedSignatory = parsed.authorizedSignatory || targetPO.companyName || "Farmer ERP Pvt Ltd";
    
    const pRates = parsed.rates || {
      mandiTaxPercent: 1.20,
      hammaliRate: 18.00,
      commissionPercent: 1.50,
      sutliRate: 1.00,
      otherExpenses: 300.00,
      bonusRate: 100.00,
      freightRate: 50.00
    };
    
    const pOverrides = parsed.overrides || {
      hsnCode: "1063020",
      packingSize: 50,
      gstPercent: 0,
      manualNetQty: "",
      manualRate: "",
      manualCrop: "",
      manualVariety: ""
    };
    
    const cOverrides = parsed.calcOverrides || {};
    
    const activeSlips = parsed.selectedProcurements || (targetPO.procurement ? [{
      slipId: targetPO.slipId,
      farmerName: targetPO.supplierName,
      farmerCode: targetPO.procurement.farmerCode || "",
      bags: targetPO.procurement.bags || 0,
      netQuantity: targetPO.procurement.netQuantity || 0,
      rate: targetPO.procurement.rate || 0,
      total: targetPO.procurement.total || 0,
      crop: targetPO.procurement.crop || "",
      variety: targetPO.procurement.variety || ""
    }] : []);
    
    // Calculations
    let totalBags = 0;
    let totalQty = 0;
    let totalSubtotal = 0;

    activeSlips.forEach((slip: any) => {
      totalBags += slip.bags || 0;
      totalQty += slip.netQuantity || 0;
      totalSubtotal += (slip.netQuantity || 0) * (slip.rate || 0);
    });

    // Handle single row overrides
    if (activeSlips.length === 1) {
      const netQty = pOverrides.manualNetQty !== undefined && pOverrides.manualNetQty !== "" ? Number(pOverrides.manualNetQty) : totalQty;
      const rate = pOverrides.manualRate !== undefined && pOverrides.manualRate !== "" ? Number(pOverrides.manualRate) : (activeSlips[0].rate || 0);
      totalQty = netQty;
      totalSubtotal = netQty * rate;
    }

    const autoMandiTax = (pRates.mandiTaxPercent / 100) * totalSubtotal;
    const autoHammali = pRates.hammaliRate * totalBags;
    const autoCommission = (pRates.commissionPercent / 100) * totalSubtotal;
    const autoSutli = pRates.sutliRate * totalBags;
    const autoOtherExpenses = pRates.otherExpenses;
    const autoBonus = pRates.bonusRate * totalQty;
    const autoFreight = pRates.freightRate * totalQty;

    const mandiTax = cOverrides.mandiTax !== undefined && cOverrides.mandiTax !== "" ? Number(cOverrides.mandiTax) : autoMandiTax;
    const hammali = cOverrides.hammali !== undefined && cOverrides.hammali !== "" ? Number(cOverrides.hammali) : autoHammali;
    const commission = cOverrides.commission !== undefined && cOverrides.commission !== "" ? Number(cOverrides.commission) : autoCommission;
    const sutli = cOverrides.sutli !== undefined && cOverrides.sutli !== "" ? Number(cOverrides.sutli) : autoSutli;
    const otherExpenses = cOverrides.otherExpenses !== undefined && cOverrides.otherExpenses !== "" ? Number(cOverrides.otherExpenses) : autoOtherExpenses;
    const bonus = cOverrides.bonus !== undefined && cOverrides.bonus !== "" ? Number(cOverrides.bonus) : autoBonus;
    const freight = cOverrides.freight !== undefined && cOverrides.freight !== "" ? Number(cOverrides.freight) : autoFreight;

    const rawFinal = totalSubtotal + mandiTax + hammali + commission + sutli + otherExpenses + bonus + freight;
    const autoRoundedFinal = Math.round(rawFinal);
    const autoRoundOff = autoRoundedFinal - rawFinal;

    const roundOff = cOverrides.roundOff !== undefined && cOverrides.roundOff !== "" ? Number(cOverrides.roundOff) : autoRoundOff;
    const finalAmount = cOverrides.finalAmount !== undefined && cOverrides.finalAmount !== "" ? Number(cOverrides.finalAmount) : Math.round(rawFinal + roundOff);

    return {
      billing,
      vendor,
      delivery,
      poNumber,
      poDate,
      paymentTerms,
      deliveryTerms,
      termsAndConditions,
      authorizedSignatory,
      hsnCode: pOverrides.hsnCode || "1063020",
      packingSize: pOverrides.packingSize || 50,
      activeSlips,
      rates: pRates,
      overrides: pOverrides,
      calcs: {
        totalBags,
        totalQty,
        subtotal: totalSubtotal,
        mandiTax,
        hammali,
        commission,
        sutli,
        otherExpenses,
        bonus,
        freight,
        roundOff,
        finalAmount
      }
    };
  }, [previewPO, downloadPO]);

  useEffect(() => {
    if (downloadPO && parsedPOData) {
      const timer = setTimeout(() => {
        const originalTitle = document.title;
        const safePoNumber = parsedPOData.poNumber.replace(/[\/\\]/g, '-') || 'PO';
        const safeSupplier = parsedPOData.vendor.name.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        document.title = `PO_${safeSupplier}_${safePoNumber}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
        setDownloadPO(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [downloadPO, parsedPOData]);


  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white !important; }
          #printable-po {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
        .po-grid-border {
          border: 1.5px solid black;
        }
        .po-cell-border-r {
          border-right: 1.5px solid black;
        }
        .po-cell-border-b {
          border-bottom: 1.5px solid black;
        }
        .po-cell-border-t {
          border-top: 1.5px solid black;
        }
        .po-table-cell-border {
          border-right: 1px solid black;
          border-bottom: 1px solid black;
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-6 pb-20 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 bg-indigo-100/80 rounded-xl flex items-center justify-center">
          <FileText size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Purchase Order List</h1>
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
            className="group flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-forest-600 to-forest-500 px-4 py-2 rounded-xl hover:from-forest-700 hover:to-forest-600 transition-all shadow-md shadow-forest-500/20 hover:shadow-lg hover:shadow-forest-500/30 active:scale-95"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
            Create New PO
          </Link>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : records.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No PO records found</p>
            <p className="text-slate-300 text-xs mt-1">Create a new Purchase Order to see it here</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Total</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Date</th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 w-48"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm md:text-[15px] font-bold text-slate-800">{rec.poNumber}</div>
                        <div className="text-xs text-slate-500 font-medium">Slip: {rec.slipId}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm md:text-[15px] font-bold text-slate-800">{rec.supplierName}</div>
                        <div className="text-xs text-slate-500 font-medium">{rec.supplierLocation}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {rec.procurement ? (
                          <>
                            <div className="text-sm md:text-[15px] font-extrabold text-slate-800 tabular-nums">₹{fmtCurrency(rec.procurement.total)}</div>
                            <div className="text-xs text-slate-500 font-semibold">{rec.procurement.crop} - {rec.procurement.variety}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold whitespace-nowrap">
                          <Calendar size={13} />
                          {rec.paymentDate ? fmtDate(rec.paymentDate) : "N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {rec.status === "BILLED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} /> Billed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => setPreviewPO(rec)}
                            className="px-2.5 py-1.5 text-indigo-700 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-sm"
                            title="Preview PO"
                          >
                            <Eye size={13} /> Preview
                          </button>
                          {rec.status === "BILLED" ? (
                            <button
                              onClick={() => setDownloadPO(rec)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-sm"
                            >
                              <Download size={13} /> Download
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setBilledConfirmPO(rec)}
                                className="px-2.5 py-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-sm"
                              >
                                <CheckCircle size={13} /> Approve/Bill
                              </button>
                              <Link
                                href={`/dashboard/po-maker?slipId=${rec.slipId}`}
                                className="px-2.5 py-1.5 text-slate-500 hover:text-forest-700 hover:bg-forest-50 border border-slate-200 hover:border-forest-200 rounded-lg transition-all active:scale-[0.96] inline-flex items-center gap-1 text-xs font-bold shadow-sm"
                              >
                                <Edit3 size={13} /> Edit
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-3 gap-3 bg-slate-50/80">
              {records.map((rec) => (
                <div key={rec.id} className="p-3 space-y-2 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-800 leading-tight">{rec.poNumber}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">Slip: {rec.slipId}</div>
                    </div>
                    {rec.status === "BILLED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={10} /> Billed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Supplier</p>
                      <div className="font-bold text-slate-800 line-clamp-1">{rec.supplierName}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{rec.supplierLocation}</div>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</p>
                      {rec.procurement ? (
                        <>
                          <div className="font-extrabold text-slate-800 tabular-nums">₹{fmtCurrency(rec.procurement.total)}</div>
                          <div className="text-[10px] text-slate-500 font-semibold line-clamp-1">{rec.procurement.crop} - {rec.procurement.variety}</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      <Calendar size={10} />
                      {rec.paymentDate ? fmtDate(rec.paymentDate) : "N/A"}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewPO(rec)}
                        className="px-2 py-1 text-indigo-700 bg-indigo-50 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Eye size={12} /> View
                      </button>
                      
                      {rec.status === "BILLED" ? (
                        <button
                          onClick={() => setDownloadPO(rec)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold shadow-sm"
                        >
                          <Download size={12} /> Down
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setBilledConfirmPO(rec)}
                            className="px-2 py-1 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <CheckCircle size={12} /> Bill
                          </button>
                          <Link
                            href={`/dashboard/po-maker?slipId=${rec.slipId}`}
                            className="px-2 py-1 text-slate-600 bg-slate-100 border border-slate-200 hover:bg-forest-600 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Edit3 size={12} /> Edit
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Warning Modal */}
      {billedConfirmPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-fade" onClick={() => setBilledConfirmPO(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 modal-spring">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">Approve & Bill Purchase Order</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to approve and mark PO <span className="font-mono font-bold text-slate-700">{billedConfirmPO.poNumber}</span> as <span className="text-emerald-700 font-bold">BILLED</span>?
                </p>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-700 text-left space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> Permanent Action
                  </p>
                  <p>Once billed, this Purchase Order will become permanent and cannot be edited or deleted.</p>
                </div>
              </div>
              
              <div className="flex w-full gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBilling}
                  onClick={() => setBilledConfirmPO(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBilling}
                  onClick={() => handleMarkAsBilled(billedConfirmPO.slipId)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isBilling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Approve & Bill"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* PO Preview / Download Hidden Container */}
      {(previewPO || downloadPO) && parsedPOData && (
        <div className={previewPO ? "fixed inset-0 z-50 flex items-center justify-center p-4 no-print overflow-y-auto" : "hidden print:block absolute top-0 left-0 w-full"}>
          {previewPO && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-fade" onClick={() => setPreviewPO(null)} />}
          <div className={previewPO ? "relative w-full max-w-[230mm] bg-white rounded-3xl shadow-2xl p-4 md:p-6 modal-spring my-8 max-h-[90vh] flex flex-col" : "bg-white p-0 m-0 w-full"}>
            
            {/* Modal Header */}
            {previewPO && (
              <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Purchase Order Preview</h3>
                  <p className="text-[10px] text-slate-400 font-mono">PO: {parsedPOData.poNumber}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {(previewPO || downloadPO).status === "BILLED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadPO(previewPO);
                      setPreviewPO(null);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm animate-fade-in"
                  >
                    <Download size={14} />
                    Download / Print
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-fade-in">
                    Draft PO (Not printable)
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => setPreviewPO(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            )}
            
            {/* Preview Sheet Container */}
            <div className="flex-1 overflow-auto bg-slate-100/50 p-2 md:p-4 rounded-2xl border border-slate-200/60">
              <div id="printable-po" className="w-[210mm] min-w-[210mm] mx-auto bg-white text-black p-6 text-[11px] leading-tight font-sans shadow-sm border border-slate-200">
                
                <div className="po-grid-border flex flex-col min-h-[268mm] justify-between">
                  <div>
                    
                    {/* 1. LOGO & HEADER ROW */}
                    <div className="flex po-cell-border-b min-h-16 items-center bg-slate-50/10 py-1">
                      <div className="w-[20%] po-cell-border-r h-full flex items-center justify-center p-2">
                        {/* FARMER ERP LOGO */}
                        <div className="flex items-center gap-1.5 select-none">
                          <div className="w-9 h-9 bg-gradient-to-br from-forest-500 to-forest-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="text-left leading-tight">
                            <span className="text-[9px] font-black text-slate-800 tracking-tight block">FARMER ERP</span>
                            <span className="text-[6.5px] font-bold text-forest-600 tracking-wider block">Pvt Ltd</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-[60%] text-center">
                        <h1 className="text-lg font-black tracking-widest uppercase text-slate-800">PURCHASE ORDER</h1>
                        <h2 className="text-xs font-bold uppercase text-slate-600">{parsedPOData.billing.name || "Farmer ERP Pvt Ltd"}</h2>
                      </div>
                      
                      {/* Watermark/Status Stamp */}
                      <div className="w-[20%] border-l-[1.5px] border-black h-full flex items-center justify-center p-1 print-hide">
                        {(previewPO || downloadPO).status === "BILLED" ? (
                          <div className="border-2 border-emerald-600 text-emerald-600 font-extrabold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider font-sans rotate-[-3deg] shadow-sm">
                            APPROVED
                          </div>
                        ) : (
                          <div className="border-2 border-red-600 text-red-600 font-extrabold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider font-sans rotate-[-3deg] shadow-sm">
                            DRAFT
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. VENDOR & METADATA GRID */}
                    <div className="flex po-cell-border-b">
                      
                      {/* Left Column: Vendor Address block */}
                      <div className="w-1/2 po-cell-border-r p-2 space-y-1">
                        <p className="font-extrabold underline uppercase text-xs text-black">Vender:</p>
                        <p className="font-black text-sm uppercase text-black">{parsedPOData.vendor.name || "ABC PVT LTD"}</p>
                        <p className="uppercase leading-tight text-xs whitespace-pre-wrap font-bold text-slate-600">{parsedPOData.vendor.address || "123, Kisan Market, Near Railway Station\nSector-12, Gandhinagar, Gujarat - 382010"}</p>
                        <div className="pt-0.5 space-y-0.5 text-xs font-bold text-slate-600">
                          <p><span className="font-extrabold text-black">GST/PAN No.:</span> {parsedPOData.vendor.gstNo || "24ABCDE1234F1Z5"}</p>
                          <p><span className="font-extrabold text-black">Mobile no.:</span> {parsedPOData.vendor.mobile || "+91 98765 43210"}</p>
                          <p><span className="font-extrabold text-black">Email Id:</span> {parsedPOData.vendor.email || "vendor@example.com"}</p>
                        </div>
                      </div>

                      {/* Right Column: PO info & Payment/Delivery */}
                      <div className="w-1/2 flex flex-col">
                        <div className="flex po-cell-border-b h-7">
                          <div className="w-[65%] po-cell-border-r p-1.5 flex items-center font-bold">
                            P.O. No.: <span className="font-black text-slate-800 ml-1 font-mono">{parsedPOData.poNumber}</span>
                          </div>
                          <div className="w-[35%] p-1.5 flex items-center">
                            Dated: <span className="ml-1 font-bold">{parsedPOData.poDate}</span>
                          </div>
                        </div>
                        
                        <div className="p-2 space-y-1 flex-1 flex flex-col justify-center text-xs font-bold text-slate-600">
                          <p><span className="font-extrabold text-black uppercase">Payment Terms:</span> {parsedPOData.paymentTerms}</p>
                          <p><span className="font-extrabold text-black uppercase">DELIVERY:</span> {parsedPOData.deliveryTerms || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3. BILLING & DELIVERY ADDRESS ROW */}
                    <div className="flex po-cell-border-b min-h-24 py-1">
                      {/* Billing Address */}
                      <div className="w-1/2 po-cell-border-r p-2 space-y-0.5">
                        <p className="font-extrabold underline uppercase text-xs text-black">Billing Address:</p>
                        <p className="font-black uppercase text-xs text-black">{parsedPOData.billing.name || "Farmer ERP Pvt Ltd"}</p>
                        <p className="uppercase leading-none text-xs whitespace-pre-wrap font-bold text-slate-600">{parsedPOData.billing.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                        <div className="text-xs pt-1 font-bold text-slate-600">
                          <p><span className="font-extrabold text-black">GST/PAN:</span> {parsedPOData.billing.gstNo || "24AAACF1234A1Z5"}</p>
                          <p><span className="font-extrabold text-black">Mobile:</span> {parsedPOData.billing.mobile || "+91 98765 43210"}</p>
                          <p><span className="font-extrabold text-black">Email:</span> {parsedPOData.billing.email || "contact@farmererp.com"}</p>
                        </div>
                      </div>
                      
                      {/* Delivery Address */}
                      <div className="w-1/2 p-2 space-y-0.5">
                        <p className="font-extrabold underline uppercase text-xs text-black">Delivery Address:</p>
                        <p className="font-black uppercase text-xs text-black">{parsedPOData.delivery.name || "Farmer ERP Pvt Ltd"}</p>
                        <p className="uppercase leading-none text-xs whitespace-pre-wrap font-bold text-slate-600">{parsedPOData.delivery.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                        <div className="text-xs pt-1 font-bold text-slate-600">
                          <p><span className="font-semibold">GST/PAN:</span> {parsedPOData.delivery.gstNo || "24AAACF1234A1Z5"}</p>
                          <p><span className="font-semibold">Mobile:</span> {parsedPOData.delivery.mobile || "+91 98765 43210"}</p>
                          <p><span className="font-semibold">Email:</span> {parsedPOData.delivery.email || "contact@farmererp.com"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 4. ITEMS TABLE */}
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="po-cell-border-b font-bold bg-slate-50 text-[10px]">
                          <th className="po-table-cell-border p-1 w-[5%]">Sr. No.</th>
                          <th className="po-table-cell-border p-1 w-[35%] text-left px-2">Farmer Name & Code</th>
                          <th className="po-table-cell-border p-1 w-[15%]">Description</th>
                          <th className="po-table-cell-border p-1 w-[7%]">Packing</th>
                          <th className="po-table-cell-border p-1 w-[7%]">No. of Bag</th>
                          <th className="po-table-cell-border p-1 w-[7%]">Quantity (Qtl.)</th>
                          <th className="po-table-cell-border p-1 w-[10%] text-right pr-2">Rate</th>
                          <th className="p-1 w-[14%] text-right pr-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Rows */}
                        {parsedPOData.activeSlips.map((item: any, idx: number) => {
                          const qty = item.netQuantity || 0;
                          const rate = (parsedPOData.activeSlips.length === 1 && parsedPOData.overrides.manualRate !== "") ? Number(parsedPOData.overrides.manualRate) : (item.rate || 0);
                          const displayQty = (parsedPOData.activeSlips.length === 1 && parsedPOData.overrides.manualNetQty !== "") ? Number(parsedPOData.overrides.manualNetQty) : qty;
                          const displayBags = (parsedPOData.activeSlips.length === 1 && parsedPOData.calcs.totalBags > 0) ? parsedPOData.calcs.totalBags : (item.bags || 0);
                          
                          const amount = displayQty * rate;
                          
                          return (
                            <tr key={item.slipId} className="text-[10px]">
                              <td className="po-table-cell-border p-1">{idx + 1}</td>
                              <td className="po-table-cell-border p-1 text-left px-2">
                                <span className="font-bold">{item.farmerName || "Unknown Farmer"}</span>
                                <span className="block text-[9px] text-slate-500 font-medium">Code:{item.farmerCode || "—"}</span>
                              </td>
                              <td className="po-table-cell-border p-1 uppercase text-slate-700">
                                {idx === 0 && parsedPOData.overrides.manualCrop ? parsedPOData.overrides.manualCrop : item.crop} {idx === 0 && parsedPOData.overrides.manualVariety ? parsedPOData.overrides.manualVariety : item.variety}
                              </td>
                              <td className="po-table-cell-border p-1">{parsedPOData.packingSize} kg</td>
                              <td className="po-table-cell-border p-1 font-mono">{displayBags.toFixed(2)}</td>
                              <td className="po-table-cell-border p-1 font-mono">{displayQty.toFixed(2)}</td>
                              <td className="po-table-cell-border p-1 text-right pr-2 font-mono">
                                {rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="border-b border-black p-1 text-right pr-2 font-mono font-semibold">
                                ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Dummy blank spacer row */}
                        <tr className="h-5">
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="po-table-cell-border"></td>
                          <td className="border-b border-black"></td>
                        </tr>

                        {/* Table Totals Row */}
                        <tr className="font-bold text-[10px] bg-slate-50/30 po-cell-border-b">
                          <td colSpan={4} className="po-table-cell-border p-1 font-bold text-center">Total</td>
                          <td className="po-table-cell-border p-1 font-mono">{parsedPOData.calcs.totalBags.toFixed(2)}</td>
                          <td className="po-table-cell-border p-1 font-mono">{parsedPOData.calcs.totalQty.toFixed(2)}</td>
                          <td className="po-table-cell-border p-1"></td>
                          <td className="p-1 text-right pr-2 font-mono font-bold">
                            ₹{parsedPOData.calcs.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 5. TAXES & CALCULATIONS */}
                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Mandi Tax/Qtl. ({parsedPOData.rates.mandiTaxPercent}%)
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.mandiTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Hammali/Bag (₹{parsedPOData.rates.hammaliRate})
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.hammali.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Commission/Qtl. ({parsedPOData.rates.commissionPercent}%)
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Sutli/Bag (₹{parsedPOData.rates.sutliRate})
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.sutli.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Other Expenses
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            {parsedPOData.calcs.otherExpenses > 0 ? `₹${parsedPOData.calcs.otherExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Bonus/Qtl (₹{parsedPOData.rates.bonusRate})
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.bonus.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Freight/Qtl (₹{parsedPOData.rates.freightRate})
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.freight.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="text-[10px]">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                            Round Off(±)
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono">
                            ₹{parsedPOData.calcs.roundOff.toFixed(2)}
                          </td>
                        </tr>

                        <tr className="font-bold text-[10.5px] bg-slate-50/40">
                          <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                          <td colSpan={3} className="po-table-cell-border p-1.5 text-right font-bold pr-2">
                            Final Amount
                          </td>
                          <td className="border-b border-black p-1.5 text-right pr-2 font-mono font-black text-xs">
                            ₹{parsedPOData.calcs.finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                      </tbody>
                    </table>
                  </div>

                  {/* 6. BOTTOM ROW: TOTAL IN WORDS, T&C & SIGNATORY */}
                  <div className="po-cell-border-t">
                    
                    <div className="p-2 po-cell-border-b text-xs">
                      <span className="font-extrabold text-black uppercase">Total amount in words:</span> <span className="font-black uppercase text-slate-900 ml-1 text-xs">{numberToWords(parsedPOData.calcs.finalAmount)}</span>
                    </div>

                    <div className="flex min-h-28">
                      {/* Left Side: Terms and Conditions */}
                      <div className="w-[65%] po-cell-border-r p-2 space-y-1 text-xs">
                        <p className="font-extrabold underline uppercase text-xs text-black">Terms & Conditions :</p>
                        <p className="uppercase leading-normal font-bold text-slate-600 whitespace-pre-wrap">{parsedPOData.termsAndConditions}</p>
                      </div>
                      
                      {/* Right Side: Signatory Box */}
                      <div className="w-[35%] flex flex-col justify-between items-center p-2 relative min-h-[112px]">
                        <p className="font-bold text-xs text-center leading-tight">For {parsedPOData.authorizedSignatory}</p>
                        
                        {/* FARMER ERP STAMP */}
                        <div className="my-1 border-2 border-double border-blue-600/80 rounded-full w-[70px] h-[70px] flex flex-col items-center justify-center rotate-[-10deg] scale-90 select-none opacity-85 pointer-events-none font-mono bg-white/40 shadow-sm print:opacity-100">
                          <span className="text-[6.5px] font-black text-blue-700 tracking-wider leading-none">FARMER ERP</span>
                          <div className="w-10 h-[0.5px] bg-blue-500/50 my-0.5"></div>
                          <span className="text-[8px] font-extrabold text-blue-600 leading-none">STAMP</span>
                          <div className="w-10 h-[0.5px] bg-blue-500/50 my-0.5"></div>
                          <span className="text-[5.5px] text-blue-500 font-bold uppercase tracking-tight leading-none">AUTHORIZED</span>
                        </div>

                        <p className="font-bold text-xs text-slate-800 underline uppercase tracking-wide">Authorized Signatory</p>
                      </div>
                    </div>

                    {/* Computer generated disclaimer */}
                    <div className="p-1 border-t-[1px] border-black text-center text-[8.5px] font-semibold text-slate-500 tracking-wider">
                      This is Computer Generated Invoice
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
