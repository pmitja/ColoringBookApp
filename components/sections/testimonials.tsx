import Image from "next/image";

import { testimonials } from "@/config/landing";
import { HeaderSection } from "@/components/shared/header-section";
import { Icons } from "@/components/shared/icons";

export default function Testimonials() {
  return (
    <section className="pb-20 pt-16 sm:pt-24">
      <div className="container flex max-w-6xl flex-col gap-10 sm:gap-y-14">
        <HeaderSection
          label="Happy Families"
          title="Parents and teachers keep coming back"
          subtitle="Pages are easy to color, quick to print, and fun for all ages."
        />

        <div className="column-1 gap-5 space-y-5 md:columns-2 lg:columns-3">
          {testimonials.map((item) => (
            <div className="break-inside-avoid" key={item.name}>
              <article className="surface-glass relative rounded-3xl">
                <div className="flex flex-col px-4 py-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-base">
                      <Image
                        width={100}
                        height={100}
                        className="border-border/70 size-full rounded-full border"
                        src={item.image}
                        alt={item.name}
                      />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.job}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-1.5 text-accent">
                    <Icons.check className="size-4" />
                    <Icons.check className="size-4" />
                    <Icons.check className="size-4" />
                    <Icons.check className="size-4" />
                    <Icons.check className="size-4" />
                  </div>

                  <q className="leading-relaxed text-muted-foreground">
                    {item.review}
                  </q>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
