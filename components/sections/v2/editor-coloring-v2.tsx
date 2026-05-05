"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function EditorAndColoringV2() {
  return (
    <section className="magical-section py-20 lg:py-28">
      <LandingDecor variant="lavender" />

      <MaxWidthWrapper className="relative z-10">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div className="border-primary/15 inline-flex w-fit items-center gap-2 rounded-full border bg-white/80 px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
              <Icons.laptop className="size-4 text-primary" /> Powerful Book
              Editor
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Combine Results into <br />{" "}
              <span className="text-primary">Print-Ready Books</span>
            </h2>
            <p className="text-lg font-medium text-muted-foreground">
              Organize generated pages, add covers and titles, then export a
              polished print-ready PDF for home, class, or gift time.
            </p>
            <ul className="mt-2 space-y-4">
              {[
                "Drag and drop visual builder",
                "Combine photos and text-generated pages",
                "Download high-quality print-ready PDFs",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-base font-medium text-foreground"
                >
                  <div className="border-primary/15 flex size-8 items-center justify-center rounded-full border bg-white text-primary shadow-sm">
                    <Icons.check className="size-4" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="magical-card relative w-full overflow-visible p-3 lg:-mr-8 xl:-mr-16"
          >
            <div className="absolute -left-5 top-10 z-10 hidden rounded-full border border-white/80 bg-white px-4 py-2 text-xs font-bold text-primary shadow-lg lg:block">
              Arrange pages
            </div>
            <div className="absolute -right-5 bottom-12 z-10 hidden rounded-full border border-white/80 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg lg:block">
              Export PDF
            </div>
            <div className="from-primary/20 to-accent/50 absolute -right-2 top-8 z-10 hidden aspect-[3/4] w-24 rotate-6 rounded-2xl border-[6px] border-white bg-gradient-to-br shadow-xl xl:block">
              <div className="bg-primary/30 absolute inset-x-3 top-5 h-3 rounded-full" />
              <div className="absolute inset-x-5 bottom-5 h-16 rounded-xl bg-white/75" />
            </div>

            <div className="relative aspect-[3/2] overflow-hidden rounded-3xl bg-[#fbfaf8] shadow-inner">
              <Image
                src="/_static/print-ready-books.webp"
                alt="Print-ready book editor showing selected coloring pages, page arrangement, and PDF export"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 720px"
              />
            </div>
          </motion.div>
        </div>

        <div className="mt-24 grid gap-12 rounded-[2.25rem] bg-gradient-to-br from-[#fff8db]/80 via-white/45 to-[#f1ebff]/80 p-0 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="magical-card relative order-2 w-full overflow-visible p-3 lg:order-1 lg:-ml-8 xl:-ml-14"
          >
            <div className="absolute -left-5 top-8 z-10 hidden rounded-full border border-white/80 bg-white px-4 py-2 text-xs font-bold text-primary shadow-lg lg:block">
              Color online
            </div>
            <div className="absolute -right-5 bottom-8 z-10 hidden rounded-full border border-white/80 bg-white px-4 py-2 text-xs font-bold text-primary shadow-lg lg:block">
              Save your art
            </div>
            <div className="absolute -bottom-5 left-12 z-10 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white px-3 py-2 shadow-xl sm:flex">
              {["#8b5cf6", "#f97316", "#22c55e", "#facc15"].map((color) => (
                <span
                  key={color}
                  className="size-5 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="relative aspect-[3/2] overflow-hidden rounded-3xl bg-[#fbf9ff] shadow-inner">
              <Image
                src="/_static/color-online.webp"
                alt="Digital coloring workspace with palette controls and a kitten coloring page"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 640px"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-col gap-6 lg:order-2"
          >
            <div className="border-primary/15 inline-flex w-fit items-center gap-2 rounded-full border bg-white/80 px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
              <Icons.palette className="size-4 text-primary" /> Digital Palette
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Color Online Instantly
            </h2>
            <p className="text-lg font-medium text-muted-foreground">
              No printer? No problem. Use our interactive digital coloring tool
              to bring your generated pages to life right in your browser.
            </p>
            <ul className="mt-2 space-y-4">
              {[
                "Smart fill stays perfectly inside the lines",
                "Works seamlessly on desktop, tablet, and mobile",
                "Save your masterpieces and share with friends",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-base font-medium text-foreground"
                >
                  <div className="border-primary/15 flex size-8 items-center justify-center rounded-full border bg-white text-primary shadow-sm">
                    <Icons.check className="size-4" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
