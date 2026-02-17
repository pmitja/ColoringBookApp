import Image from "next/image";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function PreviewLanding() {
  return (
    <div id="examples" className="pb-8 pt-2 sm:pb-16">
      <MaxWidthWrapper>
        <div className="playful-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="playful-pill bg-white/90 text-xs font-bold dark:bg-white/10">
              Before and After
            </span>
            <span className="playful-pill bg-white/90 text-xs font-bold dark:bg-white/10">
              Crayon-Ready Detail
            </span>
          </div>
          <div className="border-border/70 relative aspect-video overflow-hidden rounded-[22px] border bg-white/70 dark:bg-slate-950/30">
            <Image
              className="size-full object-cover object-center"
              src="/illustrations/preview-coloring.svg"
              alt="Coloring book preview"
              width={2000}
              height={1000}
              priority={true}
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
