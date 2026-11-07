import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="surface-glass flex flex-wrap gap-2 rounded-2xl px-3 py-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="surface-glass space-y-3 rounded-2xl p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="surface-glass space-y-4 rounded-2xl p-5 xl:col-span-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="surface-glass space-y-4 rounded-2xl p-5 xl:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto h-44 w-44 rounded-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="surface-glass space-y-4 rounded-2xl p-5 xl:col-span-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="surface-glass space-y-4 rounded-2xl p-5 xl:col-span-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}
