"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  createProcurement,
  ProcurementReceipt,
} from "@/app/actions/procurement";
import { CROP_VARIETIES } from "@/lib/crop-varieties";
import { searchFarmers } from "@/app/actions/farmers";
import PurchaseSlip from "@/components/PurchaseSlip";
import {
  Search,
  Scale,
  Loader2,
  User,
  ShoppingCart,
  Shield,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useDebounce } from "@/lib/use-debounce";
import { useFormAutoSave } from "@/lib/form-autosave";
import { addToSyncQueue, detectNetworkQuality, getQueueCount } from "@/lib/offline-sync";
import { invalidateCache, setCacheData, prefetchCache } from "@/lib/swr-cache";
import { useToast } from "@/components/Toast";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getProcurementHistory } from "@/app/actions/procurement";

interface Farmer {
  id: number;
  name: string;
  phone: string;
  district: string;
  block: string;
  fatherName: string;
  farmerCode: string;
  village: string;
  category?: string;
  company?: string;
  promoterName?: string;
  panGst?: string;
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
}

export default function ProcurementPage() {
  // State
  const [farmerQuery, setFarmerQuery] = useState("");
  const [farmerResults, setFarmerResults] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [searchingFarmer, setSearchingFarmer] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("FARMER");

  const [cropItems, setCropItems] = useState([
    { id: '1', crop: "Rice", variety: "", bags: "", packingSize: "", grossQuantity: "", deduction: "", rate: "", bones: "" }
  ]);
  const [adtiyaName, setAdtiyaName] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<{index: number, type: 'crop' | 'variety'} | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  const [receipts, setReceipts] = useState<Extract<ProcurementReceipt, { success: true }>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [receipt, setReceipt] = useState<Extract<ProcurementReceipt, { success: true }> | null>(null);

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.roles?.includes("L4_ADMIN") || (session?.user as any)?.isSuperAdmin;


  // Live math
  const netQuantities = useMemo(() => {
    return cropItems.map(item => {
      const gross = parseFloat(item.grossQuantity) || 0;
      const ded = parseFloat(item.deduction) || 0;
      const b = parseInt(item.bags) || 0;
      return Math.max(0, Math.round((gross - ded * b) * 100) / 100);
    });
  }, [cropItems]);

  const total = useMemo(() => {
    return cropItems.reduce((acc, item, index) => {
      const r = parseFloat(item.rate) || 0;
      return acc + Math.round(netQuantities[index] * r * 100) / 100;
    }, 0);
  }, [netQuantities, cropItems]);

  const ringClass = categoryFilter === "TRADER" 
    ? "focus:ring-blue-500/30 focus:border-blue-500" 
    : "focus:ring-forest-500/30 focus:border-forest-500";

  const submitButtonClass = categoryFilter === "TRADER"
    ? "from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-blue-900/20"
    : "from-forest-800 to-forest-700 hover:from-forest-700 hover:to-forest-600 shadow-forest-900/20";

  // Debounce farmer search query — 400ms after user stops typing, min 2 chars
  const debouncedFarmerQuery = useDebounce(farmerQuery, 400, 2);

  // Toast notifications
  const { addToast } = useToast();

  // Form autosave — saves draft to localStorage with debounce
  const formData = useMemo(() => ({
    farmerId: selectedFarmer?.id,
    farmerName: selectedFarmer?.name,
    cropItems, adtiyaName, lotNo,
  }), [selectedFarmer, cropItems, adtiyaName, lotNo]);

  const { clearDraft, loadDraft, hasDraft } = useFormAutoSave({
    key: "procurement-form",
    data: formData,
    saveDelay: 1500,
    enabled: !!selectedFarmer,
  });

  // Farmer search — only fires after debounce
  useEffect(() => {
    if (!debouncedFarmerQuery || debouncedFarmerQuery.length < 2) {
      setFarmerResults([]);
      setSearchingFarmer(false);
      return;
    }

    setSearchingFarmer(true);
    let cancelled = false;
    searchFarmers(debouncedFarmerQuery, categoryFilter)
      .then((data) => {
        if (!cancelled) setFarmerResults(data as Farmer[]);
      })
      .catch(() => {
        if (!cancelled) setFarmerResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchingFarmer(false);
      });

    return () => { cancelled = true; };
  }, [debouncedFarmerQuery, categoryFilter]);

  // Offline queue count (from IndexedDB via NetworkStatusMonitor)
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getQueueCount().then(setOfflineCount).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.combobox-crop') && !target.closest('.combobox-variety')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  

  function resetForm() {
    setSelectedFarmer(null);
    setFarmerQuery("");
    setCropItems([{ id: '1', crop: "Rice", variety: "", bags: "", packingSize: "", grossQuantity: "", deduction: "", rate: "", bones: "" }]);
    setAdtiyaName("");
    setLotNo("");
    clearDraft();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmer) {
      setError("Please select a farmer");
      return;
    }
    
    // Validation
    for (let i = 0; i < cropItems.length; i++) {
      const item = cropItems[i];
      if (!item.grossQuantity || parseFloat(item.grossQuantity) <= 0) {
        setError(`Please enter a valid gross quantity for item ${i + 1}`);
        return;
      }
      if (!item.rate || parseFloat(item.rate) <= 0) {
        setError(`Please enter a valid rate for item ${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const networkStatus = await detectNetworkQuality();
    const isOffline = networkStatus === "offline" || networkStatus === "slow";
    
    let allReceipts: Extract<ProcurementReceipt, { success: true }>[] = [];
    let hasError = false;

    for (let i = 0; i < cropItems.length; i++) {
      const item = cropItems[i];
      const payload = {
        farmerId: selectedFarmer.id,
        farmerName: selectedFarmer.name,
        fatherName: selectedFarmer.fatherName,
        farmerCode: selectedFarmer.farmerCode,
        village: selectedFarmer.village,
        crop: item.crop,
        variety: item.variety,
        bags: parseInt(item.bags) || 0,
        packingSize: parseInt(item.packingSize) || 0,
        grossQuantity: parseFloat(item.grossQuantity),
        deduction: parseFloat(item.deduction) || 0,
        rate: parseFloat(item.rate),
        bones: parseFloat(item.bones) || 0,
        adtiyaName,
        lotNo,

      };
      
      const itemNetQuantity = netQuantities[i];
      const itemTotal = Math.round(itemNetQuantity * parseFloat(item.rate) * 100) / 100;

      if (isOffline) {
        const offlineId = `OFF-${Date.now().toString().slice(-5)}-${i}`;
        const offlineReceipt: Extract<ProcurementReceipt, { success: true }> = {
          success: true, invoiceId: Date.now() + i, slipId: offlineId,
          farmerName: payload.farmerName, farmerCode: payload.farmerCode || "",
          fatherName: payload.fatherName || "", village: payload.village || "",
          crop: payload.crop, variety: payload.variety, bags: payload.bags,
          packingSize: payload.packingSize, grossQuantity: payload.grossQuantity,
          deduction: payload.deduction, netQuantity: itemNetQuantity, rate: payload.rate,
          bones: payload.bones, adtiyaName: payload.adtiyaName, lotNo: payload.lotNo,
          total: itemTotal, timestamp: new Date().toISOString(),
          agentName: session?.user?.name || "Agent",
        };
        try {
          await addToSyncQueue("procurement", payload, offlineReceipt);
          allReceipts.push(offlineReceipt);
          setCacheData(`receipt-${offlineReceipt.slipId}`, offlineReceipt);
        } catch (err) {
          setError(`Failed to save item ${i + 1} offline.`);
          hasError = true;
          break;
        }
      } else {
        try {
          const result = await createProcurement(payload);
          if (!result.success) {
            setError(result.error || `Failed to create procurement for item ${i + 1}`);
            hasError = true;
            break;
          }
          allReceipts.push(result);
          setCacheData(`receipt-${result.slipId}`, result);
        } catch (err) {
          // Fallback to offline
          const offlineId = `OFF-${Date.now().toString().slice(-5)}-${i}`;
          const offlineReceipt: Extract<ProcurementReceipt, { success: true }> = {
            success: true, invoiceId: Date.now() + i, slipId: offlineId,
            farmerName: payload.farmerName, farmerCode: payload.farmerCode || "",
            fatherName: payload.fatherName || "", village: payload.village || "",
            crop: payload.crop, variety: payload.variety, bags: payload.bags,
            packingSize: payload.packingSize, grossQuantity: payload.grossQuantity,
            deduction: payload.deduction, netQuantity: itemNetQuantity, rate: payload.rate,
            bones: payload.bones, adtiyaName: payload.adtiyaName, lotNo: payload.lotNo,
            total: itemTotal, timestamp: new Date().toISOString(),
            agentName: session?.user?.name || "Agent",
          };
          try {
            await addToSyncQueue("procurement", payload, offlineReceipt);
            allReceipts.push(offlineReceipt);
            setCacheData(`receipt-${offlineReceipt.slipId}`, offlineReceipt);
          } catch(e) {
            hasError = true;
            break;
          }
        }
      }
    }

    if (!hasError && allReceipts.length > 0) {
      setReceipts(allReceipts);
      resetForm();
      
      if (isOffline) {
        const count = await getQueueCount();
        setOfflineCount(count);
        addToast({
          type: "offline",
          title: "Saved offline!",
          message: networkStatus === "slow"
            ? "Network is slow. Data saved locally and will auto-sync when network improves."
            : "No internet. Data saved locally and will auto-sync when you're back online.",
          duration: 8000,
        });
      } else {
        invalidateCache("dashboard-*");
        invalidateCache("history-*");
        prefetchCache("dashboard-stats", () => getDashboardStats());
        prefetchCache("history-records---", () => getProcurementHistory({}));
      }
    }
    
    setSubmitting(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
            <ShoppingCart size={20} className="text-forest-700" />
          </div>
          New Procurement
        </h1>
        <p className="text-slate-500 mt-2">
          Record a purchase from a registered farmer
        </p>
      </div>

      {offlineCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            {syncing ? <Loader2 size={16} className="text-amber-600 animate-spin" /> : <Shield size={16} className="text-amber-600" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800">
              {syncing ? "Syncing to Database..." : `${offlineCount} Offline Record${offlineCount > 1 ? 's' : ''} Pending`}
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              {syncing 
                ? "Please keep the app open while we save your offline data to the server." 
                : "You have procurements saved locally. They will automatically sync when your internet connection is restored."}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Farmer Select */}
        <div className="glass-card rounded-2xl p-5 relative z-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              1. Select Farmer/Trader
            </label>
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto sm:min-w-[240px]">
              <button
                type="button"
                onClick={() => setCategoryFilter("FARMER")}
                className={`flex-1 py-1 px-2 text-xs text-center font-semibold rounded-xl transition-all ${
                  categoryFilter === "FARMER" ? "bg-white text-forest-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("TRADER")}
                className={`flex-1 py-1 px-2 text-xs text-center font-semibold rounded-xl transition-all ${
                  categoryFilter === "TRADER" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Trader
              </button>
            </div>
          </div>

          {selectedFarmer ? (
            <div className={`p-4 rounded-xl border transition-all ${categoryFilter === "TRADER" ? "bg-blue-50/50 border-blue-200" : "bg-forest-50/50 border-forest-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${categoryFilter === "TRADER" ? "bg-blue-100" : "bg-forest-100"}`}>
                    <User size={16} className={categoryFilter === "TRADER" ? "text-blue-600" : "text-forest-600"} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${categoryFilter === "TRADER" ? "text-blue-800" : "text-forest-800"}`}>
                      {selectedFarmer.name}
                    </p>
                    <p className={`text-xs font-mono mt-0.5 ${categoryFilter === "TRADER" ? "text-blue-600" : "text-forest-600"}`}>
                      {selectedFarmer.farmerCode || "No Code"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="hidden sm:block">
                    <p className="text-xs text-slate-500">
                      {selectedFarmer.village ? selectedFarmer.village + ", " : ""}{selectedFarmer.district}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedFarmer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFarmer(null);
                      setFarmerQuery("");
                    }}
                    className={`text-xs font-medium underline ${categoryFilter === "TRADER" ? "text-blue-600 hover:text-blue-800" : "text-forest-600 hover:text-forest-800"}`}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Extended Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 mt-1">
                {/* Business Details (if trader) */}
                {(selectedFarmer.company || selectedFarmer.panGst) && (
                  <div className="text-xs bg-white/60 p-2 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-full bg-blue-400 block"></span>
                      Business Info
                    </p>
                    {selectedFarmer.company && <p className="text-slate-600 truncate"><span className="text-slate-400">Company:</span> {selectedFarmer.company}</p>}
                    {selectedFarmer.panGst && <p className="text-slate-600 truncate"><span className="text-slate-400">PAN/GST:</span> {selectedFarmer.panGst}</p>}
                  </div>
                )}
                
                {/* Bank Details */}
                {(selectedFarmer.bankName || selectedFarmer.accountNumber) && (
                  <div className="text-xs bg-white/60 p-2 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-full bg-emerald-400 block"></span>
                      Bank Info
                    </p>
                    {selectedFarmer.bankName && <p className="text-slate-600 truncate"><span className="text-slate-400">Bank:</span> {selectedFarmer.bankName}</p>}
                    {selectedFarmer.accountNumber && (
                      <p className="text-slate-600 truncate"><span className="text-slate-400">A/C:</span> {selectedFarmer.accountNumber} {selectedFarmer.ifscCode ? `(${selectedFarmer.ifscCode})` : ""}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white/60 focus-within:outline-none focus-within:ring-2 transition-all ${categoryFilter === "TRADER" ? "focus-within:ring-blue-500/30 focus-within:border-blue-500" : "focus-within:ring-forest-500/30 focus-within:border-forest-500"}`}>
                <Search size={16} className="text-slate-400" />
                <input
                  value={farmerQuery}
                  onChange={(e) => {
                    setFarmerQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type name to search..."
                  className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
                />
                {searchingFarmer && (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && farmerQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-60 overflow-y-auto z-[60]">
                  {farmerResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400 text-center">
                      {searchingFarmer ? "Searching..." : "No results"}
                    </p>
                  ) : (
                    farmerResults.map((farmer) => (
                      <button
                        key={farmer.id}
                        type="button"
                        onClick={() => {
                          setSelectedFarmer(farmer);
                          setShowDropdown(false);
                          setFarmerQuery("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center">
                          <User size={14} className="text-forest-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {farmer.name} <span className="ml-1 text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{farmer.farmerCode || "—"}</span>
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {farmer.phone} • {[farmer.district, farmer.block].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crop + Quantity + Rate */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-semibold text-slate-700">
              2. Transaction Details
            </label>
            <button
              type="button"
              onClick={() => {
                setCropItems([...cropItems, { id: Date.now().toString(), crop: "Rice", variety: "", bags: "", packingSize: "", grossQuantity: "", deduction: "", rate: "", bones: "" }]);
              }}
              className={`text-sm font-semibold px-4 py-2 rounded-xl border flex items-center gap-1 transition-colors shadow-sm active:scale-95 ${categoryFilter === 'TRADER' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-forest-50 text-forest-700 border-forest-200 hover:bg-forest-100'}`}
            >
              + Add Crop
            </button>
          </div>

          <div className="space-y-6">
            {cropItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-white/50 border border-slate-200/60 rounded-xl relative">
                {cropItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...cropItems];
                      newItems.splice(index, 1);
                      setCropItems(newItems);
                    }}
                    className="absolute top-1 right-1 p-3 text-slate-400 hover:text-red-500 active:scale-95 transition-transform"
                  >
                    <X size={18} />
                  </button>
                )}
                <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Item {index + 1}</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Crop */}
                  <div className="relative combobox-crop">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Crop Type
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={activeDropdown?.index === index && activeDropdown.type === 'crop' ? dropdownSearch : item.crop}
                        onChange={(e) => {
                          setDropdownSearch(e.target.value);
                          setActiveDropdown({ index, type: 'crop' });
                        }}
                        onFocus={() => {
                          setDropdownSearch(item.crop);
                          setActiveDropdown({ index, type: 'crop' });
                        }}
                        placeholder="Search Crop..."
                        className={`w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${ringClass} 
                          transition-all text-sm font-medium`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {activeDropdown?.index === index && activeDropdown.type === 'crop' && (
                      <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto p-1" onTouchMove={() => (document.activeElement as HTMLElement)?.blur()}>
                          {["Rice", "Paddy"].filter(c => c.toLowerCase().includes(dropdownSearch.toLowerCase())).map((c) => (
                            <div
                              key={c}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const newItems = [...cropItems];
                                newItems[index].crop = c;
                                setCropItems(newItems);
                                setActiveDropdown(null);
                              }}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${item.crop === c ? (categoryFilter === 'TRADER' ? 'bg-blue-50 text-blue-700' : 'bg-forest-50 text-forest-700') + ' font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <span className="text-sm truncate pr-2">{c}</span>
                              {item.crop === c && <Check size={14} className="flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Variety */}
                  <div className="relative combobox-variety">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Variety
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={activeDropdown?.index === index && activeDropdown.type === 'variety' ? dropdownSearch : item.variety}
                        onChange={(e) => {
                          setDropdownSearch(e.target.value);
                          setActiveDropdown({ index, type: 'variety' });
                        }}
                        onFocus={() => {
                          setDropdownSearch(item.variety);
                          setActiveDropdown({ index, type: 'variety' });
                        }}
                        placeholder="Search Variety..."
                        className={`w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${ringClass} 
                          transition-all text-sm font-medium`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {activeDropdown?.index === index && activeDropdown.type === 'variety' && (
                      <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto p-1" onTouchMove={() => (document.activeElement as HTMLElement)?.blur()}>
                          {CROP_VARIETIES.filter(v => v.toLowerCase().includes(dropdownSearch.toLowerCase())).length > 0 ? (
                            CROP_VARIETIES.filter(v => v.toLowerCase().includes(dropdownSearch.toLowerCase())).map((v) => (
                              <div
                                key={v}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const newItems = [...cropItems];
                                  newItems[index].variety = v;
                                  setCropItems(newItems);
                                  setActiveDropdown(null);
                                }}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${item.variety === v ? (categoryFilter === 'TRADER' ? 'bg-blue-50 text-blue-700' : 'bg-forest-50 text-forest-700') + ' font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                              >
                                <span className="text-sm truncate pr-2">{v}</span>
                                {item.variety === v && <Check size={14} className="flex-shrink-0" />}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">No varieties found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Bags */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">No. of Bags</label>
                    <input
                      type="number"
                      value={item.bags}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].bags = e.target.value;
                        setCropItems(newItems);
                      }}
                      placeholder="0"
                      min="0"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-base ${ringClass}`}
                    />
                  </div>
                  {/* Packing Size */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Packing Size</label>
                    <input
                      type="number"
                      value={item.packingSize}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].packingSize = e.target.value;
                        setCropItems(newItems);
                      }}
                      placeholder="0"
                      min="0"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-base ${ringClass}`}
                    />
                  </div>
                  {/* Weight Qtl */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Weight Qtl.</label>
                    <input
                      type="number"
                      value={item.grossQuantity}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].grossQuantity = e.target.value;
                        setCropItems(newItems);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-base ${ringClass}`}
                    />
                  </div>
                  {/* Deduction Qtl/Bag */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Deduction Qtl./Bag</label>
                    <input
                      type="number"
                      value={item.deduction}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].deduction = e.target.value;
                        setCropItems(newItems);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-base ${ringClass}`}
                    />
                  </div>
                  {/* Rate */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">RATE PER QUINTAL</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newItems = [...cropItems];
                          newItems[index].rate = e.target.value;
                          setCropItems(newItems);
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 transition-all text-base ${ringClass}`}
                      />
                    </div>
                  </div>
                  {/* Bones */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Bones</label>
                    <input
                      type="number"
                      value={item.bones}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].bones = e.target.value;
                        setCropItems(newItems);
                      }}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-base ${ringClass}`}
                    />
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-xl p-3 mt-4 border border-slate-200/50 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Net Quantity</span>
                  <span className="text-sm font-bold text-slate-700">{netQuantities[index]} Quintals</span>
                </div>
              </div>
            ))}
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              {/* Adtiya Name */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Adtiya Name
                </label>
                <input
                  type="text"
                  value={adtiyaName}
                  onChange={(e) => setAdtiyaName(e.target.value)}
                  placeholder=""
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    transition-all text-base ${ringClass}`}
                />
              </div>

              {/* Lot no */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Lot no.
                </label>
                <input
                  type="text"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  placeholder=""
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    transition-all text-base ${ringClass}`}
                />
              </div>
            </div>


          </div>
        </div>

        {/* Live Total */}
        <div className="glass-card rounded-2xl p-6 border-2 border-forest-200/50 bg-gradient-to-br from-forest-50/80 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
                <Scale size={20} className="text-forest-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Payout
                </p>
                <p className="text-xs text-slate-400">
                  {cropItems.length} item(s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-3xl md:text-4xl font-bold text-forest-800 tracking-tight transition-all"
                key={total}
              >
                ₹{total.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selectedFarmer || cropItems.some(i => !i.grossQuantity || !i.rate)}
          className={`w-full py-4 rounded-2xl bg-gradient-to-r text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.99] ${submitButtonClass}`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </span>
          ) : (
            "Complete Procurement"
          )}
        </button>
      </form>

      {/* Receipt Modal */}
      {receipts.length > 0 && (
        <PurchaseSlip
          receipts={receipts}
          onClose={() => setReceipts([])}
        />
      )}

    </div>
  );
}
