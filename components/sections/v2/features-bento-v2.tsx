"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { LandingDecor } from "@/components/sections/v2/landing-decor";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const tabs = [
  {
    id: "lineart",
    title: "Image to Lineart",
    description:
      "Upload a photo and instantly generate clean line art. Perfect for family moments.",
    icon: Icons.media,
    image: "/_static/features/image-to-lineart.webp",
    imageAlt: "Image to Lineart workflow preview",
    workflow: "Photo -> clean line art",
  },
  {
    id: "text",
    title: "Text to Page",
    description:
      "Describe any scene, character, or pattern, and watch it become a coloring page.",
    icon: Icons.post,
    image: "/_static/features/text-to-color-page.webp",
    imageAlt: "Text to coloring page generator preview",
    workflow: "Prompt -> printable page",
  },
  {
    id: "avatars",
    title: "Consistent Avatars",
    description:
      "Use your face as a reference to generate multiple pages starring YOU.",
    icon: Icons.user,
    image: "/_static/features/ai-avatar.webp",
    imageAlt: "Consistent avatars generator preview",
    workflow: "Reference face -> matching pages",
  },
  {
    id: "book",
    title: "Whole Book Generation",
    description: "One prompt creates a full 10-page book with a custom cover.",
    icon: Icons.bookOpen,
    image: "/_static/features/ai-book-generator.webp",
    imageAlt: "Whole coloring book generator preview",
    workflow: "Idea -> cover + pages",
  },
] as const;

function FeaturePreview({
  image,
  imageAlt,
  title,
  workflow,
}: {
  image: string;
  imageAlt: string;
  title: string;
  workflow: string;
}) {
  return (
    <div className="from-primary/10 to-accent/35 flex h-full min-h-[360px] items-center justify-center bg-gradient-to-br via-white p-4 sm:min-h-[440px] sm:p-7 lg:min-h-[520px]">
      <motion.div
        className="ring-primary/10 relative aspect-[3/2] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border-[10px] border-white bg-card shadow-2xl ring-1"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-bold text-primary shadow-md backdrop-blur">
          {workflow}
        </div>
        <div className="absolute bottom-4 right-4 z-10 hidden rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-left shadow-lg backdrop-blur sm:block">
          <p className="font-heading text-sm font-bold text-foreground">
            {title}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            One creative flow, ready to print.
          </p>
        </div>
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 760px, (min-width: 640px) 90vw, 100vw"
          className="object-cover"
          priority={false}
        />
      </motion.div>
    </div>
  );
}

export function FeaturesBentoV2() {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((currentIndex) => (currentIndex + 1) % tabs.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="magical-section py-20 lg:py-28">
      <LandingDecor variant="peach" />

      <MaxWidthWrapper className="relative z-10">
        <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
          <div className="bg-accent/60 mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground">
            Endless Ways to Create
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Combine our AI tools to craft the perfect coloring adventure.
          </motion.h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 lg:col-span-4 lg:flex-col lg:overflow-visible lg:pb-0">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "flex min-w-[220px] shrink-0 flex-col gap-2 rounded-[1.35rem] border p-4 text-left transition-all duration-300 lg:min-w-0",
                    isActive
                      ? "border-primary/25 ring-primary/10 bg-white text-foreground shadow-[0_18px_44px_-26px_rgb(109_74_223_/_0.65)] ring-4"
                      : "border-white/70 bg-white/60 text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:bg-white",
                  )}
                >
                  <span className="flex items-center gap-2 font-heading text-sm font-bold sm:text-base">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full border",
                        isActive
                          ? "border-primary/20 bg-primary text-primary-foreground"
                          : "border-border bg-white text-primary",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {tab.title}
                  </span>
                  <span className="hidden text-xs font-medium leading-snug text-muted-foreground sm:line-clamp-2 lg:block">
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8">
            <div className="magical-card overflow-hidden">
              <div className="border-b border-white/70 bg-white/70 px-5 py-4 backdrop-blur sm:px-6">
                <p className="text-sm font-semibold text-foreground lg:hidden">
                  {current.title}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground lg:mt-0">
                  {current.description}
                </p>
              </div>

              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="h-full"
                  >
                    <FeaturePreview
                      image={current.image}
                      imageAlt={current.imageAlt}
                      title={current.title}
                      workflow={current.workflow}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 bg-white/65 px-5 py-4 backdrop-blur sm:px-6">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Ready when you are—no installs, just your browser.
                </p>
                <Link
                  href="/register"
                  className="glow-button inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
                >
                  Try it out
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
