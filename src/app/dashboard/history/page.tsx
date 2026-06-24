"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  getProcurementHistory,
  getMonthlySummary,
  getAgentsList,
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
} from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/lib/use-debounce";
import { useSWRCache } from "@/lib/swr-cache";

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
  role: string;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "L4_ADMIN";
  const isL2 = role === "L2_APPROVAL";
  const isL3 = role === "L3_PO_MAKER";

  // Filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "summary">("records");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query — 400ms wait after user stops typing
  const debouncedSearch = useDebounce(searchQuery, 400, 2);

  // Data via agents list (admin only)
  const [agents, setAgents] = useState<AgentOption[]>([]);

  // SWR cache key based on current filters
  const recordsCacheKey = `history-records-${selectedMonth}-${selectedAgent}-${selectedStatus}`;
  const summaryCacheKey = `history-summary-${selectedAgent}`;

  // SWR cached records — instant on repeat navigation
  const {
    data: records = [],
    isLoading: recordsLoading,
    isValidating: recordsValidating,
  } = useSWRCache<ProcurementRecord[]>(
    recordsCacheKey,
    async () => {
      const filters: { year?: number; month?: number; agentId?: string; status?: string } = {};
      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-").map(Number);
        filters.year = year;
        filters.month = month;
      }
      if (selectedAgent) filters.agentId = selectedAgent;
      if (selectedStatus) filters.status = selectedStatus;
      return await getProcurementHistory(filters);
    },
    { ttl: 45000 }
  );

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
    if (!debouncedSearch) return records;
    const lowerQuery = debouncedSearch.toLowerCase();
    return records.filter((r) => 
      r.slipId.toLowerCase().includes(lowerQuery) ||
      r.farmerName.toLowerCase().includes(lowerQuery) ||
      (r.farmerCode && r.farmerCode.toLowerCase().includes(lowerQuery))
    );
  }, [records, debouncedSearch]);

  // Totals for current view
  const viewTotals = useMemo(() => {
    return {
      transactions: filteredRecords.length,
      quantity: Math.round(filteredRecords.reduce((s, r) => s + r.netQuantity, 0) * 100) / 100,
      payout: Math.round(filteredRecords.reduce((s, r) => s + r.total, 0) * 100) / 100,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 md:w-10 md:h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
            <ClipboardList size={22} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Procurement Records
            </h1>
            <p className="text-slate-500 mt-0.5">
              {isAdmin
                ? "All agent procurement data with monthly records"
                : "Your procurement history"}
            </p>
          </div>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium 
            transition-all ${
              showFilters || selectedMonth || selectedAgent
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "bg-white/80 text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
        >
          <Filter size={16} />
          Filters
          {(selectedMonth || selectedAgent) && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
          <ChevronDown
            size={14}
            className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-card rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2">
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                  text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                    text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
                    focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                  text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
                  focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_L2">Pending Level 2</option>
                <option value="PENDING_L3">Pending Level 3</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED_L2">Rejected Level 2</option>
                <option value="REJECTED_L3">Rejected Level 3</option>
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
              className="text-xs text-indigo-600 hover:text-indigo-800 underline transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-slate-800">
                {viewTotals.transactions}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Quantity</p>
              <p className="text-2xl font-bold text-slate-800">
                {viewTotals.quantity} <span className="text-sm font-medium text-slate-500">Qtl</span>
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
              <IndianRupee size={18} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Payout</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(viewTotals.payout)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switch & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("records")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "summary"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart3 size={16} />
            Monthly Summary
          </button>
        </div>

        {activeTab === "records" && (
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by Slip ID, Name or Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>
        )}
      </div>

      {/* Quick Status Filters */}
      {activeTab === "records" && (
        <div className="grid grid-cols-4 gap-1.5 mb-2 mt-1">
          <button
            onClick={() => setSelectedStatus("")}
            className={`py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${
              !selectedStatus
                ? "bg-slate-800 text-white shadow-slate-800/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus("PENDING")}
            className={`py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${
              selectedStatus === "PENDING"
                ? "bg-amber-500 text-white shadow-amber-500/20"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedStatus("APPROVED")}
            className={`py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${
              selectedStatus === "APPROVED"
                ? "bg-green-600 text-white shadow-green-600/20"
                : "bg-white text-green-700 border border-green-200 hover:bg-green-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setSelectedStatus("REJECTED")}
            className={`py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${
              selectedStatus === "REJECTED"
                ? "bg-red-500 text-white shadow-red-500/20"
                : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
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
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <Link
                key={record.id}
                href={`/dashboard/history/${record.slipId}`}
                className="glass-card rounded-2xl p-5 hover:shadow-md hover:border-forest-200 transition-all group relative block pr-10"
              >
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-forest-500 transition-colors">
                  <ChevronRight size={20} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Farmer Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-forest-700">
                        {record.farmerName?.[0] || "F"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">
                          {record.farmerName}
                        </h3>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                          {record.farmerCode || "—"}
                        </span>
                      </div>
                      {record.fatherName && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          S/o {record.fatherName}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {record.village || "—"} • {record.crop}
                        {record.variety ? ` (${record.variety})` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Center: Quantity Details */}
                  <div className="flex items-center gap-4 md:gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Bags</p>
                      <p className="font-semibold text-slate-700">{record.bags}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Net Qty</p>
                      <p className="font-semibold text-slate-700">
                        {record.netQuantity} Qtl
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Rate</p>
                      <p className="font-semibold text-slate-700">
                        ₹{record.rate}
                      </p>
                    </div>
                  </div>

                  {/* Right: Total + Meta */}
                  <div className="text-right md:min-w-[140px]">
                    <p className="text-lg font-bold text-forest-700">
                      {formatCurrency(record.total)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {record.slipId}
                    </p>
                    <p className="text-[10px] mt-0.5 font-semibold text-slate-600">
                      Status: {record.status}
                    </p>
                    {record.l2ApproverName && (
                      <p className="text-[10px] text-indigo-600 mt-0.5 font-semibold">
                        L2: {record.l2ApproverName}
                      </p>
                    )}
                    {record.l3ApproverName && (
                      <p className="text-[10px] text-emerald-600 mt-0.5 font-semibold">
                        L3: {record.l3ApproverName}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(record.createdAt)} • {formatTime(record.createdAt)}
                    </p>
                    {isAdmin && record.agentName && (
                      <div className="mt-1 flex flex-col items-end gap-0.5">
                        <p className="text-[10px] text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-md font-medium">
                          Agent: {record.agentName}
                        </p>
                        {record.createdByAdmin && (
                          <p className="text-[9px] text-purple-600 font-medium">
                            * Saved by Admin
                          </p>
                        )}
                      </div>
                    )}
                    {!isAdmin && record.createdByAdmin && (
                       <p className="text-[9px] text-purple-600 mt-1 font-medium text-right">
                         * Saved by Admin
                       </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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
