import Image from "next/image";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function PreviewLanding() {
  return (
    <div className="pb-6 sm:pb-16">
      <MaxWidthWrapper>
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
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
