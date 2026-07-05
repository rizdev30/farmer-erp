export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-32 h-6" />
            <div className="skeleton w-48 h-4" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="skeleton w-24 h-10 rounded-xl" />
          <div className="skeleton w-24 h-10 rounded-xl" />
        </div>
      </div>

      {/* Receipt Paper Skeleton */}
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
        {/* Header section of receipt */}
        <div className="flex justify-between items-start border-b-2 border-dashed border-slate-200 pb-6 mb-6">
          <div className="space-y-3">
            <div className="skeleton w-32 h-8" />
            <div className="skeleton w-48 h-4" />
          </div>
          <div className="space-y-3 text-right">
            <div className="skeleton w-40 h-5 ml-auto" />
            <div className="skeleton w-32 h-4 ml-auto" />
          </div>
        </div>
        
        {/* Details section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <div className="skeleton w-20 h-3" />
            <div className="skeleton w-40 h-5" />
            <div className="skeleton w-32 h-4" />
          </div>
          <div className="space-y-2 text-right">
            <div className="skeleton w-20 h-3 ml-auto" />
            <div className="skeleton w-32 h-5 ml-auto" />
            <div className="skeleton w-24 h-4 ml-auto" />
          </div>
        </div>

        {/* Table section */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between">
            <div className="skeleton w-24 h-4" />
            <div className="skeleton w-24 h-4" />
          </div>
          <div className="p-3 space-y-3">
            <div className="flex justify-between">
              <div className="skeleton w-32 h-4" />
              <div className="skeleton w-20 h-4" />
            </div>
            <div className="flex justify-between">
              <div className="skeleton w-32 h-4" />
              <div className="skeleton w-20 h-4" />
            </div>
          </div>
        </div>

        {/* Total section */}
        <div className="mt-auto border-t-2 border-dashed border-slate-200 pt-6 flex justify-between items-end">
          <div className="skeleton w-48 h-10" />
          <div className="space-y-2 text-right">
            <div className="skeleton w-24 h-4 ml-auto" />
            <div className="skeleton w-40 h-8 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
