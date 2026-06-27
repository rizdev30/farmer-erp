"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronRight, ChevronLeft, User, MapPin, Shield } from "lucide-react";
import { registerFarmer } from "@/app/actions/farmers";
import { getAgentsList } from "@/app/actions/procurement";
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
  const [panGst, setPanGst] = useState("");
  const [company, setCompany] = useState("");
  const [promoterName, setPromoterName] = useState("");

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

  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem("offlineFarmers") || "[]");
    setOfflineCount(queue.length);

    const handleOnline = async () => {
      const pending = JSON.parse(localStorage.getItem("offlineFarmers") || "[]");
      if (pending.length === 0) return;

      setSyncing(true);
      try {
        for (const farmerData of pending) {
          await registerFarmer(farmerData);
        }
        localStorage.removeItem("offlineFarmers");
        setOfflineCount(0);
        alert("Success! All offline farmers have been registered to the database.");
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
    setState("");
    setPanGst("");
    setCompany("");
    setPromoterName("");
    setSelectedAgentId("");
    setSelectedL3Id("");
    setError("");
    setLoading(false);
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

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
      alert("⚠️ No internet connection! Farmer saved locally. Do not close the app; it will automatically sync when internet is restored.");
      return;
    }

    try {
      const result = await registerFarmer(payload);

      if (result.success) {
        onSuccess(result.farmer as {
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
                {step === 1 ? "Identity" : "Location"}
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
                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Mandi
                      </label>
                      <input
                        value={town}
                        onChange={(e) => setTown(e.target.value)}
                        placeholder="Enter Mandi"
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
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <MapPin size={18} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Location Details
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Address
                    </label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Village / Street"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Pin Code
                    </label>
                    <input
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="Pin code"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      State
                    </label>
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
                  <div className="hidden"></div>
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
                      District *
                    </label>
                    <input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="District"
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 ${t.ring} ${t.borderFocus} 
                        transition-all duration-200 text-base`}
                    />
                  </div>
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
                  if (!name.trim() || !fatherName.trim() || !phone.trim()) {
                    setError("Name, Father's Name, and Phone are required");
                    return;
                  }
                  setError("");
                  setStep(2);
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
                disabled={loading || !village.trim() || !district.trim() || !block.trim()}
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
  );
}
