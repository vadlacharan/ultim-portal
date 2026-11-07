import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, index) => (
        <div key={index} className="surface-glass space-y-4 rounded-2xl p-6">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((__, field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
