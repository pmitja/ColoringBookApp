interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground">
          Studio
        </div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
          {heading}
        </h1>
        {text ? (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            {text}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
