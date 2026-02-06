import React from "react";

interface SectionColumnsType {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionColumns({
  title,
  description,
  children,
}: SectionColumnsType) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="space-y-2 md:col-span-5">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description ? (
            <p className="text-balance text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="md:col-span-7">{children}</div>
      </div>
    </div>
  );
}
