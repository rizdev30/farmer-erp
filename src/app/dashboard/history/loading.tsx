import { ListSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
        <div className="skeleton w-32 h-6" />
      </div>

      {/* Summary Overview Card */}
      <div className="glass-card rounded-[1.25rem] p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton w-24 h-4" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
          <div>
            <div className="skeleton w-16 h-3 mb-2" />
            <div className="skeleton w-12 h-6" />
          </div>
          <div>
            <div className="skeleton w-16 h-3 mb-2" />
            <div className="skeleton w-20 h-6" />
          </div>
          <div className="col-span-2 md:col-span-1 pt-4 md:pt-0 border-t md:border-none border-slate-100">
            <div className="skeleton w-16 h-3 mb-2" />
            <div className="skeleton w-24 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter row */}
      <div className="flex gap-3">
        <div className="skeleton h-[50px] flex-1 rounded-xl" />
        <div className="skeleton h-[50px] w-12 rounded-xl shrink-0" />
      </div>

      {/* Tab Switch */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-100">
        <div className="skeleton h-[42px] flex-1 rounded-lg mr-1" />
        <div className="skeleton h-[42px] flex-1 rounded-lg" />
      </div>

      {/* Quick Status Filters */}
      <div className="grid grid-cols-4 gap-2 mb-3 mt-2">
        <div className="skeleton h-[38px] rounded-full" />
        <div className="skeleton h-[38px] rounded-full" />
        <div className="skeleton h-[38px] rounded-full" />
        <div className="skeleton h-[38px] rounded-full" />
      </div>

      {/* List */}
      <ListSkeleton rows={5} />
    </div>
  );
}
