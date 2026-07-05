import { BentoSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="skeleton w-48 h-8 rounded-lg" />
      </div>
      
      {/* 3 Info Cards approximation */}
      <BentoSkeleton />

      {/* Table section approximation */}
      <div className="glass-card rounded-2xl overflow-hidden mt-6">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-40 h-5" />
            <div className="skeleton w-64 h-3" />
          </div>
        </div>
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}
