"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  getProcurementHistory,
  getMonthlySummary,
  getAgentsList,
  getProcurementBySlipId,
} from "@/app/actions/procurement";
import {
  ClipboardList,
  Calendar,
  Filter,
  ChevronDown,
  TrendingUp,
  Package,
  IndianRupee,
  User,
  Loader2,
  FileText,
  BarChart3,
  ChevronRight,
  Search,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/lib/use-debounce";
import { useSWRCache, prefetchCache } from "@/lib/swr-cache";

interface ProcurementRecord {
  id: number;
  slipId: string;
  farmerId: number;
  farmerName: string;
  fatherName: string;
  farmerCode: string;
  village: string;
  crop: string;
  variety: string;
  bags: number;
  grossQuantity: number;
  deduction: number;
  netQuantity: number;
  rate: number;
  total: number;
  agentId: string;
  agentName: string;
  status: string;
  l2ApproverName?: string | null;
  l3ApproverName?: string | null;
  l2Edited?: boolean;
  l3Edited?: boolean;
  createdByAdmin: boolean;
  validated: boolean;
  createdAt: string;
}

interface MonthlySummary {
  monthKey: string;
  label: string;
  totalTransactions: number;
  totalQuantity: number;
  totalPayout: number;
  agents: string[];
}

interface AgentOption {
  id: string;
  name: string;
  roles: string[];
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles || [];
  const isAdmin = roles.includes("L4_ADMIN") || (session?.user as any)?.isSuperAdmin;
  const isL2 = roles.includes("L2_APPROVAL");
  const isL3 = roles.includes("L3_PO_MAKER");

  // Filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "summary">("records");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [additionalRecords, setAdditionalRecords] = useState<ProcurementRecord[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search query — 400ms wait after user stops typing
  const debouncedSearch = useDebounce(searchQuery, 400, 2);

  // Data via agents list (admin only)
  const [agents, setAgents] = useState<AgentOption[]>([]);

  // SWR cache key based on current filters
  const recordsCacheKey = `history-records-${selectedMonth}-${selectedAgent}-${selectedStatus}`;
  const summaryCacheKey = `history-summary-${selectedAgent}`;

  // SWR cached records — instant on repeat navigation (fetches first 15)
  const {
    data: initialRecords = [],
    isLoading: recordsLoading,
    isValidating: recordsValidating,
  } = useSWRCache<ProcurementRecord[]>(
    recordsCacheKey,
    async () => {
      const filters: { year?: number; month?: number; agentId?: string; status?: string; limit?: number } = {};
      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-").map(Number);
        filters.year = year;
        filters.month = month;
      }
      if (selectedAgent) filters.agentId = selectedAgent;
      if (selectedStatus) filters.status = selectedStatus;
      filters.limit = 15;
      return await getProcurementHistory(filters);
    },
    { ttl: 45000 }
  );

  // Reset pagination when filters change
  useEffect(() => {
    setAdditionalRecords([]);
    setHasMore(true);
  }, [recordsCacheKey]);

  // Combine initial records with any additionally loaded records
  const allRecords = useMemo(() => {
    return [...initialRecords, ...additionalRecords];
  }, [initialRecords, additionalRecords]);

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const filters: any = {};
      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-").map(Number);
        filters.year = year;
        filters.month = month;
      }
      if (selectedAgent) filters.agentId = selectedAgent;
      if (selectedStatus) filters.status = selectedStatus;
      filters.limit = 15;
      filters.skip = allRecords.length;

      const newRecords = await getProcurementHistory(filters);
      if (newRecords.length < 15) {
        setHasMore(false);
      }
      
      // Filter out potential duplicates if records shifted in DB
      setAdditionalRecords(prev => {
        const existingIds = new Set([...initialRecords, ...prev].map(r => r.id));
        const uniqueNew = newRecords.filter(r => !existingIds.has(r.id));
        return [...prev, ...uniqueNew];
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const handleLoadMoreRef = useRef(handleLoadMore);
  
  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (node) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          handleLoadMoreRef.current();
        }
      }, { rootMargin: '800px' });
      observer.current.observe(node);
    }
  }, []);

  // SWR cached summary
  const {
    data: summary = [],
    isLoading: summaryLoading,
  } = useSWRCache<MonthlySummary[]>(
    summaryCacheKey,
    () => getMonthlySummary(selectedAgent ? { agentId: selectedAgent } : undefined),
    { ttl: 60000 }
  );

  const loading = recordsLoading || summaryLoading;

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
      });
      options.push({ key, label, year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return options;
  }, []);

  // Load agents list for admin
  useEffect(() => {
    if (isAdmin) {
      getAgentsList().then(setAgents).catch(() => setAgents([]));
    }
  }, [isAdmin]);

  const filteredRecords = useMemo(() => {
    if (!debouncedSearch) return allRecords;
    const lowerQuery = debouncedSearch.toLowerCase();
    return allRecords.filter((r) => 
      r.slipId.toLowerCase().includes(lowerQuery) ||
      r.farmerName.toLowerCase().includes(lowerQuery) ||
      (r.farmerCode && r.farmerCode.toLowerCase().includes(lowerQuery))
    );
  }, [allRecords, debouncedSearch]);

  // Totals for current view
  const viewTotals = useMemo(() => {
    const quantity = Math.round(filteredRecords.reduce((s, r) => s + r.netQuantity, 0) * 100) / 100;
    const payout = Math.round(filteredRecords.reduce((s, r) => s + r.total, 0) * 100) / 100;
    return {
      transactions: filteredRecords.length,
      quantity,
      payout,
      bags: filteredRecords.reduce((s, r) => s + r.bags, 0),
      avgRate: quantity > 0 ? Math.round(payout / quantity) : 0,
    };
  }, [filteredRecords]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 bg-amber-100/80 rounded-xl flex items-center justify-center">
          <ClipboardList size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
            Records
          </h1>
        </div>
      </div>



      {/* Summary Overview Card */}
      <div className="bg-white rounded-[1.25rem] border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
            <TrendingUp size={14} className="text-emerald-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Summary</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-0.5">Transactions</p>
            <p className="text-base font-semibold text-slate-700">{viewTotals.transactions}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-0.5">Total Qty <span className="text-[9px] font-normal">(Qtl)</span></p>
            <p className="text-base font-semibold text-slate-700">{viewTotals.quantity.toLocaleString('en-IN')}</p>
          </div>
          <div className="col-span-2 md:col-span-1 pt-4 md:pt-0 border-t md:border-none border-slate-100">
            <p className="text-[11px] font-medium text-slate-500 mb-0.5">Total Payout</p>
            <p className="text-base font-semibold text-slate-800 tracking-tight leading-none">
              {formatCurrency(viewTotals.payout)}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter row */}
      {activeTab === "records" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by Slip ID, Name or Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border transition-all relative ${
                showFilters || selectedMonth || selectedAgent || selectedStatus
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={20} />
              {(selectedMonth || selectedAgent || selectedStatus) && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 animate-in slide-in-from-top-2 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Month Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    <Calendar size={12} className="inline mr-1" />
                    Filter by Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 
                      text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
                      focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="">All Months</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agent Filter (Admin only) */}
                {isAdmin && (
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      <User size={12} className="inline mr-1" />
                      Filter by Agent
                    </label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 
                        text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
                        focus:border-indigo-500 transition-all appearance-none"
                    >
                      <option value="">All Agents</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.roles?.join(", ")})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    <Filter size={12} className="inline mr-1" />
                    Filter by Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 
                      text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
                      focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING_L2">Pending Level 2</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED_L2">Rejected Level 2</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedMonth || selectedAgent || selectedStatus) && (
                <button
                  onClick={() => {
                    setSelectedMonth("");
                    setSelectedAgent("");
                    setSelectedStatus("");
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Switch */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full">
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "records"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList size={16} />
          All Records
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "summary"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar size={16} />
          Monthly Summary
        </button>
      </div>

      {/* Quick Status Filters */}
      {activeTab === "records" && (
        <div className="grid grid-cols-4 gap-2 mb-3 mt-2">
          <button
            onClick={() => setSelectedStatus("")}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all border ${
              !selectedStatus
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus("PENDING")}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all border ${
              selectedStatus === "PENDING"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedStatus("APPROVED")}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all border ${
              selectedStatus === "APPROVED"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setSelectedStatus("REJECTED")}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all border ${
              selectedStatus === "REJECTED"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-red-600 border-red-300 hover:bg-red-50"
            }`}
          >
            Rejected
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton w-48 h-4" />
                  <div className="skeleton w-32 h-3" />
                </div>
                <div className="skeleton w-20 h-6" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "records" ? (
        /* Records Table */
        filteredRecords.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No records found
            </h3>
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "No records matched your search query"
                : selectedMonth || selectedAgent || selectedStatus
                ? "Try adjusting your filters"
                : "Procurement records will appear here after transactions"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Link
                key={record.id}
                href={`/dashboard/history/${record.slipId}`}
                onMouseEnter={() => prefetchCache(`receipt-${record.slipId}`, () => getProcurementBySlipId(record.slipId))}
                onTouchStart={() => prefetchCache(`receipt-${record.slipId}`, () => getProcurementBySlipId(record.slipId))}
                className="bg-white rounded-2xl p-4 sm:p-4 hover:shadow-md hover:border-slate-200 border border-slate-100 transition-all group relative block"
              >
                <div className="absolute right-4 top-4 text-slate-400 group-hover:text-forest-500 transition-colors">
                  <ChevronRight size={18} />
                </div>
                
                <div className="flex flex-col gap-3.5">
                  {/* Top: Profile + Name Info */}
                  <div className="flex items-start gap-3 pr-8">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${record.farmerCode?.startsWith("T") ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-forest-100 to-forest-200"}`}>
                      <span className={`text-sm font-bold ${record.farmerCode?.startsWith("T") ? "text-blue-700" : "text-forest-700"}`}>
                        {record.farmerName?.[0] || (record.farmerCode?.startsWith("T") ? "T" : "F")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-semibold text-slate-800 text-[15px]">
                          {record.farmerName}
                        </h3>
                        {record.farmerCode?.startsWith("T") && (
                          <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">Trader</span>
                        )}
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                          {record.farmerCode || record.slipId.slice(0,8)}
                        </span>
                      </div>
                      {record.fatherName && (
                        <p className="text-[12px] text-slate-500 leading-tight">
                          S/o {record.fatherName}
                        </p>
                      )}
                      <p className="text-slate-400 uppercase tracking-wide text-[10px] mt-0.5">
                        {record.village || "—"} • {record.crop} {record.variety ? `(${record.variety})` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Stats Box */}
                  <div className="bg-[#F4F7FB] rounded-[10px] py-2 px-3 flex items-center justify-between mt-0.5">
                    <div className="text-center flex-1 border-r border-slate-200 last:border-0">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5 uppercase tracking-wider">Bags</p>
                      <p className="font-bold text-slate-800 text-[13px]">{record.bags}</p>
                    </div>
                    <div className="text-center flex-1 border-r border-slate-200 last:border-0">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5 uppercase tracking-wider">Net Qty</p>
                      <p className="font-bold text-slate-800 text-[13px]">{record.netQuantity} Qtl</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5 uppercase tracking-wider">Rate</p>
                      <p className="font-bold text-slate-800 text-[13px]">₹{record.rate}</p>
                    </div>
                  </div>

                  {/* Bottom: Status, Date, Amount, Agent */}
                  <div className="flex items-end justify-between mt-0.5">
                    <div>
                      <p className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                        record.status === 'APPROVED' ? 'text-forest-600' :
                        record.status === 'REJECTED_L2' || record.status === 'REJECTED_L3' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        Status: {record.status}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(record.createdAt)} • {formatTime(record.createdAt).toLowerCase()}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-base font-bold text-forest-700 leading-none mb-1.5">
                        {formatCurrency(record.total)}
                      </p>
                      <div className="inline-block bg-blue-50/80 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                        Agent: {record.agentName || "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {hasMore && initialRecords.length >= 15 && filteredRecords.length >= 15 && (
              <div ref={loadMoreRef} className="pt-2 pb-6 flex justify-center opacity-60">
                {isFetchingMore && (
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                )}
              </div>
            )}
          </div>
        )
      ) : (
        /* Monthly Summary Tab */
        summary.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No data yet
            </h3>
            <p className="text-sm text-slate-500">
              Monthly summaries will appear after procurements
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.map((month) => (
              <div
                key={month.monthKey}
                className="glass-card rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                      <Calendar size={22} className="text-indigo-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {month.label}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {month.totalTransactions} transaction{month.totalTransactions !== 1 ? "s" : ""}
                        {isAdmin && month.agents.length > 0 && (
                          <span className="ml-2 text-indigo-500">
                            • {month.agents.length} agent{month.agents.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-medium">Quantity</p>
                      <p className="text-lg font-bold text-slate-700">
                        {month.totalQuantity}{" "}
                        <span className="text-xs font-medium text-slate-400">Qtl</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-medium">Payout</p>
                      <p className="text-lg font-bold text-forest-700">
                        {formatCurrency(month.totalPayout)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMonth(month.monthKey);
                        setActiveTab("records");
                        setShowFilters(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium 
                        text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <TrendingUp size={14} />
                      View Details
                    </button>
                  </div>
                </div>

                {/* Agent breakdown for admin */}
                {isAdmin && month.agents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {month.agents.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg 
                            bg-slate-50 text-xs text-slate-600 font-medium"
                        >
                          <User size={10} />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
