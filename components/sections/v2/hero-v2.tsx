"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";

export function HeroV2() {
  const [splitPct, setSplitPct] = useState(0);

  return (
    <section className="magical-section bg-background pb-20 pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-36">
      <Image
        src="/_static/hero-bg.webp"
        alt=""
        fill
        priority
        className="object-cover object-center opacity-35"
        sizes="100vw"
      />
      <LandingDecor variant="hero" className="mix-blend-normal" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgb(255_255_255_/_0.92),transparent_34%),linear-gradient(90deg,rgb(253_251_255_/_0.95),rgb(253_251_255_/_0.55)_55%,rgb(253_251_255_/_0.78))]" />

      <div className="container relative z-20 mx-auto max-w-7xl px-4">
        <div className="grid min-h-[680px] items-center gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="mx-auto max-w-3xl text-center lg:col-span-6 lg:mx-0 lg:text-left xl:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="border-primary/20 mb-5 inline-flex items-center gap-2 rounded-full border bg-white/85 px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur"
            >
              <Icons.sparkles className="size-4 text-primary" />
              AI-Powered Book Generator
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="text-balance font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              Bring Your Imagination <br className="hidden sm:block" />
              to <span className="text-primary">Coloring Life</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="mx-auto mt-5 max-w-2xl text-pretty text-lg font-medium text-muted-foreground sm:text-xl lg:mx-0"
            >
              Turn your favorite photos into line art, generate magical scenes
              from text, or instantly create a full storybook with a cover. All
              in your browser.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:justify-start"
            >
              <Link
                href="/dashboard"
                className="glow-button hover:bg-primary/95 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
              >
                Start Generating <Icons.arrowRight className="size-4" />
              </Link>
              <a
                href="#showcase-gallery"
                className="border-primary/15 inline-flex items-center rounded-full border bg-white/80 px-7 py-3.5 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white"
              >
                See examples
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[540px] lg:col-span-6 lg:max-w-[620px] xl:col-span-7"
          >
            <div className="absolute -left-2 top-8 z-30 hidden rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-bold text-primary shadow-lg backdrop-blur md:block">
              Photo to coloring page
            </div>
            <div className="border-primary/15 absolute -right-2 -top-4 z-30 rounded-full border bg-white/90 px-4 py-2 text-[11px] font-bold text-muted-foreground shadow-lg backdrop-blur">
              Made with ColorLineAI
            </div>

            <div
              className="group relative aspect-[1.05/1] w-full select-none rounded-[2rem]"
              aria-label="Before and after preview"
            >
              <div className="absolute inset-4 rotate-2 rounded-[2rem] bg-[#c7b7ff]/30 blur-2xl" />
              <div className="bg-primary/20 absolute -bottom-6 left-8 right-10 h-20 rounded-full blur-3xl" />

              <div className="absolute left-0 top-6 z-10 aspect-[4/5] w-[48%] -rotate-3 overflow-hidden rounded-[1.75rem] border-[10px] border-white bg-white shadow-2xl">
                <Image
                  src="/_static/girl-with-dog-after.webp"
                  alt="Black-and-white coloring page converted from a colorful girl and dog artwork"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 48vw, 300px"
                  priority
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur">
                  Photo to coloring page
                </span>
              </div>

              <div className="absolute right-0 top-0 z-20 aspect-[4/5] w-[62%] rotate-2 overflow-hidden rounded-[1.75rem] border-[10px] border-white bg-white shadow-2xl">
                <Image
                  src="/_static/girl-with-dog-before.webp"
                  alt="Full-color artwork of a girl with a dog before ColorLineAI conversion"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 62vw, 390px"
                  priority
                />
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur">
                  Coloring page
                </span>

                <div
                  className="absolute inset-0 z-10 bg-white"
                  style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
                >
                  <Image
                    src="/_static/girl-with-dog-after.webp"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 62vw, 390px"
                    priority
                  />
                </div>

                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-primary shadow-[0_0_0_1px_rgb(255_255_255_/_0.75)]"
                  style={{
                    left: `${splitPct}%`,
                    transform: "translateX(-50%)",
                  }}
                />

                <div
                  className="border-primary/25 pointer-events-none absolute top-1/2 z-30 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95 text-primary shadow-lg backdrop-blur transition-transform duration-200 group-hover:scale-105"
                  style={{ left: `${splitPct}%` }}
                  aria-hidden="true"
                >
                  <Icons.chevronLeft className="size-4" />
                  <Icons.chevronRight className="size-4" />
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={splitPct}
                  aria-label="Adjust before and after image comparison"
                  className="absolute inset-0 z-40 size-full cursor-ew-resize opacity-0 focus-visible:opacity-100"
                  onChange={(event) => setSplitPct(Number(event.target.value))}
                />
              </div>

              <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-bold text-foreground shadow-lg backdrop-blur">
                <Icons.wandSparkles className="size-4 text-primary" />
                Slide to reveal the magic
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
