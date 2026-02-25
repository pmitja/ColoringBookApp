interface HeaderSectionProps {
  label?: string;
  title: string;
  subtitle?: string;
}

export function HeaderSection({ label, title, subtitle }: HeaderSectionProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {label ? (
        <div className="playful-pill mb-4 text-xs font-semibold uppercase tracking-[0.22em]">
          {label}
        </div>
      ) : null}
      <h2 className="text-balance font-heading text-3xl leading-tight md:text-4xl lg:text-[42px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-5 max-w-3xl text-balance text-lg leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
