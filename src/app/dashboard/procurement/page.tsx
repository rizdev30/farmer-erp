"use client";

import { useState, useEffect, useMemo } from "react";
import {
  createProcurement,
  ProcurementReceipt,
} from "@/app/actions/procurement";
import { searchFarmers } from "@/app/actions/farmers";
import PurchaseSlip from "@/components/PurchaseSlip";
import {
  Search,
  Scale,
  Loader2,
  User,
  ShoppingCart,
  Shield,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { getAgentsList } from "@/app/actions/procurement";

interface Farmer {
  id: number;
  name: string;
  phone: string;
  district: string;
  block: string;
  fatherName: string;
  farmerCode: string;
  village: string;
}

export default function ProcurementPage() {
  // State
  const [farmerQuery, setFarmerQuery] = useState("");
  const [farmerResults, setFarmerResults] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [searchingFarmer, setSearchingFarmer] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [crop, setCrop] = useState("Rice");
  const [variety, setVariety] = useState("");
  const [bags, setBags] = useState("");
  const [grossQuantity, setGrossQuantity] = useState("");
  const [deduction, setDeduction] = useState("");
  const [rate, setRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [receipt, setReceipt] = useState<ProcurementReceipt | null>(null);

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [agents, setAgents] = useState<{ id: string, name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  useEffect(() => {
    if (isAdmin) {
      getAgentsList().then(setAgents).catch(console.error);
    }
  }, [isAdmin]);

  // Live math
  const netQuantity = useMemo(() => {
    const gross = parseFloat(grossQuantity) || 0;
    const ded = parseFloat(deduction) || 0;
    return Math.max(0, Math.round((gross - ded) * 100) / 100);
  }, [grossQuantity, deduction]);

  const total = useMemo(() => {
    const r = parseFloat(rate) || 0;
    return Math.round(netQuantity * r * 100) / 100;
  }, [netQuantity, rate]);

  // Farmer search
  useEffect(() => {
    if (!farmerQuery || farmerQuery.length < 2) {
      setFarmerResults([]);
      return;
    }

    setSearchingFarmer(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchFarmers(farmerQuery);
        setFarmerResults(data as Farmer[]);
      } catch {
        setFarmerResults([]);
      }
      setSearchingFarmer(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [farmerQuery]);

  // Offline Sync State
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem("offlineProcurements") || "[]");
    setOfflineCount(queue.length);

    const handleOnline = async () => {
      const pending = JSON.parse(localStorage.getItem("offlineProcurements") || "[]");
      if (pending.length === 0) return;

      setSyncing(true);
      try {
        for (const item of pending) {
          await createProcurement(item.payload);
        }
        localStorage.removeItem("offlineProcurements");
        setOfflineCount(0);
        alert("Success! All offline procurements have been synced to the database.");
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

  function resetForm() {
    setSelectedFarmer(null);
    setFarmerQuery("");
    setVariety("");
    setBags("");
    setGrossQuantity("");
    setDeduction("");
    setRate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmer) {
      setError("Please select a farmer");
      return;
    }
    if (!grossQuantity || parseFloat(grossQuantity) <= 0) {
      setError("Please enter a valid gross quantity");
      return;
    }
    if (!rate || parseFloat(rate) <= 0) {
      setError("Please enter a valid rate");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      fatherName: selectedFarmer.fatherName,
      farmerCode: selectedFarmer.farmerCode,
      village: selectedFarmer.village,
      crop,
      variety,
      bags: parseInt(bags) || 0,
      grossQuantity: parseFloat(grossQuantity),
      deduction: parseFloat(deduction) || 0,
      rate: parseFloat(rate),
      agentId: selectedAgentId || undefined,
    };

    if (!navigator.onLine) {
      const offlineQueue = JSON.parse(localStorage.getItem("offlineProcurements") || "[]");
      const offlineId = `OFF-${Date.now().toString().slice(-5)}`;
      
      const offlineReceipt: ProcurementReceipt = {
        id: Date.now(),
        slipId: offlineId,
        farmerName: payload.farmerName,
        farmerCode: payload.farmerCode || "",
        fatherName: payload.fatherName || "",
        village: payload.village || "",
        crop: payload.crop,
        variety: payload.variety,
        bags: payload.bags,
        grossQuantity: payload.grossQuantity,
        deduction: payload.deduction,
        netQuantity,
        rate: payload.rate,
        total,
        timestamp: new Date().toISOString(),
        agentName: session?.user?.name || "Agent",
      };

      offlineQueue.push({ payload, receipt: offlineReceipt });
      localStorage.setItem("offlineProcurements", JSON.stringify(offlineQueue));
      setOfflineCount(offlineQueue.length);
      
      setReceipt(offlineReceipt);
      resetForm();
      setSubmitting(false);
      alert("⚠️ No internet connection! Procurement saved locally on your phone. Do not close the app; it will automatically sync to the database when internet is restored.");
      return;
    }

    try {
      const result = await createProcurement(payload);
      setReceipt(result);
      resetForm();
    } catch (err) {
      setError("Failed to process procurement. If your internet dropped, turn off WiFi and try again to save offline.");
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
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            1. Select Farmer
          </label>

          {selectedFarmer ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-forest-50 border border-forest-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-forest-100 flex items-center justify-center">
                  <User size={16} className="text-forest-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-forest-800">
                    {selectedFarmer.name}
                  </p>
                  <p className="text-xs text-forest-600 font-mono mt-0.5">
                    {selectedFarmer.farmerCode || "No Code"}
                  </p>
                </div>
              </div>
              <div className="text-right">
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
                className="text-xs text-forest-600 hover:text-forest-800 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white/60">
                <Search size={16} className="text-slate-400" />
                <input
                  value={farmerQuery}
                  onChange={(e) => {
                    setFarmerQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type farmer name to search..."
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
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            2. Transaction Details
          </label>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Crop */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Crop
                </label>
                <input
                  type="text"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    focus:ring-forest-500/30 transition-all text-base font-medium"
                />
              </div>

              {/* Variety */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Variety
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. Basmati"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    focus:ring-forest-500/30 transition-all text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Bags */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  No. of Bags
                </label>
                <input
                  type="number"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    focus:ring-forest-500/30 transition-all text-base"
                />
              </div>

              {/* Gross Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Gross Qty (Qtl)
                </label>
                <input
                  type="number"
                  value={grossQuantity}
                  onChange={(e) => setGrossQuantity(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    focus:ring-forest-500/30 transition-all text-base"
                />
              </div>

              {/* Deduction */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Deduction (Qtl)
                </label>
                <input
                  type="number"
                  value={deduction}
                  onChange={(e) => setDeduction(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 
                    focus:ring-forest-500/30 transition-all text-base"
                />
              </div>

              {/* Rate */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Rate (₹ per Quintal)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all text-base"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/50 rounded-xl p-3 mt-4 border border-slate-200/50 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Net Quantity</span>
              <span className="text-sm font-bold text-slate-700">{netQuantity} Quintals</span>
            </div>

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Shield size={14} className="text-purple-600" />
                  Assign to Agent (Admin Only)
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-500/30 
                    focus:border-forest-500 transition-all duration-200 text-base appearance-none"
                >
                  <option value="">Assign to myself</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">If not selected, it will be assigned to you.</p>
              </div>
            )}
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
                  {netQuantity} Net Qtl × ₹{rate || "0"}
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
          disabled={submitting || !selectedFarmer || !grossQuantity || !rate}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-forest-800 to-forest-700 
            text-white text-base font-semibold
            hover:from-forest-700 hover:to-forest-600 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg shadow-forest-900/20 
            hover:shadow-xl active:scale-[0.99]"
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
      {receipt && (
        <PurchaseSlip
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
