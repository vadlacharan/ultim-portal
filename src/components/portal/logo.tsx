import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/ultim-logo.png"
        alt="ULTIM"
        width={112}
        height={43}
        priority
        className={compact ? "h-6 w-auto" : "h-8 w-auto"}
      />
      {!compact && (
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">
          Partner
        </span>
      )}
    </div>
  );
}
