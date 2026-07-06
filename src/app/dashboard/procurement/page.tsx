"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  createProcurement,
  ProcurementReceipt,
} from "@/app/actions/procurement";
import { CROP_VARIETIES } from "@/lib/crop-varieties";
import { searchFarmers } from "@/app/actions/farmers";
import { getAdhatiyas, saveAdhatiya, deleteAdhatiya } from "@/app/actions/po";
import PurchaseSlip from "@/components/PurchaseSlip";
import {
  Search,
  Scale,
  Loader2,
  User,
  Users,
  ShoppingCart,
  Shield,
  Check,
  ChevronDown,
  X,
  Plus,
  Settings,
  Building,
  Receipt,
  Truck,
  MapPin,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { getMandis } from "@/app/actions/mandis";

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

  const [dbAdhatiyas, setDbAdhatiyas] = useState<any[]>([]);
  const [showAdhatiyaDropdown, setShowAdhatiyaDropdown] = useState(false);
  const [loadingAdhatiyas, setLoadingAdhatiyas] = useState(false);

  // Adhatiya CRUD Modal State
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdhatiyaId, setEditingAdhatiyaId] = useState<number | null>(null);

  // CRUD Fields
  const [crudName, setCrudName] = useState("");
  const [crudAddress, setCrudAddress] = useState("");
  const [crudVillage, setCrudVillage] = useState("");
  const [crudBlock, setCrudBlock] = useState("");
  const [crudPinCode, setCrudPinCode] = useState("");
  const [crudState, setCrudState] = useState("");
  const [crudDistrict, setCrudDistrict] = useState("");
  const [crudMandi, setCrudMandi] = useState("");

  const [crudGst, setCrudGst] = useState("");
  const [crudMobile, setCrudMobile] = useState("");
  const [crudEmail, setCrudEmail] = useState("");

  // Delete confirmation state variables
  const [adhatiyaToDelete, setAdhatiyaToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<number>(0); // 0 = closed, 1 = warning, 2 = captcha, 3 = final
  const [captchaCode, setCaptchaCode] = useState<string>("");
  const [captchaInput, setCaptchaInput] = useState<string>("");

  // Location search helper state
  const [mandisData, setMandisData] = useState<{state: string; district: string; mandiName: string}[]>([]);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [showMandiDropdown, setShowMandiDropdown] = useState(false);
  const [mandiSearch, setMandiSearch] = useState("");

  const loadAdhatiyas = async (query = "") => {
    setLoadingAdhatiyas(true);
    try {
      const res = await getAdhatiyas(query);
      setDbAdhatiyas(res);
    } catch (e) {
      console.error("Failed to load Adhatiyas:", e);
    } finally {
      setLoadingAdhatiyas(false);
    }
  };

  // Load mandis data on demand when Add modal is active
  useEffect(() => {
    if (showAddModal && mandisData.length === 0) {
      getMandis().then(setMandisData).catch(console.error);
    }
  }, [showAddModal, mandisData.length]);

  useEffect(() => {
    if (!showStateDropdown) setStateSearch(crudState);
  }, [showStateDropdown, crudState]);

  useEffect(() => {
    if (!showDistrictDropdown) setDistrictSearch(crudDistrict);
  }, [showDistrictDropdown, crudDistrict]);

  useEffect(() => {
    if (!showMandiDropdown) setMandiSearch(crudMandi);
  }, [showMandiDropdown, crudMandi]);

  // Location data filtering
  const filteredStates = useMemo(() => {
    const uniq = Array.from(new Set((mandisData || []).map(m => m.state).filter(Boolean))).sort();
    if (!stateSearch) return uniq;
    return uniq.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [mandisData, stateSearch]);

  const filteredDistricts = useMemo(() => {
    const uniq = Array.from(new Set((mandisData || []).filter(m => m.state === crudState).map(m => m.district).filter(Boolean))).sort();
    if (!districtSearch) return uniq;
    return uniq.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [mandisData, crudState, districtSearch]);

  const filteredMandis = useMemo(() => {
    const list = (mandisData || []).filter(m => m.state === crudState && m.district === crudDistrict);
    if (!mandiSearch) return list;
    return list.filter(m => m.mandiName.toLowerCase().includes(mandiSearch.toLowerCase()));
  }, [mandisData, crudState, crudDistrict, mandiSearch]);

  // Save/Create Adhatiya Action
  const handleSaveAdhatiya = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crudName.trim()) return;

    if (!crudAddress.trim() || !crudVillage.trim() || !crudBlock.trim() || !crudState.trim() || !crudDistrict.trim() || !crudMandi.trim() || !crudGst.trim() || !crudMobile.trim()) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Please fill all required fields (*)."
      });
      return;
    }

    try {
      const saved = await saveAdhatiya({
        id: editingAdhatiyaId || undefined,
        name: crudName.trim(),
        address: crudAddress.trim(),
        village: crudVillage.trim(),
        block: crudBlock.trim(),
        pinCode: crudPinCode.trim(),
        state: crudState.trim(),
        district: crudDistrict.trim(),
        mandi: crudMandi.trim(),
        gstNo: crudGst.trim(),
        mobile: crudMobile.trim(),
        email: crudEmail.trim()
      });

      addToast({
        type: "success",
        title: "Success",
        message: `Adhatiya ${editingAdhatiyaId ? "updated" : "created"} successfully`
      });

      // Clear fields
      setCrudName("");
      setCrudAddress("");
      setCrudVillage("");
      setCrudBlock("");
      setCrudPinCode("");
      setCrudState("");
      setCrudDistrict("");
      setCrudMandi("");
      setStateSearch("");
      setDistrictSearch("");
      setMandiSearch("");
      setCrudGst("");
      setCrudMobile("");
      setCrudEmail("");
      setEditingAdhatiyaId(null);
      setShowAddModal(false);

      // Reload list and automatically select the saved one
      await loadAdhatiyas();
      setAdtiyaName(saved.name);

    } catch (err: any) {
      addToast({
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save Adhatiya"
      });
    }
  };

  // Helper to generate 6-char verification code
  const generateRandomCaptcha = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Trigger Delete flow modal
  const handleDeleteAdhatiya = (id: number, name: string) => {
    setAdhatiyaToDelete({ id, name });
    setDeleteStep(1);
  };

  // Confirm delete handler (final stage)
  const handleDeleteAdhatiyaConfirmed = async (id: number) => {
    try {
      await deleteAdhatiya(id);
      addToast({
        type: "success",
        title: "Deleted",
        message: "Adhatiya removed from database"
      });
      
      const deletedName = adhatiyaToDelete?.name;
      if (deletedName && adtiyaName === deletedName) {
        setAdtiyaName("");
      }

      setDeleteStep(0);
      setAdhatiyaToDelete(null);
      setCaptchaInput("");
      loadAdhatiyas();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete Adhatiya"
      });
      // Reset delete flow on failure
      setDeleteStep(0);
      setAdhatiyaToDelete(null);
      setCaptchaInput("");
    }
  };

  useEffect(() => {
    loadAdhatiyas();
  }, []);

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.roles?.includes("L4_ADMIN") || (session?.user as any)?.isSuperAdmin;


  // Live math
  const netQuantities = useMemo(() => {
    return cropItems.map(item => {
      const gross = parseFloat(item.grossQuantity) || 0;
      const dedKgPerQtl = parseFloat(item.deduction) || 0;
      // Deduction weight in Qtl
      const dedWeightQtl = (gross * dedKgPerQtl) / 100;
      return Math.max(0, Math.round((gross - dedWeightQtl) * 100) / 100);
    });
  }, [cropItems]);

  const total = useMemo(() => {
    return cropItems.reduce((acc, item) => {
      const gross = parseFloat(item.grossQuantity) || 0;
      const dedKgPerQtl = parseFloat(item.deduction) || 0;
      const r = parseFloat(item.rate) || 0;
      const b = parseFloat(item.bones) || 0;
      
      const totalAmount = gross * r;
      const totalBones = gross * b;
      const deductionWeightQtl = (gross * dedKgPerQtl) / 100;
      const deductionAmount = deductionWeightQtl * r;
      
      return acc + Math.round((totalAmount + totalBones - deductionAmount) * 100) / 100;
    }, 0);
  }, [cropItems]);

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
      if (!target.closest('.combobox-adhatiya')) {
        setShowAdhatiyaDropdown(false);
      }
      if (!target.closest('.combobox-state')) {
        setShowStateDropdown(false);
      }
      if (!target.closest('.combobox-district')) {
        setShowDistrictDropdown(false);
      }
      if (!target.closest('.combobox-mandi')) {
        setShowMandiDropdown(false);
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
        category: selectedFarmer.category,
        company: selectedFarmer.company,
        panGst: selectedFarmer.panGst,
        promoterName: selectedFarmer.promoterName,
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
      const dedWeightQtl = (payload.grossQuantity * payload.deduction) / 100;
      const itemTotal = Math.round((payload.grossQuantity * payload.rate - dedWeightQtl * payload.rate) * 100) / 100;

      if (isOffline) {
        const offlineId = `OFF-${Date.now().toString().slice(-5)}-${i}`;
        const offlineReceipt: Extract<ProcurementReceipt, { success: true }> = {
          success: true, invoiceId: Date.now() + i, slipId: offlineId,
          farmerName: payload.farmerName, farmerCode: payload.farmerCode || "",
          fatherName: payload.fatherName || "", village: payload.village || "",
          category: payload.category, company: payload.company, panGst: payload.panGst, promoterName: payload.promoterName,
          crop: payload.crop, variety: payload.variety, bags: payload.bags,
          packingSize: payload.packingSize, grossQuantity: payload.grossQuantity,
          deduction: payload.deduction, netQuantity: itemNetQuantity, rate: payload.rate,
          bones: payload.bones, adtiyaName: payload.adtiyaName, lotNo: payload.lotNo,
          total: itemTotal, timestamp: new Date().toISOString(),
          agentName: session?.user?.name || "Agent",
          status: "PENDING_L2",
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
            category: payload.category, company: payload.company, panGst: payload.panGst, promoterName: payload.promoterName,
            crop: payload.crop, variety: payload.variety, bags: payload.bags,
            packingSize: payload.packingSize, grossQuantity: payload.grossQuantity,
            deduction: payload.deduction, netQuantity: itemNetQuantity, rate: payload.rate,
            bones: payload.bones, adtiyaName: payload.adtiyaName, lotNo: payload.lotNo,
            total: itemTotal, timestamp: new Date().toISOString(),
            agentName: session?.user?.name || "Agent",
            status: "PENDING_L2",
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus-within:outline-none focus-within:ring-2 transition-all ${categoryFilter === "TRADER" ? "focus-within:ring-blue-500/30 focus-within:border-blue-500" : "focus-within:ring-forest-500/30 focus-within:border-forest-500"}`}>
                <Search size={14} className="text-slate-400" />
                <input
                  value={farmerQuery}
                  onChange={(e) => {
                    setFarmerQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type name to search..."
                  className="flex-1 bg-transparent outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
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
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${farmer.category === "TRADER" ? "bg-blue-100" : "bg-forest-100"}`}>
                          <User size={14} className={farmer.category === "TRADER" ? "text-blue-600" : "text-forest-600"} />
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

        {/* Adtiya Name & Lot No */}
        <div className="glass-card rounded-2xl p-5 relative z-40">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            2. Additional Details
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative combobox-adhatiya sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Adtiya Name
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={adtiyaName}
                    onChange={(e) => {
                      setAdtiyaName(e.target.value);
                      loadAdhatiyas(e.target.value);
                      setShowAdhatiyaDropdown(true);
                    }}
                    onFocus={() => setShowAdhatiyaDropdown(true)}
                    placeholder="Search or enter Adtiya Name"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                      transition-all text-xs ${ringClass} font-bold`}
                  />
                  
                  {/* Dropdown */}
                  {showAdhatiyaDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5">
                      {loadingAdhatiyas && (
                        <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Searching...
                        </div>
                      )}
                      {!loadingAdhatiyas && dbAdhatiyas.length === 0 && (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          <p className="mb-2">No Adhatiya named &quot;{adtiyaName}&quot; found</p>
                          <button
                            type="button"
                            onClick={() => {
                              setCrudName(adtiyaName);
                              setCrudAddress("");
                              setCrudVillage("");
                              setCrudBlock("");
                              setCrudPinCode("");
                              setCrudState("");
                              setCrudDistrict("");
                              setCrudMandi("");
                              setStateSearch("");
                              setDistrictSearch("");
                              setMandiSearch("");
                              setEditingAdhatiyaId(null);
                              setShowAddModal(true);
                              setShowAdhatiyaDropdown(false);
                            }}
                            className="px-3 py-1.5 bg-forest-600 text-white text-[11px] font-bold rounded-lg hover:bg-forest-700"
                          >
                            + Add &quot;{adtiyaName}&quot; as New Adhatiya
                          </button>
                        </div>
                      )}
                      {dbAdhatiyas.map((ad) => (
                        <div
                           key={ad.id}
                           onClick={() => {
                             setAdtiyaName(ad.name);
                             setShowAdhatiyaDropdown(false);
                           }}
                           className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center text-xs group"
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-800 text-xs">{ad.name}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {[ad.mandi, ad.district, ad.state].filter(Boolean).join(", ") || "No Location"}
                            </p>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono group-hover:bg-forest-50 group-hover:text-forest-700">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadAdhatiyas();
                    setShowCrudModal(true);
                  }}
                  className="px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                  title="Manage Database"
                >
                  <Settings size={14} />
                  Manage
                </button>
              </div>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Lot no.
              </label>
              <input
                type="text"
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                placeholder="Enter Lot No."
                className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7]
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white
                  transition-all text-xs font-bold ${ringClass}`}
              />
            </div>
          </div>
        </div>

        {/* Crop + Quantity + Rate */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              3. Transaction Details
            </label>
          </div>

          <div className="space-y-6">
            {cropItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-white shadow-sm border border-slate-200 rounded-xl relative">
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
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
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${ringClass} 
                          transition-all text-xs font-bold`}
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
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
                        className={`w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${ringClass} 
                          transition-all text-xs font-bold`}
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">No. of Bags</label>
                    <input
                      type="number"
                      value={item.bags}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].bags = e.target.value;
                        const bags = Number(e.target.value) || 0;
                        const packing = Number(item.packingSize) || 0;
                        if (bags > 0 && packing > 0) {
                          newItems[index].grossQuantity = ((bags * packing) / 100).toFixed(2);
                        }
                        setCropItems(newItems);
                      }}
                      placeholder="0"
                      min="0"
                      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-xs font-bold ${ringClass}`}
                    />
                  </div>
                  {/* Packing Size */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Packing Size (kg)</label>
                    <input
                      type="number"
                      value={item.packingSize}
                      onChange={(e) => {
                        const newItems = [...cropItems];
                        newItems[index].packingSize = e.target.value;
                        const packing = Number(e.target.value) || 0;
                        const bags = Number(item.bags) || 0;
                        if (bags > 0 && packing > 0) {
                          newItems[index].grossQuantity = ((bags * packing) / 100).toFixed(2);
                        }
                        setCropItems(newItems);
                      }}
                      placeholder="0"
                      min="0"
                      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-xs font-bold ${ringClass}`}
                    />
                  </div>
                  {/* Weight Qtl */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Weight Qtl.</label>
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
                      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-xs font-bold ${ringClass}`}
                    />
                  </div>
                  {/* Deduction Qtl/Bag */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Deduction/Qtl (kg)</label>
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
                      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-xs font-bold ${ringClass}`}
                    />
                  </div>
                  {/* Rate */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Rate per Quintal</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
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
                        className={`w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 transition-all text-xs font-bold ${ringClass}`}
                      />
                    </div>
                  </div>
                  {/* Bones */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Bones</label>
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
                      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white
                  text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                        transition-all text-xs font-bold ${ringClass}`}
                    />
                  </div>
                </div>
                
                <div className="bg-white shadow-sm rounded-xl p-3 mt-4 border border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Net Quantity</span>
                  <span className="text-sm font-bold text-slate-700">{netQuantities[index]} Quintals</span>
                </div>
              </div>
            ))}
            
            {/* Add Crop Button at Bottom */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCropItems([...cropItems, { id: Date.now().toString(), crop: "Rice", variety: "", bags: "", packingSize: "", grossQuantity: "", deduction: "", rate: "", bones: "" }]);
                }}
                className={`w-full text-sm font-semibold px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-95 ${categoryFilter === 'TRADER' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-forest-50 text-forest-700 border-forest-200 hover:bg-forest-100'}`}
              >
                + Add New Variety
              </button>
            </div>
          </div>
        </div>

        {/* Live Total */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200/60 bg-white">
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

      {/* MODAL 1: DATABASE MANAGER FOR ADHATIYAS */}
      {showCrudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCrudModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-forest-700" />
                  Manage Adhatiyas Database
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCrudName("");
                    setCrudAddress("");
                    setCrudVillage("");
                    setCrudBlock("");
                    setCrudPinCode("");
                    setCrudState("");
                    setCrudDistrict("");
                    setCrudMandi("");
                    setStateSearch("");
                    setDistrictSearch("");
                    setMandiSearch("");
                    setCrudGst("");
                    setCrudMobile("");
                    setCrudEmail("");
                    setEditingAdhatiyaId(null);
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 bg-forest-700 text-white text-xs font-bold rounded-xl hover:bg-forest-800 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>

              {/* List of current Adhatiyas */}
              <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2">
                {dbAdhatiyas.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No Adhatiyas in database. Create one now!</p>
                ) : (
                  dbAdhatiyas.map((ad) => (
                    <div key={ad.id} className="p-3 border border-slate-100 rounded-2xl flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{ad.name}</p>
                        <p className="text-slate-500">
                          {[
                            ad.address,
                            [ad.village, ad.block].filter(Boolean).join(", "),
                            [ad.district, ad.state].filter(Boolean).join(", ") + (ad.pinCode ? ` - ${ad.pinCode}` : ""),
                            ad.mandi ? `Mandi: ${ad.mandi}` : ""
                          ].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          GST: {ad.gstNo || "—"} • Mob: {ad.mobile || "—"} • Email: {ad.email || "—"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdhatiyaId(ad.id);
                            setCrudName(ad.name);
                            setCrudAddress(ad.address || "");
                            setCrudVillage(ad.village || "");
                            setCrudBlock(ad.block || "");
                            setCrudPinCode(ad.pinCode || "");
                            setCrudState(ad.state || "");
                            setCrudDistrict(ad.district || "");
                            setCrudMandi(ad.mandi || "");
                            setStateSearch(ad.state || "");
                            setDistrictSearch(ad.district || "");
                            setMandiSearch(ad.mandi || "");
                            setCrudGst(ad.gstNo || "");
                            setCrudMobile(ad.mobile || "");
                            setCrudEmail(ad.email || "");
                            setShowAddModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdhatiya(ad.id, ad.name)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCrudModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT ADHATIYA FORM */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 text-left">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
              {editingAdhatiyaId ? "Edit Adhatiya Details" : "Create New Adhatiya Record"}
            </h3>
            
            <form onSubmit={handleSaveAdhatiya} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Adhatiya Name*</label>
                <input 
                  type="text" 
                  required
                  value={crudName} 
                  onChange={(e) => setCrudName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. ABC Pvt Ltd"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address (Street / House No.)*</label>
                <input 
                  type="text" 
                  required
                  value={crudAddress} 
                  onChange={(e) => setCrudAddress(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. Near Mandi Road"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Village*</label>
                  <input 
                    type="text" 
                    required
                    value={crudVillage} 
                    onChange={(e) => setCrudVillage(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Village Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Block*</label>
                  <input 
                    type="text" 
                    required
                    value={crudBlock} 
                    onChange={(e) => setCrudBlock(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Block / Taluka"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pin Code</label>
                <input 
                  type="text" 
                  value={crudPinCode} 
                  onChange={(e) => setCrudPinCode(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="6-digit pin code"
                  maxLength={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative combobox-state">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State Search*</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      value={stateSearch}
                      onChange={(e) => {
                        setStateSearch(e.target.value);
                        setShowStateDropdown(true);
                      }}
                      onFocus={() => {
                        setStateSearch(crudState);
                        setShowStateDropdown(true);
                      }}
                      placeholder="Search State..."
                      className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                  </div>
                  {showStateDropdown && (
                    <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-36 overflow-y-auto p-1">
                        {filteredStates.length > 0 ? (
                          filteredStates.map((s) => (
                            <div
                              key={s}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCrudState(s);
                                setStateSearch(s);
                                setCrudDistrict("");
                                setDistrictSearch("");
                                setCrudMandi("");
                                setMandiSearch("");
                                setShowStateDropdown(false);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudState === s ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <span className="truncate pr-1">{s}</span>
                              {crudState === s && <Check size={12} />}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No states</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative combobox-district">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District Search*</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      value={districtSearch}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        setShowDistrictDropdown(true);
                      }}
                      onFocus={() => {
                        setDistrictSearch(crudDistrict);
                        setShowDistrictDropdown(true);
                      }}
                      disabled={!crudState}
                      placeholder={crudState ? "Search District..." : "Select State"}
                      className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                  </div>
                  {showDistrictDropdown && (
                    <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-36 overflow-y-auto p-1">
                        {filteredDistricts.length > 0 ? (
                          filteredDistricts.map((d) => (
                            <div
                              key={d}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCrudDistrict(d);
                                setDistrictSearch(d);
                                setCrudMandi("");
                                setMandiSearch("");
                                setShowDistrictDropdown(false);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudDistrict === d ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <span className="truncate pr-1">{d}</span>
                              {crudDistrict === d && <Check size={12} />}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No districts</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative combobox-mandi">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mandi Search*</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    value={mandiSearch}
                    onChange={(e) => {
                      setMandiSearch(e.target.value);
                      setShowMandiDropdown(true);
                    }}
                    onFocus={() => {
                      setMandiSearch(crudMandi);
                      setShowMandiDropdown(true);
                    }}
                    disabled={!crudDistrict}
                    placeholder={crudDistrict ? "Search Mandi..." : "Select District"}
                    className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                </div>
                {showMandiDropdown && (
                  <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="max-h-36 overflow-y-auto p-1">
                      {filteredMandis.length > 0 ? (
                        filteredMandis.map((m) => (
                          <div
                            key={m.mandiName}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCrudMandi(m.mandiName);
                              setMandiSearch(m.mandiName);
                              setShowMandiDropdown(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudMandi === m.mandiName ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            <div className="flex flex-col">
                              <span>{m.mandiName}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{m.district}, {m.state}</span>
                            </div>
                            {crudMandi === m.mandiName && <Check size={12} />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No mandis</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GST/PAN No.*</label>
                <input 
                  type="text" 
                  required
                  value={crudGst} 
                  onChange={(e) => setCrudGst(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. 06AAGCA3319R1ZD"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile No.*</label>
                  <input 
                    type="text" 
                    required
                    value={crudMobile} 
                    onChange={(e) => setCrudMobile(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Id</label>
                  <input 
                    type="email" 
                    value={crudEmail} 
                    onChange={(e) => setCrudEmail(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. contact@agent.com"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 justify-end text-xs border-t mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-700 text-white font-bold rounded-xl hover:bg-forest-800"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE ADHATIYA CONFIRMATION MODAL */}
      {deleteStep > 0 && adhatiyaToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 text-left">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
            setDeleteStep(0);
            setAdhatiyaToDelete(null);
            setCaptchaInput("");
          }} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden">
            {deleteStep === 1 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>⚠️</span> Warning: Deleting Adhatiya
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  You are about to permanently delete the Adhatiya record for <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>.
                  <br /><br />
                  This action is highly destructive. Existing records, transactions, or purchase orders associated with this Adhatiya might be affected or lose their relationship context.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const code = generateRandomCaptcha();
                      setCaptchaCode(code);
                      setCaptchaInput("");
                      setDeleteStep(2);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
                  Security Verification
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  To confirm you want to delete <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>, please type the following 6-character verification code:
                </p>
                
                <div className="bg-slate-100 py-3 px-4 rounded-xl text-center mb-4 tracking-[0.3em] font-mono text-lg font-black text-slate-700 select-none border border-slate-200">
                  {captchaCode}
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter verification code"
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-red-500/20 focus:outline-none text-center font-mono font-bold text-sm tracking-widest text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                      setCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (captchaInput.trim().toUpperCase() === captchaCode) {
                        setDeleteStep(3);
                      } else {
                        addToast({
                          type: "error",
                          title: "Invalid Code",
                          message: "The entered verification code did not match. Please try again."
                        });
                        setCaptchaCode(generateRandomCaptcha());
                        setCaptchaInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 3 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider">
                  Final Confirmation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  Are you absolutely sure you want to delete <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>?
                  <br /><br />
                  This is the final confirmation. There is no undo.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                      setCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteAdhatiyaConfirmed(adhatiyaToDelete.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
