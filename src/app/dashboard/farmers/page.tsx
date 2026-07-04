"use client";

import { useState, useOptimistic, useEffect } from "react";
import { getFarmers } from "@/app/actions/farmers";
import CommandBar from "@/components/CommandBar";
import FarmerRegistrationModal from "@/components/FarmerRegistrationModal";
import { Plus, User, Users, ChevronRight, RefreshCw, Filter, FilterX, ChevronDown, ChevronLeft, Search, Check, Phone, MapPin } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import Link from "next/link";
import { useDebounce } from "@/lib/use-debounce";
import { useSWRCache, invalidateCache } from "@/lib/swr-cache";

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
  _source?: string;
}

export default function FarmersPage() {
  const [showModal, setShowModal] = useState(false);
  const [districtFilter, setDistrictFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  // Combobox state
  const [activeDropdown, setActiveDropdown] = useState<"village" | "district" | "block" | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.combobox-filter')) {
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

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  // Debounce filter inputs — wait 400ms after user stops typing
  const debouncedDistrict = useDebounce(districtFilter, 400, 2);
  const debouncedBlock = useDebounce(blockFilter, 400, 2);
  const debouncedVillage = useDebounce(villageFilter, 400, 2);

  // Build a cache key from the current filters
  const cacheKey = `farmers-list-${categoryFilter}-${debouncedDistrict}-${debouncedBlock}-${debouncedVillage}`;

  // SWR cached farmers list — instant on repeat navigation
  const {
    data: farmers,
    isLoading: loading,
    isValidating,
    mutate,
  } = useSWRCache<Farmer[]>(
    cacheKey,
    () =>
      getFarmers({
        district: debouncedDistrict || undefined,
        block: debouncedBlock || undefined,
        village: debouncedVillage || undefined,
        category: categoryFilter || undefined,
      }).then((data) => data as Farmer[]),
    { ttl: 60000 } // 60 second cache TTL
  );

  const farmersList = farmers || [];

  // Optimistic updates
  const [optimisticFarmers, addOptimisticFarmer] = useOptimistic(
    farmersList,
    (state: Farmer[], newFarmer: Farmer) => [newFarmer, ...state]
  );

  function handleFarmerAdded(farmer: Farmer) {
    addOptimisticFarmer(farmer);
    // Invalidate all farmer caches so any page shows fresh data
    invalidateCache("farmers-*");
    invalidateCache("dashboard-*");
    // Refetch current view
    setTimeout(() => mutate(), 500);
  }

  // Derived arrays for dropdowns
  const uniqueVillages = Array.from(new Set(farmersList.map(f => f.village).filter(Boolean)));
  const uniqueDistricts = Array.from(new Set(farmersList.map(f => f.district).filter(Boolean)));
  const uniqueBlocks = Array.from(new Set(farmersList.map(f => f.block).filter(Boolean)));

  // Pagination derived state
  const totalEntries = optimisticFarmers.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedFarmers = optimisticFarmers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  
  // Handlers
  const handleClear = () => {
    setVillageFilter("");
    setDistrictFilter("");
    setBlockFilter("");
    setCategoryFilter("");
    setPageIndex(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Farmer Directory
            </h1>
          </div>
          <p className="text-slate-500 mt-1.5 flex items-center gap-2 text-sm ml-[52px]">
            {totalEntries} registered entries
            {isValidating && (
              <RefreshCw size={12} className="animate-spin text-forest-500" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
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
      </div>

      {/* Segmented Control */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-100">
        <button
          onClick={() => { setCategoryFilter(""); setPageIndex(0); }}
          className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-all ${
            categoryFilter === "" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setCategoryFilter("FARMER"); setPageIndex(0); }}
          className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-all ${
            categoryFilter === "FARMER" ? "bg-white text-forest-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Farmer
        </button>
        <button
          onClick={() => { setCategoryFilter("TRADER"); setPageIndex(0); }}
          className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-all ${
            categoryFilter === "TRADER" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Trader
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex-1 w-full min-w-[200px]">
          <CommandBar />
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:gap-3 w-full lg:w-auto pb-1 relative z-[60]">
          <div className="flex flex-col shrink-0 w-[calc(50%-0.25rem)] sm:w-[160px] xl:w-[180px] combobox-filter relative">
            <div className="relative">
              <input
                value={activeDropdown === 'village' ? dropdownSearch : (villageFilter || "")}
                onChange={(e) => {
                  setDropdownSearch(e.target.value);
                  setActiveDropdown('village');
                }}
                onFocus={() => {
                  setDropdownSearch(villageFilter);
                  setActiveDropdown('village');
                }}
                placeholder="Filter by village"
                className={`w-full pl-4 pr-8 h-[46px] rounded-xl border border-transparent sm:border-slate-200 bg-slate-50 sm:bg-white text-slate-800 placeholder:text-slate-500 sm:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-forest-500 focus:ring-forest-500/30 transition-all text-sm font-medium cursor-pointer ${villageFilter ? 'sm:border-forest-300 ring-1 ring-forest-500/20' : ''}`}
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {activeDropdown === 'village' && (
              <div className="absolute top-full mt-2 left-0 z-[60] w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-48 overflow-y-auto p-1">
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setVillageFilter("");
                      setPageIndex(0);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${!villageFilter ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="text-sm truncate pr-2">All Villages</span>
                    {!villageFilter && <Check size={14} className="flex-shrink-0" />}
                  </div>
                  {uniqueVillages.filter(v => v && v.toLowerCase().includes(dropdownSearch.toLowerCase())).map((v) => (
                    <div
                      key={v}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setVillageFilter(v as string);
                        setPageIndex(0);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${villageFilter === v ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="text-sm truncate pr-2">{v}</span>
                      {villageFilter === v && <Check size={14} className="flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col shrink-0 w-[calc(50%-0.25rem)] sm:w-[160px] xl:w-[180px] combobox-filter relative">
            <div className="relative">
              <input
                value={activeDropdown === 'district' ? dropdownSearch : (districtFilter || "")}
                onChange={(e) => {
                  setDropdownSearch(e.target.value);
                  setActiveDropdown('district');
                }}
                onFocus={() => {
                  setDropdownSearch(districtFilter);
                  setActiveDropdown('district');
                }}
                placeholder="Filter by district"
                className={`w-full pl-4 pr-8 h-[46px] rounded-xl border border-transparent sm:border-slate-200 bg-slate-50 sm:bg-white text-slate-800 placeholder:text-slate-500 sm:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-forest-500 focus:ring-forest-500/30 transition-all text-sm font-medium cursor-pointer ${districtFilter ? 'sm:border-forest-300 ring-1 ring-forest-500/20' : ''}`}
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {activeDropdown === 'district' && (
              <div className="absolute top-full mt-2 right-0 sm:left-0 sm:right-auto z-[60] w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-48 overflow-y-auto p-1">
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDistrictFilter("");
                      setPageIndex(0);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${!districtFilter ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="text-sm truncate pr-2">All Districts</span>
                    {!districtFilter && <Check size={14} className="flex-shrink-0" />}
                  </div>
                  {uniqueDistricts.filter(v => v && v.toLowerCase().includes(dropdownSearch.toLowerCase())).map((v) => (
                    <div
                      key={v}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDistrictFilter(v as string);
                        setPageIndex(0);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${districtFilter === v ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="text-sm truncate pr-2">{v}</span>
                      {districtFilter === v && <Check size={14} className="flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col shrink-0 w-[calc(50%-0.25rem)] sm:w-[160px] xl:w-[180px] combobox-filter relative">
            <div className="relative">
              <input
                value={activeDropdown === 'block' ? dropdownSearch : (blockFilter || "")}
                onChange={(e) => {
                  setDropdownSearch(e.target.value);
                  setActiveDropdown('block');
                }}
                onFocus={() => {
                  setDropdownSearch(blockFilter);
                  setActiveDropdown('block');
                }}
                placeholder="Filter by block"
                className={`w-full pl-4 pr-8 h-[46px] rounded-xl border border-transparent sm:border-slate-200 bg-slate-50 sm:bg-white text-slate-800 placeholder:text-slate-500 sm:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-forest-500 focus:ring-forest-500/30 transition-all text-sm font-medium cursor-pointer ${blockFilter ? 'sm:border-forest-300 ring-1 ring-forest-500/20' : ''}`}
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {activeDropdown === 'block' && (
              <div className="absolute top-full mt-2 left-0 z-[60] w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-48 overflow-y-auto p-1">
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setBlockFilter("");
                      setPageIndex(0);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${!blockFilter ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="text-sm truncate pr-2">All Blocks</span>
                    {!blockFilter && <Check size={14} className="flex-shrink-0" />}
                  </div>
                  {uniqueBlocks.filter(v => v && v.toLowerCase().includes(dropdownSearch.toLowerCase())).map((v) => (
                    <div
                      key={v}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setBlockFilter(v as string);
                        setPageIndex(0);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${blockFilter === v ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="text-sm truncate pr-2">{v}</span>
                      {blockFilter === v && <Check size={14} className="flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 text-red-500 font-semibold text-sm h-[46px] w-[calc(50%-0.25rem)] sm:w-auto px-3 shrink-0 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <FilterX size={16} /> Clear
          </button>
        </div>
      </div>

      {/* List View */}
      {loading && !farmers ? (
        <ListSkeleton rows={6} />
      ) : optimisticFarmers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-100">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-50/40 rounded-2xl overflow-hidden mt-6 shadow-sm">
          <div className="overflow-x-auto hide-scrollbar">
            <div className="min-w-[900px]">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_2fr_1.5fr_1.5fr_2fr_0.5fr] gap-4 p-4 bg-[#e6f4ea] text-[11px] font-bold text-forest-800 uppercase tracking-wider rounded-t-2xl">
                <div className="pl-4">FARMER CODE</div>
                <div>FARMER NAME</div>
                <div>MOBILE NUMBER</div>
                <div>MANDI</div>
                <div>ADDRESS</div>
                <div className="text-right pr-4">ACTIONS</div>
              </div>
              
              {/* Table Body */}
              <div className="bg-slate-50">
                {paginatedFarmers.map((farmer, index) => (
                  <Link 
                    key={farmer.id} 
                    href={`/dashboard/farmers/${farmer._source === "TRADER" ? 't' : 'f'}${farmer.id}`} 
                    className={`grid grid-cols-[1fr_2fr_1.5fr_1.5fr_2fr_0.5fr] gap-4 p-4 items-center hover:bg-slate-100 transition-colors group ${index !== paginatedFarmers.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    {/* Code */}
                    <div className="pl-4">
                      <span className="text-xs font-mono bg-slate-200/50 text-slate-600 px-2 py-1 rounded-md inline-block">{farmer.farmerCode || "—"}</span>
                    </div>
                    
                    {/* Profile */}
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${farmer.category === "TRADER" ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-forest-100 to-forest-200"}`}>
                        <span className={`text-sm font-bold ${farmer.category === "TRADER" ? "text-blue-700" : "text-forest-700"}`}>
                          {farmer.name?.[0] || "F"}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm leading-tight max-w-[160px] break-words">
                          {farmer.name}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile */}
                    <div className="text-sm font-medium text-slate-700">
                      {farmer.phone}
                    </div>
                    
                    {/* Mandi */}
                    <div>
                      <span className="text-[10px] font-bold text-forest-700 bg-[#e6f4ea] px-2 py-1 rounded-md uppercase tracking-wide inline-block">
                        {farmer.town || "MAIN MANDI"}
                      </span>
                    </div>
                    
                    {/* Address */}
                    <div className="text-xs text-slate-600 leading-relaxed pr-2">
                      {[farmer.address, farmer.village, farmer.district].filter(Boolean).join(", ")}
                    </div>
                    
                    {/* Actions */}
                    <div className="text-right pr-4 flex justify-end">
                      <ChevronRight size={18} className="text-forest-600/60 group-hover:text-forest-700 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
          <div className="md:hidden flex flex-col gap-3 mt-6">
            {paginatedFarmers.map((farmer) => (
              <Link
                key={farmer.id} 
                href={`/dashboard/farmers/${farmer._source === "TRADER" ? 't' : 'f'}${farmer.id}`} 
                className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                   {/* Avatar */}
                   <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 ${farmer.category === "TRADER" ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-green-100 to-green-200"}`}>
                     <span className={`text-base font-bold ${farmer.category === "TRADER" ? "text-blue-700" : "text-green-800"}`}>
                       {farmer.name?.[0] || "F"}
                     </span>
                   </div>
                   
                   {/* Content */}
                   <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                     <h3 className="font-bold text-slate-800 text-[15px] leading-tight truncate">{farmer.name}</h3>
                     <span className="text-[10px] font-mono bg-[#f1f5f9] text-slate-500 px-1.5 py-0.5 rounded inline-flex self-start">{farmer.farmerCode || "—"}</span>
                     
                     <div className="flex flex-col gap-1 mt-1.5">
                       <div className="flex items-center gap-1.5 text-slate-500">
                         <Phone size={12} className="shrink-0" />
                         <span className="text-[11px] truncate">{farmer.phone}</span>
                       </div>
                       <div className="flex items-start gap-1.5 text-slate-500">
                         <MapPin size={12} className="shrink-0 mt-[2px]" />
                         <span className="text-[11px] leading-tight line-clamp-1">{[farmer.address, farmer.village, farmer.district].filter(Boolean).join(", ")}</span>
                       </div>
                     </div>
                   </div>
                </div>
                
                <ChevronRight size={18} className="text-slate-300 shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        
        {/* Pagination Footer */}
        {totalEntries > 0 && (
            <div className="flex items-center justify-between px-6 py-6 bg-transparent">
              <div className="text-sm text-slate-500 font-medium">
                Showing {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, totalEntries)} of {totalEntries} entries
              </div>
              <div className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-xl border border-slate-100">
                <button 
                  onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  if (totalPages > 5 && i !== 0 && i !== totalPages - 1 && Math.abs(i - pageIndex) > 1) {
                    if (i === 1 || i === totalPages - 2) return <span key={i} className="px-1 text-slate-400">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setPageIndex(i)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                        pageIndex === i 
                          ? 'bg-forest-800 text-white shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                  disabled={pageIndex === totalPages - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
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
