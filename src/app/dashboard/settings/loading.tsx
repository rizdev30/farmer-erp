export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-32 h-8" />
            <div className="skeleton w-48 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Nav */}
        <div className="md:col-span-1 space-y-2">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>

        {/* Right Content */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="skeleton w-20 h-20 rounded-2xl shrink-0" />
              <div className="space-y-2">
                <div className="skeleton w-48 h-6" />
                <div className="skeleton w-32 h-4" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-full h-[46px] rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-full h-[46px] rounded-xl" />
              </div>
              <div className="skeleton w-32 h-12 rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
