import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-4 bg-slate-50">
      <div className="relative">
        <div className="absolute inset-0 bg-forest-200 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-forest-500 animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500 animate-pulse tracking-wide">
        Loading data...
      </p>
    </div>
  );
}
