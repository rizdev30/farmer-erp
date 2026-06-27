"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronRight, ChevronLeft, User, MapPin, Shield, Search, Check, ChevronDown } from "lucide-react";
import { registerFarmer } from "@/app/actions/farmers";
import { registerTrader } from "@/app/actions/traders";
import { getAgentsList } from "@/app/actions/procurement";
import { getMandis } from "@/app/actions/mandis";
import { useSession } from "next-auth/react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (farmer: {
    id: number;
    name: string;
    phone: string;
    address: string;
    town?: string;
    village?: string;
    district: string;
    block: string;
    fatherName?: string;
    farmerCode: string;
    category?: string;
    gender?: string;
    pinCode?: string;
    projectName?: string;
    assignedL3Id?: string;
  }) => void;
}

export default function FarmerRegistrationModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "L4_ADMIN";
  const [agents, setAgents] = useState<{id: string, name: string, role: string}[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedL3Id, setSelectedL3Id] = useState("");

  // Fetch agents if admin
  useEffect(() => {
    if (isAdmin && open) {
      getAgentsList().then(setAgents).catch(console.error);
    }
  }, [isAdmin, open]);

  const [mandisData, setMandisData] = useState<{state: string, district: string, mandiName: string}[]>([]);

  useEffect(() => {
    if (open) {
      getMandis().then(setMandisData).catch(console.error);
    }
  }, [open]);

  // Form data
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [category, setCategory] = useState("FARMER");
  const [gender, setGender] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [state, setState] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");


  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const [showMandiDropdown, setShowMandiDropdown] = useState(false);
  const [mandiSearch, setMandiSearch] = useState("");

  // Cascading Location Logic
  const availableStates = Array.from(new Set((mandisData || []).map(m => m.state).filter(Boolean))).sort();
  const availableDistricts = Array.from(new Set((mandisData || []).filter(m => m.state === state).map(m => m.district).filter(Boolean))).sort();
  
  const availableMandis = (mandisData || []).filter(m => m.state === state && m.district === district);
  const uniqueMandis = Array.from(new Map(availableMandis.map(m => [m.mandiName, m])).values());
  uniqueMandis.sort((a, b) => a.mandiName.localeCompare(b.mandiName));

  const filteredStates = availableStates.filter(s => 
    (s || "").toLowerCase().includes((stateSearch || "").toLowerCase())
  );
  
  const filteredDistricts = availableDistricts.filter(d => 
    (d || "").toLowerCase().includes((districtSearch || "").toLowerCase())
  );

  const filteredMandis = uniqueMandis.filter(m => 
    (m.mandiName || "").toLowerCase().includes((mandiSearch || "").toLowerCase())
  );

  const [panGst, setPanGst] = useState("");
  const [company, setCompany] = useState("");
  const [promoterName, setPromoterName] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [showBankDetails, setShowBankDetails] = useState(false);

  const isTrader = category === "TRADER";
  const t = isTrader ? {
    bgLight: "bg-blue-100",
    textMain: "text-blue-600",
    bgDark: "bg-blue-800",
    textHover: "hover:bg-blue-700",
    ring: "focus:ring-blue-500/30",
    borderFocus: "focus:border-blue-500",
    gradient: "from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600",
    progress: "bg-blue-500"
  } : {
    bgLight: "bg-forest-100",
    textMain: "text-forest-600",
    bgDark: "bg-forest-800",
    textHover: "hover:bg-forest-700",
    ring: "focus:ring-forest-500/30",
    borderFocus: "focus:border-forest-500",
    gradient: "from-forest-800 to-forest-700 hover:from-forest-700 hover:to-forest-600",
    progress: "bg-forest-500"
  };

  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem("offlineFarmers") || "[]");
    setOfflineCount(queue.length);

    const handleOnline = async () => {
      const pending = JSON.parse(localStorage.getItem("offlineFarmers") || "[]");
      if (pending.length === 0) return;

      setSyncing(true);
      try {
        for (const farmerData of pending) {
          if (farmerData.category === "TRADER") {
            await registerTrader(farmerData);
          } else {
            await registerFarmer(farmerData);
          }
        }
        localStorage.removeItem("offlineFarmers");
        setOfflineCount(0);
        showToast("Success! All offline data synced.");
      } catch (err) {
        console.error("Sync failed", err);
      }
      setSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    if (navigator.onLine && queue.length > 0) {
      handleOnline();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  function reset() {
    setStep(1);
    setName("");
    setFatherName("");
    setPhone("");
    setAddress("");
    setTown("");
    setVillage("");
    setDistrict("");
    setBlock("");
    setCategory("FARMER");
    setGender("");
    setPinCode("");
    setProjectName("");
    const lastState = localStorage.getItem("lastSavedState") || "";
    setState(lastState);
    setStateSearch(lastState);
    
    const lastDistrict = localStorage.getItem("lastSavedDistrict") || "";
    setDistrict(lastDistrict);
    setDistrictSearch(lastDistrict);
    
    const lastTown = localStorage.getItem("lastSavedMandi") || "";
    setTown(lastTown);
    setMandiSearch(lastTown);
    setPanGst("");
    setCompany("");
    setPromoterName("");
    setBankName("");
    setIfscCode("");
    setAccountNumber("");
    setShowBankDetails(false);
    setSelectedAgentId("");
    setSelectedL3Id("");
    setError("");
    setLoading(false);
  }

  async function handleSubmit() {
    if (!village.trim() || !block.trim() || !state.trim() || !district.trim() || !town.trim()) {
      setError("Please fill all required location fields (*).");
      return;
    }

    setLoading(true);
    setError("");

    localStorage.setItem("lastSavedState", state);
    localStorage.setItem("lastSavedDistrict", district);
    localStorage.setItem("lastSavedMandi", town);

    const payload = {
      name,
      fatherName,
      phone,
      address,
      town,
      village,
      district,
      block,
      category,
      gender,
      pinCode,
      projectName,
      state,
      panGst,
      company,
      promoterName,
      bankName,
      ifscCode,
      accountNumber,
      agentId: selectedAgentId || undefined,
      assignedL3Id: selectedL3Id || undefined,
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("offlineFarmers") || "[]");
      queue.push(payload);
      localStorage.setItem("offlineFarmers", JSON.stringify(queue));
      setOfflineCount(queue.length);
      
      onSuccess({
        id: Date.now(),
        name,
        phone,
        address,
        village,
        district,
        block,
        fatherName,
        category,
        gender,
        pinCode,
        projectName,
        farmerCode: "PENDING-SYNC",
      });
      reset();
      onClose();
      showToast("⚠️ No internet! Saved locally and will sync automatically.");
      return;
    }

    try {
      const result = isTrader 
        ? await registerTrader(payload)
        : await registerFarmer(payload);

      if (result.success) {
        onSuccess(((result as any).trader || (result as any).farmer) as {
          id: number;
          name: string;
          phone: string;
          address: string;
          town?: string;
          village?: string;
          district: string;
          block: string;
          fatherName?: string;
          farmerCode: string;
          category?: string;
          gender?: string;
          pinCode?: string;
          projectName?: string;
          assignedL3Id?: string;
        });
        reset();
        onClose();
      }
    } catch {
      setError("Network error. Turn off WiFi to save offline and sync later.");
    }

    setLoading(false);
  }

  if (!open) return null;

  return (
    <>
      {toastMessage ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toastMessage}
        </div>
      ) : null}
    <div className="fixed inset-0 z-[100] flex justify-center p-4 sm:p-6 overflow-y-auto items-start md:items-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={() => {
          reset();
          onClose();
        }}
      />

      <div className="relative w-full max-w-lg modal-spring my-auto z-10">
        <div className="glass rounded-3xl shadow-2xl shadow-black/15 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Register New {isTrader ? "Trader" : "Farmer"}
              </h2>
              <p className="text-sm text-slate-500">
                Step {step} of 2 —{" "}
                {step === 1 ? "Identity" : "Location & Bank Details"}
              </p>
            </div>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {offlineCount > 0 && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                <Shield size={14} /> 
                {syncing ? "Syncing to database..." : `${offlineCount} farmer${offlineCount > 1 ? 's' : ''} saved locally`}
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= 1 ? t.progress : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= 2 ? t.progress : "bg-slate-200"
                }`}
              />
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                  <button
                    onClick={() => setCategory("FARMER")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                      !isTrader ? "bg-white text-forest-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Farmer
                  </button>
                  <button
                    onClick={() => setCategory("TRADER")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                      isTrader ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Trader
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-xl ${t.bgLight} flex items-center justify-center`}>
                    <User size={18} className={t.textMain} />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    {isTrader ? "Trader" : "Farmer"} Identity
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base appearance-none`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Father's Name *
                  </label>
                  <input
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Enter father's name"
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                      transition-all duration-200 text-base`}
                  />
                </div>

                {isTrader && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Company *
                      </label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Enter company name"
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-base`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Promoter Name *
                      </label>
                      <input
                        value={promoterName}
                        onChange={(e) => setPromoterName(e.target.value)}
                        placeholder="Enter promoter's name"
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-base`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {isTrader ? "Mobile Number *" : "Phone Number *"}
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit phone"
                      type="tel"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Project Name
                    </label>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Project (Optional)"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                </div>

                {isTrader && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        PAN / GST Number *
                      </label>
                      <input
                        value={panGst}
                        onChange={(e) => setPanGst(e.target.value)}
                        placeholder="Enter PAN or GST number"
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-base`}
                      />
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Shield size={14} className="text-purple-600" />
                      Assign to Agent (Admin Only)
                    </label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 focus:outline-none focus:ring-2 ${t.ring} 
                        ${t.borderFocus} transition-all duration-200 text-base appearance-none`}
                    >
                      <option value="">Assign to myself</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Shield size={14} className="text-purple-600" />
                      Assign to L3 Group Leader
                    </label>
                    <select
                      value={selectedL3Id}
                      onChange={(e) => setSelectedL3Id(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 focus:outline-none focus:ring-2 ${t.ring} 
                        ${t.borderFocus} transition-all duration-200 text-base appearance-none`}
                    >
                      <option value="">No Group Leader</option>
                      {agents.filter(a => a.role === "L3_PO_MAKER").map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 pb-2">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <MapPin size={18} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Location Details
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street Address / House No."
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                      transition-all duration-200 text-base`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {isTrader ? "Village/City *" : "Village *"}
                    </label>
                    <input
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="Village name"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {isTrader ? "Block / Taluka *" : "Block *"}
                    </label>
                    <input
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="Block / Taluka"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Pin Code
                  </label>
                  <input
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="6-digit pin code"
                    maxLength={6}
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                      transition-all duration-200 text-sm`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      State Search *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={stateSearch}
                        onChange={(e) => {
                          setStateSearch(e.target.value);
                          setShowStateDropdown(true);
                        }}
                        onFocus={(e) => {
                          setStateSearch(state);
                          setShowStateDropdown(true);
                          setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                        }}
                        onBlur={() => setTimeout(() => {
                          setShowStateDropdown(false);
                          setStateSearch(state);
                        }, 200)}
                        placeholder="Search State..."
                        className={`w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-sm`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {showStateDropdown && (
                      <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto p-1" onTouchMove={() => (document.activeElement as HTMLElement)?.blur()}>
                          {filteredStates.length > 0 ? (
                            filteredStates.map((s) => (
                              <div
                                key={s}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setState(s);
                                  setStateSearch(s);
                                  setDistrict("");
                                  setDistrictSearch("");
                                  setTown("");
                                  setMandiSearch("");
                                  setShowStateDropdown(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${state === s ? (isTrader ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-forest-50 text-forest-700 font-medium') : 'text-slate-700 hover:bg-slate-100'}`}
                              >
                                <span className="text-sm truncate pr-2">{s}</span>
                                {state === s && <Check size={14} className="flex-shrink-0" />}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">No states found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      District Search *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={districtSearch}
                        onChange={(e) => {
                          setDistrictSearch(e.target.value);
                          setShowDistrictDropdown(true);
                        }}
                        onFocus={(e) => {
                          setDistrictSearch(district);
                          setShowDistrictDropdown(true);
                          setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                        }}
                        onBlur={() => setTimeout(() => {
                          setShowDistrictDropdown(false);
                          setDistrictSearch(district);
                        }, 200)}
                        disabled={!state}
                        placeholder={state ? "Search District..." : "Select State"}
                        className={`w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {showDistrictDropdown && (
                      <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto p-1" onTouchMove={() => (document.activeElement as HTMLElement)?.blur()}>
                          {filteredDistricts.length > 0 ? (
                            filteredDistricts.map((d) => (
                              <div
                                key={d}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setDistrict(d);
                                  setDistrictSearch(d);
                                  setTown("");
                                  setMandiSearch("");
                                  setShowDistrictDropdown(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${district === d ? (isTrader ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-forest-50 text-forest-700 font-medium') : 'text-slate-700 hover:bg-slate-100'}`}
                              >
                                <span className="text-sm truncate pr-2">{d}</span>
                                {district === d && <Check size={14} className="flex-shrink-0" />}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">No districts found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mandi Search *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={mandiSearch}
                      onChange={(e) => {
                        setMandiSearch(e.target.value);
                        setShowMandiDropdown(true);
                      }}
                      onFocus={(e) => {
                        setMandiSearch(town); // Reset search to current selection on focus
                        setShowMandiDropdown(true);
                        setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                      }}
                      onBlur={() => setTimeout(() => {
                        setShowMandiDropdown(false);
                        setMandiSearch(town); // Revert search text to actual selected town if not clicked
                      }, 200)}
                        disabled={!district}
                        placeholder={district ? "Type to search..." : "Select District"}
                        className={`w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {showMandiDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-60 overflow-y-auto p-1" onTouchMove={() => (document.activeElement as HTMLElement)?.blur()}>
                        {filteredMandis.length > 0 ? (
                          filteredMandis.map((m) => (
                            <div
                              key={m.mandiName}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTown(m.mandiName);
                                setMandiSearch(m.mandiName);
                                setShowMandiDropdown(false);
                              }}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${town === m.mandiName ? (isTrader ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-forest-50 text-forest-700 font-medium') : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <div className="flex flex-col">
                                <span>{m.mandiName}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{m.district}, {m.state}</span>
                              </div>
                              {town === m.mandiName && <Check size={16} />}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-sm text-slate-500 text-center">
                            No mandis found matching <span className="font-semibold text-slate-700">"{mandiSearch}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>


              {/* Optional Bank Details Toggle */}
              {!showBankDetails ? (
                  <button
                    onClick={() => setShowBankDetails(true)}
                    className={`w-full py-3 mt-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2`}
                  >
                    <Shield size={16} />
                    Add {isTrader ? "Trader" : "Farmer"} Bank Account (Optional)
                  </button>
                ) : (
                  <div className="space-y-4 pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Shield size={18} className="text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">
                          Bank Details
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowBankDetails(false);
                          setBankName("");
                          setIfscCode("");
                          setAccountNumber("");
                        }}
                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Bank Name
                      </label>
                      <input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                          text-slate-800 placeholder:text-slate-400 
                          focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                          transition-all duration-200 text-base`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          IFSC Code
                        </label>
                        <input
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="IFSC Code"
                          className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                            text-slate-800 placeholder:text-slate-400 
                            focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                            transition-all duration-200 text-base`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Account Number
                        </label>
                        <input
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                            text-slate-800 placeholder:text-slate-400 
                            focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                            transition-all duration-200 text-base`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-6">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium 
                  text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                onClick={() => {
                  if (step === 1) {
                    if (!name.trim() || !phone.trim()) {
                      setError("Full Name and Phone Number are required.");
                      return;
                    }
                    if (isTrader) {
                      if (!company.trim() || !promoterName.trim() || !panGst.trim()) {
                        setError("Company, Promoter Name, and PAN/GST are required for Traders.");
                        return;
                      }
                    } else {
                      if (!fatherName.trim()) {
                        setError("Father's Name is required for Farmers.");
                        return;
                      }
                    }
                  }
                  setError("");
                  setStep(step + 1);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold 
                  ${t.bgDark} text-white ${t.textHover} 
                  transition-colors shadow-sm`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold 
                  bg-gradient-to-r ${t.gradient} text-white 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all shadow-sm`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
