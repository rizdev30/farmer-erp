import { ListSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-48 h-8" />
            <div className="skeleton w-32 h-4" />
          </div>
        </div>
        <div className="skeleton w-36 h-12 rounded-xl" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2">
                  <div className="skeleton w-32 h-5" />
                  <div className="skeleton w-48 h-3" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="skeleton w-20 h-6 rounded-lg" />
                <div className="skeleton w-20 h-6 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
