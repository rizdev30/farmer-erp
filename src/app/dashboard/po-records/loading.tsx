import { TableSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-48 h-8" />
            <div className="skeleton w-32 h-4" />
          </div>
        </div>
        <div className="skeleton w-36 h-12 rounded-xl" />
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="skeleton h-[46px] w-full lg:flex-1 rounded-xl" />
        <div className="flex gap-2 w-full lg:w-auto">
          <div className="skeleton h-[46px] w-full sm:w-[160px] rounded-xl" />
          <div className="skeleton h-[46px] w-full sm:w-[160px] rounded-xl" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="skeleton w-48 h-5" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
