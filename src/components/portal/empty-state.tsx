import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-glass flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
