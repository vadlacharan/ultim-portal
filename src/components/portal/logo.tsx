export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2" aria-label="ULTIM">
      <span className="flex h-5 items-center gap-[3px]" aria-hidden>
        <span className="block h-[18px] w-1 -skew-x-[16deg] bg-primary" />
        <span className="block h-[18px] w-1 -skew-x-[16deg] bg-primary" />
        <span className="block h-3 w-1 -skew-x-[16deg] bg-primary/70" />
      </span>
      {!compact && (
        <>
          <span className="font-display text-[22px] font-bold leading-none tracking-[0.14em] text-foreground">
            ULTIM
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">
            Partner
          </span>
        </>
      )}
    </span>
  );
}
