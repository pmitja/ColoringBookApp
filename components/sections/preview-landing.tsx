import Image from "next/image";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function PreviewLanding() {
  return (
    <section id="examples" className="pb-10 pt-2 sm:pb-16">
      <MaxWidthWrapper>
        <div className="playful-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="playful-pill bg-white/90 text-xs font-bold dark:bg-white/10">
              Before and After
            </span>
            <span className="playful-pill bg-white/90 text-xs font-bold dark:bg-white/10">
              Print-Ready Line Quality
            </span>
          </div>

          <div className="border-border/70 bg-card/80 relative overflow-hidden rounded-[24px] border">
            <div className="dark:from-cyan-300/8 absolute inset-0 bg-gradient-to-br from-sky-100/40 via-transparent to-amber-100/40 dark:to-orange-300/10" />
            <Image
              className="relative z-10 size-full object-cover object-center"
              src="/illustrations/preview-coloring.svg"
              alt="Coloring book preview"
              width={2000}
              height={1000}
              priority={true}
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
