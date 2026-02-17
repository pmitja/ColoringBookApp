import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface CommunityBentoGridProps {
  children: ReactNode;
  className?: string;
}

interface CommunityBentoCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  background?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CommunityBentoGrid({
  children,
  className,
}: CommunityBentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[15rem] grid-cols-1 gap-4 md:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommunityBentoCard({
  title,
  description,
  icon,
  ctaLabel,
  ctaHref,
  background,
  className,
  children,
}: CommunityBentoCardProps) {
  return (
    <article
      className={cn(
        "border-border/75 bg-card/95 group relative col-span-1 overflow-hidden rounded-[30px] border",
        "shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      {background ? <div className="absolute inset-0">{background}</div> : null}

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="space-y-3">
          {icon ? (
            <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
              {icon}
            </span>
          ) : null}
          <h3 className="font-heading text-2xl leading-tight">{title}</h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        {children ? (
          <div className="mt-4">{children}</div>
        ) : ctaLabel && ctaHref ? (
          <a
            href={ctaHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:translate-x-1"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
