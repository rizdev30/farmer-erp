"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPOBySlipId, savePO } from "@/app/actions/po";
import { 
  FileText, Search, Plus, Trash2, Save, Printer, ArrowLeft, Loader2, Calendar, CheckCircle2 
} from "lucide-react";
import { useToast } from "@/components/Toast";

function POMakerForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const initialSlipId = searchParams.get("slipId") || "";

  const [slipIdInput, setSlipIdInput] = useState(initialSlipId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poData, setPoData] = useState<any>(null);

  // Form states
  const [companyName, setCompanyName] = useState("Farmer ERP");
  const [companyAddress, setCompanyAddress] = useState("123 Sample Address, Sample City, State 123456");
  const [supplierName, setSupplierName] = useState("");
  const [supplierLocation, setSupplierLocation] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [paymentDuration, setPaymentDuration] = useState(10);
  
  // Sensorial Parameters State
  const [params, setParams] = useState({
    moisture: "12.5% (Max)",
    broken: "2.0% (Max)3/4 only",
    damaged: "1.00%",
    immature: "<2.0",
    chalky: "13% Max (Hafe to full)",
    green: "6% Max",
    red: "Nil",
    avgLength: "7.80 mm",
    admixture: "2.0% (max)",
    aflatoxin: "BLQ",
    paddyGrain: "3 Max",
    whiteness: "N/A",
    foreignMatter: "Nil",
    ferrous: "Nil",
    badSmell: "Not Acceptable",
    materialAppearance: "Good",
    infestation: "Nil",
    purity: "98%>(DNA)",
    ochratoxin: "BLQ"
  });

  // Overrides State
  const [hsnCode, setHsnCode] = useState("1063020");
  const [packingSize, setPackingSize] = useState(50);
  const [gstPercent, setGstPercent] = useState(0);
  const [manualNetQty, setManualNetQty] = useState<number | "">("");
  const [manualRate, setManualRate] = useState<number | "">("");
  const [manualCrop, setManualCrop] = useState("");
  const [manualVariety, setManualVariety] = useState("");

  // PO Calculation States
  const [originalProcurement, setOriginalProcurement] = useState<any>(null);
  const [poBags, setPoBags] = useState(0);
  
  type DynamicItem = {
    id: string;
    description: string;
    calcType: 'PERCENTAGE' | 'FLAT' | 'PER_QTL';
    value: number;
    effect: 'ADD' | 'DEDUCT';
  };
  const [items, setItems] = useState<DynamicItem[]>([]);

  useEffect(() => {
    if (initialSlipId) {
      fetchPO(initialSlipId);
    }
  }, [initialSlipId]);

  const fetchPO = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data: any = await getPOBySlipId(id);
      setPoData(data);
      setCompanyName(data.companyName);
      setCompanyAddress(data.companyAddress);
      setSupplierName(data.supplierName);
      setSupplierLocation(data.supplierLocation);
      setPoNumber(data.poNumber || `PO-${id}`);
      setPaymentDuration(data.paymentDuration || 10);
      
      if (data.procurement) {
        setOriginalProcurement(data.procurement);
        setPoBags(data.procurement.bags);
        setManualRate(data.procurement.rate);
        setManualCrop(data.procurement.crop);
        setManualVariety(data.procurement.variety);
        // Default manualNetQty to empty to use auto-calculation based on bags initially
        setManualNetQty("");
      }

      try {
        const parsedItems = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
        // Support backward compatibility if items contained the parameters
        if (parsedItems.length === 0) {
          setItems([
            { id: '1', description: 'CASH DISCOUNT (CD)', calcType: 'PERCENTAGE', value: 2, effect: 'DEDUCT' },
            { id: '2', description: 'BROKERAGE', calcType: 'PERCENTAGE', value: 0, effect: 'DEDUCT' },
            { id: '3', description: 'DANA CHARGES', calcType: 'PER_QTL', value: 0, effect: 'DEDUCT' },
            { id: '4', description: 'SAMPLING', calcType: 'FLAT', value: 0, effect: 'DEDUCT' }
          ]);
        } else {
          setItems(parsedItems.itemsList || parsedItems);
          if (parsedItems.params) setParams(parsedItems.params);
          if (parsedItems.overrides) {
            setHsnCode(parsedItems.overrides.hsnCode ?? "1063020");
            setPackingSize(parsedItems.overrides.packingSize ?? 50);
            setGstPercent(parsedItems.overrides.gstPercent ?? 0);
            setManualNetQty(parsedItems.overrides.manualNetQty ?? "");
            setManualRate(parsedItems.overrides.manualRate ?? "");
            setManualCrop(parsedItems.overrides.manualCrop ?? "");
            setManualVariety(parsedItems.overrides.manualVariety ?? "");
          }
        }
      } catch (e) {
        setItems([]);
      }
      
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to fetch procurement record"
      });
      setPoData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (slipIdInput.trim()) {
      fetchPO(slipIdInput.trim());
      // Update URL without full reload
      router.replace(`/dashboard/po-maker?slipId=${slipIdInput.trim()}`, { scroll: false });
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), description: "", calcType: 'FLAT', value: 0, effect: 'ADD' }]);
  };

  const updateItem = (id: string, field: keyof DynamicItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculatePaymentDate = (duration: number) => {
    const date = new Date();
    date.setDate(date.getDate() + duration);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  // Calculations
  const getCalculations = () => {
    if (!originalProcurement) return null;
    
    // Pro-rata based on bags for auto calculation
    const originalBags = originalProcurement.bags || 1;
    const ratio = poBags / originalBags;
    
    // Determine Net Quantity and Rate (Use manual if provided, else auto)
    const autoNetQty = (originalProcurement.grossQuantity * ratio) - (originalProcurement.deduction * poBags);
    const netQuantity = manualNetQty !== "" ? Number(manualNetQty) : autoNetQty;
    const rate = manualRate !== "" ? Number(manualRate) : originalProcurement.rate;
    
    const subtotal = netQuantity * rate;
    const gstAmount = subtotal * (gstPercent / 100);
    const subtotalWithGst = subtotal + gstAmount;

    let totalAdditions = 0;
    let totalDeductions = 0;

    const calculatedItems = items.map(item => {
      let calculatedAmount = 0;
      if (item.calcType === 'PERCENTAGE') {
        calculatedAmount = (item.value / 100) * subtotal;
      } else if (item.calcType === 'PER_QTL') {
        calculatedAmount = item.value * netQuantity;
      } else {
        calculatedAmount = item.value;
      }

      if (item.effect === 'ADD') {
        totalAdditions += calculatedAmount;
      } else {
        totalDeductions += calculatedAmount;
      }
      return { ...item, calculatedAmount };
    });

    const finalTotal = subtotalWithGst + totalAdditions - totalDeductions;

    return {
      netQuantity,
      rate,
      subtotal,
      gstAmount,
      subtotalWithGst,
      calculatedItems,
      finalTotal,
      totalAdditions,
      totalDeductions
    };
  };

  const calcs = getCalculations();

  const handleSave = async () => {
    if (!poData) return;
    setSaving(true);
    try {
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() + paymentDuration);

      await savePO({
        slipId: poData.slipId,
        poNumber,
        companyName,
        companyAddress,
        supplierName,
        supplierLocation,
        paymentDuration,
        paymentDate,
        items: { 
          itemsList: items, 
          params,
          overrides: {
            hsnCode,
            packingSize,
            gstPercent,
            manualNetQty,
            manualRate,
            manualCrop,
            manualVariety
          }
        },
      });
      addToast({
        type: "success",
        title: "Success",
        message: "Purchase Order saved successfully"
      });
      router.push('/dashboard/po-records');
    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to save PO"
      });
    } finally {
      setSaving(false);
    }
  };
  const handlePrint = () => {
    const originalTitle = document.title;
    // Format PO Number and Supplier Name for a safe, readable filename
    const safePoNumber = poNumber.replace(/[\/\\]/g, '-') || 'Document';
    // Remove special characters from supplier name and replace spaces with underscores
    const safeSupplier = supplierName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    // e.g., PO_Amba_Grains_SOPL-25-26-14
    const safeFilename = `PO_${safeSupplier ? safeSupplier + '_' : ''}${safePoNumber}`;
    document.title = safeFilename;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="max-w-[100vw] mx-auto min-h-screen flex flex-col xl:flex-row pb-24 xl:pb-0 overflow-hidden">
      
      {/* LEFT SIDE: CONTROLS */}
      <div className="w-full xl:w-[45%] h-full xl:max-h-screen xl:overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 border-r border-slate-200 print:hidden pb-32 xl:pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all shrink-0"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">PO Maker Control Panel</h1>
            <p className="text-sm text-slate-500">Changes here reflect instantly on the right.</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="bg-white border border-slate-200 p-3 rounded-2xl flex gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Slip ID (e.g. FE-...)"
              value={slipIdInput}
              onChange={(e) => setSlipIdInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !slipIdInput.trim()}
            className="px-5 py-2.5 bg-forest-600 text-white font-medium rounded-xl hover:bg-forest-700 active:bg-forest-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Fetch"}
          </button>
        </form>

        {poData && (
          <div className="space-y-6">
            
            {/* Header & Basic Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Company & PO Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Company Name</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full text-sm font-semibold border-b border-slate-200 py-1 focus:border-forest-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">PO Number</label>
                  <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="w-full text-sm font-semibold border-b border-slate-200 py-1 focus:border-forest-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Company Address</label>
                  <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} className="w-full text-sm border-b border-slate-200 py-1 focus:border-forest-500 focus:outline-none resize-none" />
                </div>
              </div>
            </div>

            {/* Supplier & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier</h3>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Supplier Name</label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full text-sm font-semibold border-b border-slate-200 py-1 focus:border-forest-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Supplier Location</label>
                  <input type="text" value={supplierLocation} onChange={(e) => setSupplierLocation(e.target.value)} className="w-full text-sm border-b border-slate-200 py-1 focus:border-forest-500 focus:outline-none" />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Terms</h3>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase">Duration</label>
                  <div className="flex gap-2">
                    {[10, 20, 30].map(days => (
                      <button key={days} type="button" onClick={() => setPaymentDuration(days)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${paymentDuration === days ? "bg-forest-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{days} Days</button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Exp. Date: <span className="font-bold text-forest-700">{calculatePaymentDate(paymentDuration)}</span></p>
              </div>
            </div>

            {/* Procurement Slip Fetched Details & Bag Calculation */}
            {originalProcurement && calcs && (
              <div className="bg-blue-50/50 rounded-2xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-100/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-blue-800 uppercase">Fetched Procurement</h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">{originalProcurement.crop}</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 block mb-1">Procured Bags</span>
                      <span className="font-bold text-slate-700">{originalProcurement.bags}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-blue-600 font-bold block mb-1">Make PO For (Bags)</span>
                      <input type="number" value={poBags} onChange={(e) => setPoBags(Number(e.target.value))} className="w-full border-b-2 border-blue-300 bg-transparent text-lg font-black text-blue-700 focus:outline-none focus:border-blue-600 py-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editable Item Details */}
            {originalProcurement && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item Details & Pricing</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">HSN Code</label>
                    <input type="text" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-forest-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Packing (kg)</label>
                    <input type="number" value={packingSize || ""} onChange={(e) => setPackingSize(Number(e.target.value) || 0)} placeholder="50" className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-forest-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">GST %</label>
                    <input type="number" value={gstPercent || ""} onChange={(e) => setGstPercent(Number(e.target.value) || 0)} placeholder="0" className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-forest-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Crop Name</label>
                    <input type="text" value={manualCrop} onChange={(e) => setManualCrop(e.target.value)} className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-forest-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Crop Variety (Compliance)</label>
                    <input type="text" value={manualVariety} onChange={(e) => setManualVariety(e.target.value)} className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-forest-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-blue-600 block mb-1 uppercase">Rate Override (₹)</label>
                    <input type="number" placeholder="Auto" value={manualRate} onChange={(e) => setManualRate(e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-blue-600 block mb-1 uppercase">Net Qty Override (Qtl)</label>
                    <input type="number" placeholder="Auto (Leaves it to Bag Calculation)" value={manualNetQty} onChange={(e) => setManualNetQty(e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm font-bold text-slate-800 border-b border-slate-200 py-1.5 focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Items Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deductions / Additions</h3>
                <button type="button" onClick={addItem} className="text-[10px] font-bold text-forest-600 bg-forest-50 px-2 py-1 rounded hover:bg-forest-100 transition-colors flex items-center gap-1"><Plus size={12} /> Add</button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex flex-wrap gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Desc" className="flex-[2] min-w-[120px] text-xs bg-transparent border-b border-slate-200 focus:outline-none focus:border-forest-500 py-1 font-semibold" />
                    <select value={item.effect} onChange={(e) => updateItem(item.id, 'effect', e.target.value)} className={`flex-1 min-w-[60px] text-xs bg-transparent border-b border-slate-200 focus:outline-none font-bold ${item.effect === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                      <option value="ADD">(+)</option>
                      <option value="DEDUCT">(-)</option>
                    </select>
                    <select value={item.calcType} onChange={(e) => updateItem(item.id, 'calcType', e.target.value)} className="flex-[1.5] min-w-[80px] text-xs bg-transparent border-b border-slate-200 focus:outline-none">
                      <option value="PERCENTAGE">%</option>
                      <option value="FLAT">Flat ₹</option>
                      <option value="PER_QTL">₹/Qtl</option>
                    </select>
                    <input type="number" value={item.value || ''} onChange={(e) => updateItem(item.id, 'value', parseFloat(e.target.value) || 0)} placeholder="0" className="flex-1 min-w-[60px] text-xs bg-transparent border-b border-slate-200 text-right font-bold focus:outline-none tabular-nums" />
                    <button type="button" onClick={() => removeItem(item.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensory Parameters Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sensorial Characteristics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {Object.entries(params).map(([key, value]) => (
                  <div key={key} className="flex flex-col border-b border-slate-100 pb-1">
                    <label className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input 
                      type="text" 
                      value={value} 
                      onChange={(e) => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:text-forest-700" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions (Sticky on Mobile, Regular on Desktop) */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-40 flex justify-between gap-3 print:hidden xl:static xl:bottom-auto xl:left-auto xl:right-auto xl:p-0 xl:bg-transparent xl:border-none xl:shadow-none xl:z-auto xl:pt-4 xl:pb-12 xl:justify-end xl:backdrop-blur-none">
              <button onClick={handlePrint} className="flex-1 xl:flex-none justify-center px-4 xl:px-5 py-3 xl:py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-100 active:bg-slate-200 transition-all bg-white shadow-sm">
                <Printer size={18} className="xl:w-4 xl:h-4" /> <span className="hidden sm:inline xl:inline">Print Final PO</span><span className="sm:hidden">Print</span>
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 xl:flex-none justify-center px-4 xl:px-6 py-3 xl:py-2.5 bg-forest-600 text-white font-semibold rounded-xl hover:bg-forest-700 active:bg-forest-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md">
                {saving ? <Loader2 size={18} className="animate-spin xl:w-4 xl:h-4" /> : <Save size={18} className="xl:w-4 xl:h-4" />} 
                {saving ? "Saving..." : <><span className="hidden sm:inline xl:inline">Save PO to DB</span><span className="sm:hidden">Save PO</span></>}
              </button>
            </div>
            
          </div>
        )}
      </div>

      {/* RIGHT SIDE: LIVE PREVIEW */}
      <div className="w-full xl:w-[55%] h-full xl:max-h-screen xl:overflow-y-auto overflow-x-auto bg-slate-200/50 flex flex-col py-8 print:p-0 print:bg-white print:w-full print:block">
        
        {poData ? (
          <div className="w-[210mm] min-w-[210mm] mx-auto bg-white text-black shadow-2xl print:shadow-none p-4 sm:p-6 md:p-8 print:p-0 text-[10px] sm:text-[11px] print:text-[9.5px] font-sans leading-tight transform origin-top xl:scale-[0.85] 2xl:scale-100 transition-transform">
            
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                html, body { height: 100%; }
                .print-exact-a4 { width: 100% !important; max-width: none !important; }
              }
            `}</style>

            <div className="border-[1.5px] border-black print-exact-a4">
              {/* Header */}
              <div className="flex items-center border-b-[1.5px] border-black p-1.5 h-14">
                <div className="w-[20%]">
                  {/* LOGO Placeholder matching SHARSID style */}
                  <div className="text-amber-600 font-serif font-black italic text-xl tracking-wider px-2">FarmerERP</div>
                </div>
                <div className="w-[60%] text-center">
                  <h2 className="text-xl font-bold uppercase tracking-wide">PURCHASE ORDER</h2>
                  <h3 className="text-base font-bold">{companyName || "Sharsid Overseas Pvt Ltd"}</h3>
                </div>
                <div className="w-[20%]"></div>
              </div>

              {/* Info Grid - Vender / PO No */}
              <div className="flex border-b-[1.5px] border-black">
                {/* Left: Vender */}
                <div className="w-1/2 border-r-[1.5px] border-black p-1.5 space-y-0.5">
                  <p className="font-bold">Vender:</p>
                  <p className="font-bold uppercase">{supplierName || "AMBA GRAINS PRIVATE LIMITED"}</p>
                  <p className="uppercase">{supplierLocation || "JIND ROAD, NEAR ITI, KAITHAL, KAITHAL, Haryana, 136027"}</p>
                  <p>GSTIN: 06AAGCA3319R1ZD</p>
                </div>
                {/* Right: PO / Payment */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex border-b-[1.5px] border-black h-1/2">
                    <div className="w-[70%] border-r-[1.5px] border-black p-1.5 flex items-center">
                      <span className="font-bold mr-1">P.O. No.:</span> {poNumber || "SOPL/25-26/14"}
                    </div>
                    <div className="w-[30%] p-1.5 flex items-center">
                      <span className="mr-1">Dated:</span> {new Date().toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className="p-1.5 space-y-0.5 flex-1 flex flex-col justify-center">
                    <p><span className="font-bold">Payment Terms:</span> {paymentDuration} day after delivery</p>
                    <p><span className="font-bold">ORIGIN:</span> INDIAN ORIGIN</p>
                    <p><span className="font-bold">DELIVERY:</span> (Ex-Mill)</p>
                  </div>
                </div>
              </div>

              {/* Billing / Delivery Addresses */}
              <div className="flex border-b-[1.5px] border-black h-20">
                <div className="w-1/2 border-r-[1.5px] border-black p-1.5 space-y-0.5">
                  <p className="font-bold">Billing Address:</p>
                  <p className="font-bold uppercase">{companyName || "SHARSID OVERSEAS PVT LTD"}</p>
                  <p className="uppercase whitespace-pre-wrap leading-tight">{companyAddress || "SURVEY NO. 47/1, GODOWN NO. 6, BHARPARA, KIDANA, GANDHIDHAM, KUCHCHH, GUJARAT-370205\nGSTIN: 24AAXCS2256A1ZD"}</p>
                </div>
                <div className="w-1/2 p-1.5 space-y-0.5">
                  <p className="font-bold">Delivery Address:</p>
                  <p className="font-bold uppercase">{companyName || "SHARSID OVERSEAS PVT LTD"}</p>
                  <p className="uppercase whitespace-pre-wrap leading-tight">{companyAddress || "SURVEY NO. 47/1, GODOWN NO. 6, BHARPARA, KIDANA, GANDHIDHAM, KUCHCHH, GUJARAT-370205"}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b-[1.5px] border-black font-bold bg-white text-[10px]">
                    <th className="border-r border-black p-1">Sr. No.</th>
                    <th className="border-r border-black p-1">HSN Code</th>
                    <th className="border-r border-black p-1 w-[35%]">Description of Goods</th>
                    <th className="border-r border-black p-1">Packing</th>
                    <th className="border-r border-black p-1">Unit</th>
                    <th className="border-r border-black p-1">No. of<br/>Bag</th>
                    <th className="border-r border-black p-1">Quantity<br/>(MT)</th>
                    <th className="border-r border-black p-1">Rate</th>
                    <th className="border-r border-black p-1">GST%</th>
                    <th className="p-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-[1.5px] border-black">
                    <td className="border-r border-black p-1">1</td>
                    <td className="border-r border-black p-1">{hsnCode}</td>
                    <td className="border-r border-black p-1 text-left font-semibold uppercase px-2">{manualCrop || originalProcurement?.crop} {manualVariety || originalProcurement?.variety}</td>
                    <td className="border-r border-black p-1">{packingSize ? packingSize.toFixed(2) : ""}</td>
                    <td className="border-r border-black p-1">kg</td>
                    <td className="border-r border-black p-1">{poBags || ""}</td>
                    <td className="border-r border-black p-1">{calcs?.netQuantity ? (calcs.netQuantity / 10).toFixed(2) : ""}</td>
                    <td className="border-r border-black p-1">{calcs?.rate ? calcs.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</td>
                    <td className="border-r border-black p-1">{gstPercent > 0 ? `${gstPercent}%` : ""}</td>
                    <td className="p-1">{calcs?.subtotal ? `₹ ${calcs.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : ""}</td>
                  </tr>
                  {/* Empty spacer row mimicking image */}
                  <tr className="h-2 border-b-[1.5px] border-black">
                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                  </tr>
                  <tr className="border-b border-black">
                    <td colSpan={9} className="border-r border-black font-bold p-0.5">Total</td>
                    <td className="p-0.5">₹ {calcs?.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</td>
                  </tr>
                  {gstPercent > 0 && (
                    <tr className="border-b border-black">
                      <td colSpan={9} className="border-r border-black font-bold p-0.5">GST ({gstPercent}%)</td>
                      <td className="p-0.5">₹ {calcs?.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</td>
                    </tr>
                  )}
                  <tr className="border-b-[1.5px] border-black">
                    <td colSpan={9} className="border-r border-black font-bold text-right p-0.5">Amount Total</td>
                    <td className="p-0.5 font-bold">₹ {calcs?.subtotalWithGst.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</td>
                  </tr>
                  {calcs && (calcs.totalAdditions > 0 || calcs.totalDeductions > 0) && (
                    <>
                      {calcs.totalAdditions > 0 && (
                        <tr className="border-b-[1.5px] border-black text-green-700">
                          <td colSpan={9} className="border-r border-black text-right p-0.5">Additions (+)</td>
                          <td className="p-0.5">₹ {calcs.totalAdditions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {calcs.totalDeductions > 0 && (
                        <tr className="border-b-[1.5px] border-black text-red-700">
                          <td colSpan={9} className="border-r border-black text-right p-0.5">Deductions (-)</td>
                          <td className="p-0.5">₹ {calcs.totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr className="border-b-[1.5px] border-black">
                    <td colSpan={9} className="border-r border-black text-right p-0.5">Round Off(±)</td>
                    <td className="p-0.5">₹ -</td>
                  </tr>
                  <tr className="border-b-[1.5px] border-black bg-slate-50/20">
                    <td colSpan={9} className="border-r border-black font-bold text-right p-1 px-2 text-[11px]">Final Amount</td>
                    <td className="p-1 font-bold text-[11px]">₹ {calcs?.finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Terms & Conditions */}
              <div className="p-1.5 pb-2 text-[9px] sm:text-[10px] print:text-[8.5px]">
                <p className="font-bold mb-0.5">Terms & Conditions :</p>
                <p className="mb-1.5 leading-tight uppercase">THE INSTRUMENT CONTAINS ALL THE TERMS AND CONDITIONS WITH RESPECT TO PURCHASE OF THE MATERIAL OR SERVICES NAMED HEREIN.<br/>NO MODIFICATION OR AMENDMENT TO SHALL HAVE ANY FORCE OR EFFECT UNLESS CONFIRMED BY BUYERS IN WRITING.</p>
                
                {/* Deductions Table */}
                <table className="w-[65%] border-collapse border border-black mb-2 font-semibold">
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-black p-0.5 px-1">{item.description}:</td>
                        <td className="border border-black p-0.5 px-1 w-1/3">
                          {item.value ? (
                            item.calcType === 'PERCENTAGE' ? `${item.value.toFixed(2)}%` : 
                            item.calcType === 'PER_QTL' ? (item.description.includes('DANA') ? `${item.value}g` : `₹${item.value}/Qtl`) : 
                            `₹${item.value}`
                          ) : ""}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} className="border border-black p-0.5 text-center font-bold">
                        Packed in {packingSize || 50} Kg New PP Bag
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Sensorial characteristics */}
                <p className="font-bold mb-1">Physical and sensorial characteristics:</p>
                <table className="w-full border-collapse border border-black mb-2 text-left">
                  <tbody>
                    <tr className="font-bold text-center">
                      <td className="border border-black p-0.5 w-1/4">Parameter</td>
                      <td className="border border-black p-0.5 w-1/4">Value</td>
                      <td className="border border-black p-0.5 w-1/4">Parameter</td>
                      <td className="border border-black p-0.5 w-1/4">Value</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Moisture</td>
                      <td className="border border-black p-0.5 px-1">{params.moisture}</td>
                      <td className="border border-black p-0.5 px-1">Paddy Grain Pieces/kg</td>
                      <td className="border border-black p-0.5 px-1">{params.paddyGrain}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Broken</td>
                      <td className="border border-black p-0.5 px-1">{params.broken}</td>
                      <td className="border border-black p-0.5 px-1">Whiteness</td>
                      <td className="border border-black p-0.5 px-1">{params.whiteness}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Damaged, Discolour</td>
                      <td className="border border-black p-0.5 px-1">{params.damaged}</td>
                      <td className="border border-black p-0.5 px-1">Foreign Matter/Other Seed</td>
                      <td className="border border-black p-0.5 px-1">{params.foreignMatter}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Immature Grains</td>
                      <td className="border border-black p-0.5 px-1">{params.immature}</td>
                      <td className="border border-black p-0.5 px-1">Ferrous, Non-Ferrous/ Glass/Stone</td>
                      <td className="border border-black p-0.5 px-1">{params.ferrous}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Chalky Grain</td>
                      <td className="border border-black p-0.5 px-1">{params.chalky}</td>
                      <td className="border border-black p-0.5 px-1">Bad Smell</td>
                      <td className="border border-black p-0.5 px-1">{params.badSmell}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Green Grain</td>
                      <td className="border border-black p-0.5 px-1">{params.green}</td>
                      <td className="border border-black p-0.5 px-1">Material Appearance</td>
                      <td className="border border-black p-0.5 px-1">{params.materialAppearance}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Red Grain</td>
                      <td className="border border-black p-0.5 px-1">{params.red}</td>
                      <td className="border border-black p-0.5 px-1">Infestation Live/dead</td>
                      <td className="border border-black p-0.5 px-1">{params.infestation}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Avg. Grain Length (Minimum)</td>
                      <td className="border border-black p-0.5 px-1">{params.avgLength}</td>
                      <td className="border border-black p-0.5 px-1">Purity (Minimum)</td>
                      <td className="border border-black p-0.5 px-1">{params.purity}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-0.5 px-1">Admixture/Other Grains (Field)</td>
                      <td className="border border-black p-0.5 px-1">{params.admixture}</td>
                      <td className="border border-black p-0.5 px-1"></td>
                      <td className="border border-black p-0.5 px-1"></td>
                    </tr>
                    <tr className="!bg-yellow-300 font-bold print:bg-yellow-300" style={{ backgroundColor: '#fde047', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="border border-black p-0.5 px-1">Aflatoxin</td>
                      <td className="border border-black p-0.5 px-1">{params.aflatoxin}</td>
                      <td className="border border-black p-0.5 px-1">Ochratoxin</td>
                      <td className="border border-black p-0.5 px-1">{params.ochratoxin}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="font-bold mb-1">REMARKS: <span className="font-normal">Pesticide pass condition, no tolerance limit accepted</span></p>
                <p className="text-red-600 font-bold mb-2">If the initial sample fails to meet specified standards, the costs of all subsequent sampling, inspection, and testing shall be deducted from the Vendor's invoice.</p>
              </div>

              {/* Footer Signature Block */}
              <div className="flex justify-between p-1.5 border-t-[1.5px] border-black">
                <div className="w-[60%] text-[7px] print:text-[6.5px] text-justify space-y-0.5 pr-4">
                  <p className="font-bold uppercase">SANCTIONS COMPLIANCE</p>
                  <p>The Buyer has adopted a procedure, which can be consulted on the website www.sharsid.com, by which it has undertaken to comply with the laws on Sanctions imposed by national and international Governments and Bodies, applicable to its business activities, therefore the Seller is required, during the performance of this purchase contract, to undertake to comply with all applicable laws and regulations on economic and trade Sanctions imposed by any relevant governmental authority, including, but not limited to, Sanctions imposed by the United States, the European Union, the United Kingdom, the United Nations and any other relevant Governmental Body.</p>
                  <p>In the event of any violation of Sanction laws or subjection to Sanctions, the Buyer shall have the right to immediately terminate this purchase contract without any additional liability, without prejudice to the right to claim damages.</p>
                </div>
                <div className="w-[40%] flex flex-col items-center justify-end pb-1 relative">
                  {/* Stamp */}
                  <div className="absolute top-0 right-10 w-20 h-20 border-2 border-blue-800 rounded-full flex flex-col items-center justify-center opacity-40 rotate-[-15deg] pointer-events-none">
                    <span className="text-blue-800 font-bold text-[7px] text-center uppercase">{companyName || "SHARSID"}</span>
                    <span className="text-blue-800 font-bold text-[7px] text-center uppercase">PVT LTD</span>
                  </div>
                  <p className="font-bold uppercase text-[9px] mt-16 relative z-10">FOR {companyName || "SHARSID OVERSEAS PVT LTD"}</p>
                </div>
              </div>
            </div>
          </div>


          
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
            <FileText size={48} className="mb-4 opacity-50" />
            <p>Enter a Slip ID on the left to start generating the PO document.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function POMakerPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin text-forest-500" size={32} /></div>}>
      <POMakerForm />
    </Suspense>
  );
}
