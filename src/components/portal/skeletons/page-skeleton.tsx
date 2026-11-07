import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  cards = 4,
  rows = 6,
  showHeader = true,
}: {
  cards?: number;
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      )}

      {cards > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="surface-glass space-y-3 rounded-2xl p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      )}

      <div className="surface-glass space-y-3 rounded-2xl p-5">
        <Skeleton className="mb-2 h-9 w-full max-w-xs" />
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
