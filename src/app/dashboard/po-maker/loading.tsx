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

      {/* Grid of form elements or summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="skeleton h-[90px] rounded-2xl" />
        <div className="skeleton h-[90px] rounded-2xl" />
        <div className="skeleton h-[90px] rounded-2xl" />
        <div className="skeleton h-[90px] rounded-2xl" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        {/* Left side (Form/Table) */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex gap-2">
              <div className="skeleton h-[42px] flex-1 rounded-lg" />
              <div className="skeleton h-[42px] flex-1 rounded-lg" />
            </div>
            <TableSkeleton rows={4} />
          </div>
        </div>
        
        {/* Right side (Preview) */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="skeleton h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
