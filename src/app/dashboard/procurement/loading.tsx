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
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Form Area */}
        <div className="flex-1 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="skeleton w-48 h-6 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-full h-[46px] rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-full h-[46px] rounded-xl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-full h-[46px] rounded-xl" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6">
            <div className="skeleton w-48 h-6 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton w-20 h-4" />
                  <div className="skeleton w-full h-[46px] rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0">
          <div className="skeleton w-full h-[600px] rounded-2xl sticky top-24" />
        </div>
      </div>
    </div>
  );
}
