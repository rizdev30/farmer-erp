"use client";

import { useState, useEffect, useOptimistic } from "react";
import { getFarmers } from "@/app/actions/farmers";
import CommandBar from "@/components/CommandBar";
import FarmerRegistrationModal from "@/components/FarmerRegistrationModal";
import { Plus, Phone, MapPin, User, ArrowRight } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import Link from "next/link";

interface Farmer {
  id: number;
  name: string;
  phone: string;
  address: string;
  town?: string;
  village?: string;
  district: string;
  block: string;
  farmerCode: string;
  fatherName?: string;
  category?: string;
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [districtFilter, setDistrictFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Optimistic updates
  const [optimisticFarmers, addOptimisticFarmer] = useOptimistic(
    farmers,
    (state: Farmer[], newFarmer: Farmer) => [newFarmer, ...state]
  );

  useEffect(() => {
    loadFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtFilter, blockFilter, villageFilter, categoryFilter]);

  async function loadFarmers() {
    setLoading(true);
    try {
      const data = await getFarmers({
        district: districtFilter,
        block: blockFilter,
        village: villageFilter,
        category: categoryFilter || undefined,
      });
      setFarmers(data as Farmer[]);
    } catch {
      setFarmers([]);
    }
    setLoading(false);
  }

  function handleFarmerAdded(farmer: Farmer) {
    addOptimisticFarmer(farmer);
    // Refresh list from server
    setTimeout(loadFarmers, 500);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Farmer/Traders Directory
          </h1>
          <p className="text-slate-500 mt-1">
            {optimisticFarmers.length} registered entries
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl 
            bg-gradient-to-r from-forest-800 to-forest-700 text-white text-sm font-semibold
            hover:from-forest-700 hover:to-forest-600 
            shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Farmer/Trader
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="w-full">
          <CommandBar />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl h-[46px] col-span-2 md:col-span-1">
            <button
              onClick={() => setCategoryFilter("")}
              className={`flex-1 text-sm font-semibold rounded-xl transition-all ${
                categoryFilter === "" ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter("FARMER")}
              className={`flex-1 text-sm font-semibold rounded-xl transition-all ${
                categoryFilter === "FARMER" ? "bg-forest-100 text-forest-800 shadow-sm ring-1 ring-forest-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Farmer
            </button>
            <button
              onClick={() => setCategoryFilter("TRADER")}
              className={`flex-1 text-sm font-semibold rounded-xl transition-all ${
                categoryFilter === "TRADER" ? "bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Trader
            </button>
          </div>
          <input
            placeholder="Filter by village"
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="px-4 h-[46px] rounded-2xl bg-slate-100 border-none
              text-sm font-medium text-slate-800 placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:bg-white
              transition-all"
          />
          <input
            placeholder="Filter by district"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-4 h-[46px] rounded-2xl bg-slate-100 border-none
              text-sm font-medium text-slate-800 placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:bg-white
              transition-all"
          />
          <input
            placeholder="Filter by block"
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-4 h-[46px] rounded-2xl bg-slate-100 border-none
              text-sm font-medium text-slate-800 placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:bg-white
              transition-all"
          />
        </div>
      </div>

      {/* Farmer List */}
      {loading ? (
        <ListSkeleton rows={6} />
      ) : optimisticFarmers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No entries found
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {districtFilter || blockFilter || villageFilter || categoryFilter
              ? "Try adjusting your filters"
              : "Register your first farmer/trader to get started"}
          </p>
          {!districtFilter && !blockFilter && !villageFilter && !categoryFilter && (
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-forest-800 text-white text-sm font-semibold 
                hover:bg-forest-700 transition-colors"
            >
              Register Farmer/Trader
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optimisticFarmers.map((farmer) => (
            <Link 
              key={farmer.id} 
              href={`/dashboard/farmers/${farmer.id}`}
              className="glass-card rounded-2xl p-5 hover:shadow-md transition-shadow group relative block"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${farmer.category === "TRADER" ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-forest-100 to-forest-200"}`}>
                  <span className={`text-sm font-bold ${farmer.category === "TRADER" ? "text-blue-700" : "text-forest-700"}`}>
                    {farmer.name?.[0] || "F"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="truncate">{farmer.name}</span>
                    {farmer.category === "TRADER" && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">Trader</span>
                    )}
                  </h3>
                  <p className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                    {farmer.farmerCode || "—"}
                  </p>
                  
                  {farmer.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                      <Phone size={13} />
                      {farmer.phone}
                    </p>
                  )}
                  {(farmer.village || farmer.district || farmer.block) && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                      <MapPin size={13} />
                      {[farmer.village, farmer.block, farmer.district]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className={`absolute top-1/2 -translate-y-1/2 right-4 transition-colors ${farmer.category === "TRADER" ? "text-slate-300 group-hover:text-blue-500" : "text-slate-300 group-hover:text-forest-500"}`}>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-2xl 
          bg-gradient-to-br from-forest-600 to-forest-700 text-white 
          shadow-xl shadow-forest-900/30 flex items-center justify-center
          active:scale-95 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      {/* Registration Modal */}
      <FarmerRegistrationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleFarmerAdded}
      />
    </div>
  );
}
