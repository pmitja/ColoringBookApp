import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default function HeroLanding() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute right-[-160px] top-[120px] h-[360px] w-[360px] rounded-full bg-amber-200/40 blur-3xl" />
      </div>

      <div className="container max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-center lg:text-left">
            <div
              className={cn(
                "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700",
                "dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
              )}
            >
              Safe • Private • Kid-Friendly
            </div>

            <h1 className="text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Turn family photos into{" "}
              <span className="text-gradient_indigo-purple font-extrabold">
                printable coloring books
              </span>
              .
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Upload a photo, choose a style, and get crisp line art in minutes.
              Perfect for ages 4-12, classrooms, and family nights.
            </p>

            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/dashboard"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg", rounded: "full" }),
                  "gap-2",
                )}
              >
                Start Creating (Free)
                <Icons.arrowRight className="size-4" />
              </Link>
              <Link
                href="#features"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "lg",
                    rounded: "full",
                  }),
                  "px-5",
                )}
              >
                See Examples
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground lg:justify-start">
              <span>3 free pages to start</span>
              <span>•</span>
              <span>Photos never stored</span>
              <span>•</span>
              <span>Print-ready PDFs</span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground lg:justify-start">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Icons.media className="h-4 w-4" />
                </span>
                Upload
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Icons.spinner className="h-4 w-4" />
                </span>
                Pick style
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  <Icons.package className="h-4 w-4" />
                </span>
                Download
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-6 top-6 h-full w-full rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl dark:border-white/10 dark:bg-white/5" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-2xl dark:border-white/10 dark:bg-white/5">
              <Image
                src="/illustrations/hero-coloring.svg"
                alt="Preview of coloring book conversion"
                width={1200}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
