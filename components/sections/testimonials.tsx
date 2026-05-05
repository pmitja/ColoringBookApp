import Image from "next/image";

import { testimonials } from "@/config/landing";
import { cn } from "@/lib/utils";
import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";

export default function Testimonials() {
  return (
    <section className="magical-section py-20 lg:py-28">
      <LandingDecor variant="peach" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="border-primary/15 mb-3 inline-flex items-center gap-2 rounded-full border bg-white/85 px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
            <Icons.star className="fill-primary/80 size-4 text-primary" />
            Happy Families
          </div>
          <h2 className="mx-auto max-w-2xl font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            What Guardians Say About Us
          </h2>
        </div>

        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:gap-8">
          {testimonials.slice(0, 3).map((item, index) => (
            <div
              key={item.name}
              className={cn(
                "flex w-[min(88vw,350px)] shrink-0 snap-center flex-col items-center md:w-auto",
                index === 1 && "md:translate-y-8",
              )}
            >
              <div className="bg-white/86 relative mb-6 w-full rounded-[1.75rem] border border-white/75 p-6 shadow-[0_22px_54px_-32px_rgb(80_50_140_/_0.45)] backdrop-blur sm:p-7">
                <div className="mb-3 flex items-center gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icons.star
                      key={i}
                      className="fill-primary/90 size-4 text-primary sm:size-[18px]"
                    />
                  ))}
                </div>
                <span className="border-primary/10 bg-primary/10 mb-3 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {item.job}
                </span>
                <div className="text-primary/10 absolute right-5 top-4 font-serif text-7xl leading-none">
                  &ldquo;
                </div>
                <p className="relative z-10 pt-2 text-sm font-medium leading-relaxed text-foreground sm:text-base">
                  {item.review}
                </p>
                <div className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b border-r border-white/75 bg-white" />
              </div>

              <div className="mt-1 flex items-center gap-3">
                <div className="ring-primary/15 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-muted shadow-lg ring-4 sm:size-14">
                  <Image
                    width={100}
                    height={100}
                    className="size-full object-cover"
                    src={item.image}
                    alt={item.name}
                  />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-semibold text-foreground sm:text-lg">
                    {item.name}
                  </h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
