"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export function HeroV2() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background Gradients */}
      <div className="bg-background/80 absolute inset-0 -z-10" />
      <div className="absolute inset-0 -z-10 flex justify-center opacity-30">
        <div className="size-[500px] animate-pulse rounded-full bg-cyan-300 mix-blend-multiply blur-[100px] dark:bg-cyan-900" />
        <div className="size-[500px] animate-pulse rounded-full bg-orange-300 mix-blend-multiply blur-[100px] delay-700 dark:bg-orange-900" />
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-primary/10 ring-primary/20 mb-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-primary ring-1"
          >
            <span className="flex size-2 animate-ping rounded-full bg-primary" />
            AI-Powered Book Generator
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-balance font-heading text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Bring Your Imagination <br className="hidden sm:block" />
            to <span className="decoration-primary/50 text-primary underline decoration-wavy underline-offset-8">Coloring Life</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-foreground/80 mt-6 max-w-2xl text-balance text-lg font-medium sm:text-xl"
          >
            Turn your favorite photos into line art, generate magical scenes from text, or instantly create a full storybook with a cover. All in your browser.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg", rounded: "full" }),
                "hover:bg-primary/90 group relative overflow-hidden bg-primary px-8 font-bold text-primary-foreground shadow-xl"
              )}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Generating <Icons.arrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 z-0 h-full w-0 bg-white/20 transition-all duration-300 ease-out group-hover:w-full" />
            </Link>
          </motion.div>
        </div>

        {/* Hero Interactive/Animated Visuals */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="bg-muted/50 relative aspect-video w-full overflow-hidden rounded-3xl border-4 border-white/50 shadow-2xl backdrop-blur-sm dark:border-white/10">
            <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-3">
              {/* Photo to Lineart Animation */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border p-6 md:border-b-0 md:border-r">
                <div className="bg-background/80 absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
                  Photo to Lineart
                </div>
                <motion.div 
                  className="relative size-48 overflow-hidden rounded-2xl shadow-lg md:size-56"
                  animate={{ rotateY: [0, 180, 180, 0, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Image 
                    src="/illustrations/color-sample.svg" 
                    alt="Original Photo" 
                    fill 
                    className="object-cover" 
                    style={{ backfaceVisibility: "hidden" }}
                  />
                  <div className="absolute inset-0 bg-white" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <Image 
                      src="/illustrations/lineart-sample.svg" 
                      alt="Lineart Result" 
                      fill 
                      className="object-cover" 
                    />
                  </div>
                </motion.div>
              </div>

              {/* Text to Page Animation */}
              <div className="bg-muted/20 relative flex flex-col items-center justify-center overflow-hidden border-b border-border p-6 md:border-b-0 md:border-r">
                <div className="bg-background/80 absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
                  Text to Page
                </div>
                <div className="flex w-full flex-col items-center gap-4">
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "steps(30)" }}
                    className="flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-inner"
                  >
                    <Icons.search className="size-3 shrink-0" />
                    &quot;A dragon in space...&quot;
                  </motion.div>
                  <motion.div 
                    className="relative flex size-40 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm"
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Icons.page className="text-primary/30 size-12" />
                    <motion.div 
                      className="bg-primary/10 absolute inset-0"
                      initial={{ top: "100%" }}
                      animate={{ top: "0%" }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Whole Book Animation */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden p-6">
                <div className="bg-background/80 absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
                  Whole Book Gen
                </div>
                <motion.div 
                  className="relative flex h-56 w-48 items-center justify-center"
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute -bottom-4 -left-4 h-44 w-32 -rotate-12 rounded-xl border bg-white shadow-xl" />
                  <div className="absolute -bottom-4 -right-4 h-44 w-32 rotate-12 rounded-xl border bg-white shadow-xl" />
                  <div className="relative flex h-48 w-36 flex-col items-center justify-center overflow-hidden rounded-xl border bg-white shadow-2xl">
                     <div className="h-16 w-full bg-gradient-to-br from-indigo-200 to-purple-200" />
                     <div className="flex flex-1 flex-col items-center justify-center p-2 text-center">
                        <div className="mb-1 h-2 w-16 rounded-full bg-muted" />
                        <div className="bg-muted/50 h-1.5 w-10 rounded-full" />
                     </div>
                     <div className="absolute right-2 top-2 rounded-sm bg-primary px-1.5 py-0.5 text-[8px] font-bold text-white">
                       COVER
                     </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
