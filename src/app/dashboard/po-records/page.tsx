"use client";

import { useEffect, useState, useMemo } from "react";
import { getPOHistory, markPOAsBilled } from "@/app/actions/po";
import { 
  FileText, Loader2, Calendar, Edit3, CheckCircle, Printer, Eye, X, AlertTriangle, AlertCircle, Download
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

export default function PORecordsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billedConfirmPO, setBilledConfirmPO] = useState<any | null>(null);
  const [isBilling, setIsBilling] = useState(false);
  const [previewPO, setPreviewPO] = useState<any | null>(null);
  const [downloadPO, setDownloadPO] = useState<any | null>(null);

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
      name: targetPO.companyName || "XYZ Pvt Ltd",
      address: targetPO.companyAddress || "123 Sample Address, Sample City, State 123456",
      gstNo: "GST/PAN No.: xxxxxxxxxxxxx",
      mobile: "Mobile no.: xxxxxxxxxxx",
      email: "Email Id: xxxxxxxxxxx"
    };
    
    const vendor = parsed.vendor || {
      name: targetPO.supplierName || "",
      address: targetPO.supplierLocation || "",
      gstNo: "",
      mobile: "",
      email: ""
    };
    
    const delivery = parsed.delivery || {
      name: targetPO.companyName || "XYZ Pvt Ltd",
      address: targetPO.companyAddress || "123 Sample Address, Sample City, State 123456",
      gstNo: "GST/PAN No.: xxxxxxxxxxxxx",
      mobile: "Mobile no.: xxxxxxxxxxx",
      email: "Email Id: xxxxxxxxxxx"
    };

    const poNumber = targetPO.poNumber || `PO-${targetPO.slipId}`;
    const poDate = parsed.poDate || (targetPO.createdAt ? new Date(targetPO.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    const paymentTerms = parsed.paymentTerms || "-";
    const deliveryTerms = parsed.deliveryTerms || "-";
    const termsAndConditions = parsed.termsAndConditions || "THE INSTRUMENT CONTAINS ALL THE TERMS AND CONDITIONS WITH RESPECT TO PURCHASE OF THE MATERIAL OR SERVICES NAMED HEREIN.\nNO MODIFICATION OR AMENDMENT SHALL HAVE ANY FORCE OR EFFECT UNLESS CONFIRMED BY BUYERS IN WRITING.";
    const authorizedSignatory = parsed.authorizedSignatory || targetPO.companyName || "XYZ Pvt Ltd";
    
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
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
            className="text-xs font-bold text-white bg-forest-600 px-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors shadow-sm"
          >
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Total</th>
                  <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Date</th>
                  <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 w-48"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
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
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
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
                            <button
                              onClick={() => router.push(`/dashboard/po-maker?slipId=${rec.slipId}`)}
                              className="px-2.5 py-1.5 text-slate-500 hover:text-forest-700 hover:bg-forest-50 border border-slate-200 hover:border-forest-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-sm"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* PO Preview / Download Hidden Container */}
      {(previewPO || downloadPO) && parsedPOData && (
        <div className={previewPO ? "fixed inset-0 z-50 flex items-center justify-center p-4 no-print overflow-y-auto" : "hidden print:block absolute top-0 left-0 w-full"}>
          {previewPO && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-fade" onClick={() => setPreviewPO(null)} />}
          <div className={previewPO ? "relative w-full max-w-[230mm] bg-white rounded-3xl shadow-2xl p-6 modal-spring my-8 max-h-[90vh] overflow-y-auto flex flex-col" : "bg-white p-0 m-0 w-full"}>
            
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
            <div className="flex-1 overflow-x-auto bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 flex justify-center">
              <div id="printable-po" className="w-[210mm] min-w-[210mm] bg-white text-black p-6 text-[11px] leading-tight font-sans shadow-sm border border-slate-200">
                
                <style>{`
                  @media print {
                    @page { size: A4 portrait; margin: 8mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white !important; }
                    body * { visibility: hidden; }
                    #printable-po, #printable-po * { visibility: visible; }
                    #printable-po {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      transform: none !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: white !important;
                    }
                    .print-hide, .print-hide * {
                      visibility: hidden !important;
                      display: none !important;
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

                <div className="po-grid-border flex flex-col min-h-[268mm] justify-between">
                  <div>
                    
                    {/* 1. LOGO & HEADER ROW */}
                    <div className="flex po-cell-border-b h-14 items-center">
                      <div className="w-[20%] po-cell-border-r h-full flex items-center justify-center p-1">
                        <div className="font-serif font-black italic text-base tracking-wide border-2 border-black p-1 text-center leading-none uppercase">
                          LOGO
                        </div>
                      </div>
                      <div className="w-[60%] text-center">
                        <h1 className="text-lg font-black tracking-widest uppercase">PURCHASE ORDER</h1>
                        <h2 className="text-sm font-bold uppercase">{parsedPOData.billing.name || "XYZ Pvt Ltd"}</h2>
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
                        <p className="font-bold underline uppercase text-[10px] text-slate-700">Vender:</p>
                        <p className="font-black text-xs uppercase">{parsedPOData.vendor.name || "ABC PVT LTD"}</p>
                        <p className="uppercase leading-tight text-[10px] whitespace-pre-wrap font-medium">{parsedPOData.vendor.address || "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}</p>
                        <div className="pt-0.5 space-y-0.5 text-[10px]">
                          <p><span className="font-bold">GST/PAN No.:</span> {parsedPOData.vendor.gstNo || "xxxxxxxxxxxxx"}</p>
                          <p><span className="font-bold">Mobile no.:</span> {parsedPOData.vendor.mobile || "xxxxxxxxxxx"}</p>
                          <p><span className="font-bold">Email Id:</span> {parsedPOData.vendor.email || "xxxxxxxxxxx"}</p>
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
                        
                        <div className="p-2 space-y-1 flex-1 flex flex-col justify-center text-[10px]">
                          <p><span className="font-bold">Payment Terms:</span> {parsedPOData.paymentTerms}</p>
                          <p><span className="font-bold">DELIVERY:</span> {parsedPOData.deliveryTerms || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3. BILLING & DELIVERY ADDRESS ROW */}
                    <div className="flex po-cell-border-b h-24">
                      {/* Billing Address */}
                      <div className="w-1/2 po-cell-border-r p-2 space-y-0.5">
                        <p className="font-bold underline text-[10px] text-slate-700">Billing Address:</p>
                        <p className="font-bold uppercase text-[10px]">{parsedPOData.billing.name || "XYZ PVT LTD"}</p>
                        <p className="uppercase leading-none text-[9.5px] whitespace-pre-wrap font-medium">{parsedPOData.billing.address || "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}</p>
                        <div className="text-[9.5px] pt-1 font-medium text-slate-700">
                          <p><span className="font-semibold">GST/PAN:</span> {parsedPOData.billing.gstNo || "xxxxxxxxxxxxx"}</p>
                          <p><span className="font-semibold">Mobile:</span> {parsedPOData.billing.mobile || "xxxxxxxxxxx"}</p>
                          <p><span className="font-semibold">Email:</span> {parsedPOData.billing.email || "xxxxxxxxxxx"}</p>
                        </div>
                      </div>
                      
                      {/* Delivery Address */}
                      <div className="w-1/2 p-2 space-y-0.5">
                        <p className="font-bold underline text-[10px] text-slate-700">Delivery Address:</p>
                        <p className="font-bold uppercase text-[10px]">{parsedPOData.delivery.name || "XYZ PVT LTD"}</p>
                        <p className="uppercase leading-none text-[9.5px] whitespace-pre-wrap font-medium">{parsedPOData.delivery.address || "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}</p>
                        <div className="text-[9.5px] pt-1 font-medium text-slate-700">
                          <p><span className="font-semibold">GST/PAN:</span> {parsedPOData.delivery.gstNo || "xxxxxxxxxxxxx"}</p>
                          <p><span className="font-semibold">Mobile:</span> {parsedPOData.delivery.mobile || "xxxxxxxxxxx"}</p>
                          <p><span className="font-semibold">Email:</span> {parsedPOData.delivery.email || "xxxxxxxxxxx"}</p>
                        </div>
                      </div>
                    </div>

                    {/* 4. ITEMS TABLE */}
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="po-cell-border-b font-bold bg-slate-50 text-[10px]">
                          <th className="po-table-cell-border p-1 w-[6%]">Sr. No.</th>
                          <th className="po-table-cell-border p-1 w-[40%] text-left px-2">Farmer Name & Code</th>
                          <th className="po-table-cell-border p-1 w-[18%]">Description</th>
                          <th className="po-table-cell-border p-1 w-[8%]">Packing</th>
                          <th className="po-table-cell-border p-1 w-[10%]">No. of Bag</th>
                          <th className="po-table-cell-border p-1 w-[10%]">Quantity (Qtl.)</th>
                          <th className="po-table-cell-border p-1 w-[12%] text-right pr-2">Rate</th>
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
                    
                    <div className="p-2 po-cell-border-b text-[10px]">
                      <span className="font-bold">Total amount in words:</span> <span className="font-semibold uppercase text-slate-800 ml-1">{numberToWords(parsedPOData.calcs.finalAmount)}</span>
                    </div>

                    <div className="flex min-h-24">
                      {/* Left Side: Terms and Conditions */}
                      <div className="w-[65%] po-cell-border-r p-2 space-y-1 text-[9.5px]">
                        <p className="font-bold text-slate-700">Terms & Conditions :</p>
                        <p className="uppercase leading-normal font-medium text-slate-600 whitespace-pre-wrap">{parsedPOData.termsAndConditions}</p>
                      </div>
                      
                      {/* Right Side: Signatory Box */}
                      <div className="w-[35%] flex flex-col justify-between items-center p-2">
                        <p className="font-bold text-[10px] text-center">For {parsedPOData.authorizedSignatory}.</p>
                        <p className="font-bold text-[10.5px] text-slate-800 underline uppercase tracking-wide">Authorized Signatory</p>
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
    </div>
  );
}
