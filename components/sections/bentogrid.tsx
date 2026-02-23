import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function BentoGrid() {
  return (
    <section className="py-16 sm:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <p className="playful-pill mx-auto w-fit text-xs font-semibold uppercase tracking-[0.22em]">
            Kid-First Experience
          </p>
          <h2 className="font-heading mt-3 text-balance text-3xl sm:text-4xl">
            From photo to coloring fun in three easy steps
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          <article className="playful-card relative col-span-full overflow-hidden p-5 sm:p-7 lg:col-span-4">
            <div
              className="absolute right-6 top-6 size-16 rounded-full bg-amber-200/70 blur-lg dark:bg-amber-300/20"
              aria-hidden="true"
            />
            <h3 className="font-heading text-2xl sm:text-3xl">
              See the transformation instantly
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Upload your photo and preview clean line art before printing. Keep
              pages simple for younger kids or add detail for older artists.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="surface-glass overflow-hidden rounded-2xl p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Line Art
                </p>
                <Image
                  src="/illustrations/lineart-sample.svg"
                  alt="Line art sample generated from a photo"
                  width={900}
                  height={700}
                  className="h-auto w-full rounded-xl"
                />
              </div>
              <div className="surface-glass overflow-hidden rounded-2xl p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Colored Result
                </p>
                <Image
                  src="/illustrations/color-sample.svg"
                  alt="Colored sample page"
                  width={900}
                  height={700}
                  className="h-auto w-full rounded-xl"
                />
              </div>
            </div>
          </article>

          <article className="playful-card col-span-full p-5 sm:p-7 lg:col-span-2">
            <h3 className="font-heading text-2xl">Three Simple Steps</h3>
            <ol className="mt-5 space-y-4 text-sm">
              <li className="surface-glass rounded-2xl p-3">
                <p className="font-semibold">1. Upload a memory</p>
                <p className="text-muted-foreground">
                  Portraits, pets, field trips, or favorite toys.
                </p>
              </li>
              <li className="surface-glass rounded-2xl p-3">
                <p className="font-semibold">2. Pick a style</p>
                <p className="text-muted-foreground">
                  Choose lighter or bolder outlines based on age.
                </p>
              </li>
              <li className="surface-glass rounded-2xl p-3">
                <p className="font-semibold">3. Print and color</p>
                <p className="text-muted-foreground">
                  Download single sheets or a whole book in PDF.
                </p>
              </li>
            </ol>
          </article>

          <article className="playful-card col-span-full overflow-hidden p-5 sm:p-7 lg:col-span-3">
            <h3 className="font-heading text-2xl">Build a whole mini book</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Mix character pages, family scenes, and title pages into one
              printable pack.
            </p>
            <Image
              src="/illustrations/landing-book.svg"
              alt="Preview of printable coloring book"
              width={1100}
              height={700}
              className="border-border/70 bg-card/75 mt-5 h-auto w-full rounded-2xl border p-2"
            />
          </article>

          <article className="playful-card col-span-full flex flex-col justify-between p-5 sm:p-7 lg:col-span-3">
            <div>
              <h3 className="font-heading text-2xl">
                Made for play, not complexity
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Friendly controls, large touch targets, and clear steps make
                this easy for kids and adults.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="playful-pill text-xs">
                Age-friendly controls
              </span>
              <span className="playful-pill text-xs">Classroom ready</span>
              <span className="playful-pill text-xs">Home printer safe</span>
            </div>
            <Link
              href="/dashboard"
              prefetch={true}
              className={cn(
                buttonVariants({ size: "lg", rounded: "full" }),
                "mt-6 w-full justify-center sm:w-fit",
              )}
            >
              Try It Free
            </Link>
          </article>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
