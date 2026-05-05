"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function FinalCtaV2() {
  return (
    <section className="magical-section border-t border-white/60 py-20 lg:py-28">
      <LandingDecor variant="cta" />
      <Image
        src="/_static/cta-coloring-bg.webp"
        alt=""
        fill
        priority={false}
        className="object-cover object-center opacity-30"
        sizes="100vw"
      />
      <div className="via-[#fdfbff]/92 dark:via-background/92 dark:to-background/55 absolute inset-0 bg-gradient-to-r from-[#fdfbff] to-[#fdfbff]/35 dark:from-background" />

      <MaxWidthWrapper className="relative z-10">
        <div className="bg-white/58 relative overflow-hidden rounded-[2.5rem] border border-white/75 p-6 shadow-[0_32px_90px_-42px_rgb(80_50_140_/_0.52)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="absolute right-8 top-8 hidden size-20 rounded-full bg-[#fff0a6]/80 blur-xl lg:block" />
          <div className="bg-primary/15 absolute bottom-8 right-[22%] hidden size-28 rounded-full blur-2xl lg:block" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 max-w-2xl"
          >
            <div className="border-primary/15 mb-4 inline-flex items-center gap-2 rounded-full border bg-white/85 px-4 py-1.5 text-sm font-bold text-primary shadow-sm">
              <Icons.sparkles className="size-4" />
              Your magical book starts here
            </div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-6xl">
              Start your first coloring book free
            </h2>
            <p className="mt-4 max-w-xl text-lg font-medium text-muted-foreground">
              Upload a photo, write a prompt, or build a whole storybook. Watch
              your idea become printable coloring pages in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="glow-button hover:bg-primary/95 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
              >
                Open dashboard <Icons.arrowRight className="size-4" />
              </Link>
              <Link
                href="/pricing"
                className="border-primary/15 rounded-full border bg-white/80 px-6 py-3 text-base font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
              >
                View pricing
              </Link>
            </div>
          </motion.div>

          <div
            className="pointer-events-none absolute bottom-8 right-8 hidden h-[72%] w-[42%] lg:block"
            aria-hidden="true"
          >
            <div className="absolute right-16 top-0 aspect-[3/4] w-40 -rotate-6 rounded-3xl border-8 border-white bg-white shadow-2xl">
              <Image
                src="/illustrations/preview-coloring.svg"
                alt=""
                fill
                className="object-contain p-3"
              />
            </div>
            <div className="absolute bottom-0 right-0 aspect-[3/4] w-52 rotate-6 rounded-[1.7rem] border-[9px] border-white bg-white shadow-2xl">
              <Image
                src="/illustrations/color-sample.svg"
                alt=""
                fill
                className="object-contain p-4"
              />
            </div>
            <div className="absolute bottom-10 left-4 rotate-[-18deg] rounded-full border border-white/80 bg-[#8b5cf6] px-10 py-3 shadow-xl" />
            <div className="absolute bottom-2 left-20 rotate-12 rounded-full border border-white/80 bg-[#f97316] px-8 py-2 shadow-xl" />
            <Icons.cloud className="absolute right-4 top-16 size-16 text-white/80 drop-shadow-sm" />
            <Icons.star className="absolute left-16 top-24 size-7 fill-[#f5b82e]/30 text-[#f5b82e]/50" />
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
