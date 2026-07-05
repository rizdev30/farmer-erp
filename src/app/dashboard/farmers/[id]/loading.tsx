import { ListSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-32 h-6" />
      </div>

      {/* Profile Card Skeleton */}
      <div className="glass-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="skeleton w-24 h-24 rounded-[1.5rem] shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="skeleton w-48 h-8" />
            <div className="skeleton w-32 h-4" />
            <div className="skeleton w-40 h-4" />
          </div>
          <div className="skeleton w-24 h-10 rounded-xl" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton w-16 h-3" />
              <div className="skeleton w-24 h-5" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="skeleton w-24 h-4" />
            </div>
            <div className="skeleton w-32 h-8" />
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card rounded-[2rem] p-6">
        <div className="skeleton w-48 h-6 mb-6" />
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
