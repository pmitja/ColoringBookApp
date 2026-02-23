import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default function HeroLanding() {
  return (
    <section className="relative overflow-hidden py-12 sm:pb-20 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-floaty dark:bg-cyan-400/18 absolute left-[-90px] top-[10px] size-[260px] rounded-full bg-sky-300/30 blur-3xl" />
        <div className="animate-floaty-slow dark:bg-orange-400/16 absolute right-[-110px] top-[90px] size-[320px] rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute left-[10%] top-[82%] size-5 rounded-full bg-emerald-300/70" />
        <div className="absolute right-[18%] top-[15%] size-4 rounded-full bg-sky-400/70" />
      </div>

      <div className="container max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise space-y-7 text-center lg:text-left">
            <div
              className={cn(
                "playful-pill inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em]",
              )}
            >
              Family-Safe Creative Flow
            </div>

            <h1 className="text-balance font-heading text-4xl leading-tight text-foreground sm:text-5xl md:text-6xl">
              Create Your Perfect{" "}
              <span className="font-extrabold text-accent">
                Coloring Book
              </span>{" "}
              with AI.
            </h1>

            <p className="mx-auto max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
              Turn your photos into lineart, generate pages from text, or create a full book in seconds. We prioritize your privacy—your images are never saved.
            </p>

            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/dashboard"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg", rounded: "full" }),
                  "shadow-primary/20 hover:bg-accent/90 gap-2 bg-accent px-6 text-accent-foreground shadow-md",
                )}
              >
                Start Free
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
                  "border-border/90 bg-white/75 px-5 dark:bg-white/10",
                )}
              >
                See Examples
              </Link>
            </div>

            <div className="mt-1 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.media className="size-4 text-primary" />3 free pages to
                start
              </div>
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.check className="size-4 text-emerald-600" />
                Private processing
              </div>
              <div className="playful-pill flex items-center gap-2 text-sm">
                <Icons.package className="size-4 text-sky-600" />
                PDF and PNG export
              </div>
            </div>
          </div>

          <div className="animate-rise relative mx-auto w-full max-w-xl">
            <div className="playful-card relative overflow-hidden p-3 sm:p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-200/20 via-transparent to-amber-200/25 dark:from-cyan-300/10 dark:to-orange-300/10" />
              <Image
                src="/illustrations/hero-coloring.svg"
                alt="Preview of coloring book conversion"
                width={1200}
                height={900}
                className="relative z-10 h-auto w-full rounded-[22px] object-cover"
                priority
              />
            </div>
            <div className="playful-pill animate-floaty absolute -left-3 top-7 hidden bg-white/90 text-xs font-bold dark:bg-white/15 sm:block">
              No design tools required
            </div>
            <div className="playful-pill animate-floaty-slow absolute -bottom-3 right-3 hidden bg-white/90 text-xs font-bold dark:bg-white/15 sm:block">
              Create pages in under 2 minutes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
