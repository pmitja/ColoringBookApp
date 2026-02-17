interface HeaderSectionProps {
  label?: string;
  title: string;
  subtitle?: string;
}

export function HeaderSection({ label, title, subtitle }: HeaderSectionProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {label ? (
        <div className="text-gradient_indigo-purple mb-4 text-sm font-semibold uppercase tracking-[0.2em]">
          {label}
        </div>
      ) : null}
      <h2 className="font-heading text-3xl leading-tight md:text-4xl lg:text-[42px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-5 max-w-3xl text-balance text-lg text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
