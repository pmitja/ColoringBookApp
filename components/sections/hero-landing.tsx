import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default function HeroLanding() {
  return (
    <section className="relative overflow-hidden pb-10 pt-14 sm:pb-20 sm:pt-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-floaty absolute left-[-90px] top-[20px] size-[240px] rounded-full bg-[#ffd4a7]/70 blur-3xl" />
        <div className="animate-floaty-slow absolute right-[-110px] top-[100px] size-[300px] rounded-full bg-[#d4f3ff]/80 blur-3xl" />
        <div className="absolute left-[10%] top-[80%] size-5 rounded-full bg-[#ff9f7c]/70" />
        <div className="absolute right-[22%] top-[13%] size-4 rounded-full bg-[#6ac4f0]/70" />
      </div>

      <div className="container max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-7 text-center lg:text-left">
            <div
              className={cn(
                "playful-pill inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]",
              )}
            >
              Storybook Mode On
            </div>

            <h1 className="font-heading text-balance text-4xl leading-tight sm:text-5xl md:text-6xl">
              Turn your favorite moments into{" "}
              <span className="text-gradient_indigo-purple font-extrabold">
                playful coloring adventures
              </span>
              .
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-xl">
              Upload a photo, choose a style, and get clean printable pages in
              minutes. Built for curious kids, classrooms, and rainy-day fun.
            </p>

            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/dashboard"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg", rounded: "full" }),
                  "shadow-primary/30 gap-2 px-6 shadow-md",
                )}
              >
                Start a Coloring Story
                <Icons.arrowRight className="size-4" />
              </Link>
              <Link
                href="#examples"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "lg",
                    rounded: "full",
                  }),
                  "border-border/90 bg-white/70 px-5 dark:bg-white/10",
                )}
              >
                Explore Examples
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.media className="size-4 text-primary" />3 free pages to
                start
              </div>
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.check className="size-4 text-[#42b883]" />
                Originals are not stored
              </div>
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.package className="size-4 text-[#5aa9e6]" />
                Print-ready PDF export
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="playful-card relative -rotate-2 overflow-hidden p-3 sm:p-4">
              <Image
                src="/illustrations/hero-coloring.svg"
                alt="Preview of coloring book conversion"
                width={1200}
                height={900}
                className="h-auto w-full rounded-[20px] object-cover"
                priority
              />
            </div>
            <div className="playful-pill animate-floaty absolute -left-4 top-6 hidden bg-white/90 text-xs font-bold dark:bg-white/15 sm:block">
              No design skills needed
            </div>
            <div className="playful-pill animate-floaty-slow absolute -bottom-3 right-2 hidden bg-white/90 text-xs font-bold dark:bg-white/15 sm:block">
              Create in under 2 minutes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
