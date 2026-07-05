import { ListSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="skeleton w-48 h-6" />
            <div className="skeleton w-32 h-4" />
          </div>
        </div>
        <div className="skeleton w-40 h-12 rounded-xl" />
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-100">
        <div className="skeleton h-10 flex-1 rounded-lg mr-1" />
        <div className="skeleton h-10 flex-1 rounded-lg mr-1" />
        <div className="skeleton h-10 flex-1 rounded-lg" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="skeleton h-11 w-full lg:flex-1 rounded-xl" />
        <div className="flex flex-wrap items-end gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="skeleton h-[46px] w-[calc(50%-0.25rem)] sm:w-[160px] rounded-xl" />
          <div className="skeleton h-[46px] w-[calc(50%-0.25rem)] sm:w-[160px] rounded-xl" />
          <div className="skeleton h-[46px] w-[calc(50%-0.25rem)] sm:w-[160px] rounded-xl" />
          <div className="skeleton h-[46px] w-[calc(50%-0.25rem)] sm:w-[80px] rounded-xl" />
        </div>
      </div>

      <div className="hidden md:block">
        <TableSkeleton rows={5} />
      </div>
      <div className="md:hidden">
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}
