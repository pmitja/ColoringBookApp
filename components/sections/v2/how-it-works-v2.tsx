"use client";

import { motion } from "framer-motion";

import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const steps = [
  {
    step: 1,
    title: "Pick a mode",
    description:
      "Photo to line art, text to page, consistent avatars, or a full book in one go.",
    icon: Icons.sparkles,
    preview: "Photo -> line art",
  },
  {
    step: 2,
    title: "Describe or upload",
    description:
      "Drop in a family photo or type a short prompt—our AI does the heavy lifting.",
    icon: Icons.media,
    preview: "Prompt + image",
  },
  {
    step: 3,
    title: "Color, edit, or print",
    description:
      "Polish pages in the editor, color online, then download a print-ready PDF.",
    icon: Icons.palette,
    preview: "PDF + palette",
  },
];

export function HowItWorksV2() {
  return (
    <section className="magical-section py-20 lg:py-28">
      <LandingDecor variant="lavender" />

      <MaxWidthWrapper className="relative z-10">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="bg-accent/60 mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground">
            Simple flow
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How it works
          </h2>
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            Three steps from idea to a book you can hold—or color on screen.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-8">
          <div
            className="border-primary/25 pointer-events-none absolute inset-x-[17%] top-[76px] hidden h-0.5 border-t-2 border-dashed md:block"
            aria-hidden
          />

          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.1 }}
                className="hover-lift magical-card relative flex min-h-[310px] flex-col p-7 text-center md:text-left"
              >
                <div className="from-primary/10 to-accent/45 relative mb-6 h-24 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br via-white shadow-inner">
                  <div className="border-primary/15 absolute -left-6 top-5 h-16 w-28 rotate-[-8deg] rounded-2xl border bg-white/85 shadow-sm" />
                  <div className="border-primary/15 absolute right-5 top-4 flex size-12 items-center justify-center rounded-2xl border bg-white text-primary shadow-md">
                    <Icon className="size-6" />
                  </div>
                  <div className="absolute bottom-4 left-5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-sm">
                    {item.preview}
                  </div>
                </div>
                <div className="border-primary/15 relative z-10 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border bg-primary text-lg font-bold text-primary-foreground shadow-lg md:mx-0">
                  {item.step}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
