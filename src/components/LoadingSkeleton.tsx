export function CardSkeleton() {
  return (
    <div className="rounded-2xl p-6 border border-slate-100">
      <div className="skeleton w-11 h-11 rounded-xl mb-4" />
      <div className="skeleton w-24 h-3 mb-2" />
      <div className="skeleton w-32 h-8 mb-1" />
      <div className="skeleton w-20 h-3 mt-2" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-100"
        >
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton w-40 h-4" />
            <div className="skeleton w-28 h-3" />
          </div>
          <div className="skeleton w-16 h-4 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function BentoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="skeleton w-48 h-5" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-50 last:border-0"
        >
          <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
          <div className="skeleton w-32 h-4 flex-1" />
          <div className="skeleton w-20 h-4" />
          <div className="skeleton w-16 h-4" />
        </div>
      ))}
    </div>
  );
}
