import Image from "next/image";

import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { LandingDecor } from "@/components/sections/v2/landing-decor";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const categories = ["All", "Animals", "Fantasy", "Holidays", "Family"] as const;

const tints = [
  "from-primary/15 to-transparent",
  "from-accent/40 to-transparent",
  "from-primary/10 to-transparent",
  "from-muted/80 to-transparent",
  "from-primary/20 to-transparent",
  "from-accent/30 to-transparent",
] as const;

const minimumCardsPerRow = 18;
const marqueeCopies = [0, 1, 2, 3] as const;

type GalleryItem = {
  id: string;
  inputFileName: string;
  lineartUrl: string;
};

async function isReachableImage(url: string) {
  if (url.startsWith("/")) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      next: { revalidate: 60 * 60 },
    });

    return response.ok;
  } catch {
    return false;
  }
}

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  return (
    <div className="ring-primary/10 relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-[1.35rem] border-8 border-white bg-white shadow-[0_18px_42px_-24px_rgb(46_16_101_/_0.42)] ring-1 sm:w-44">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 bg-gradient-to-t opacity-60",
          tints[index % tints.length],
        )}
      />
      <Image
        src={item.lineartUrl}
        alt={item.inputFileName}
        fill
        loading="eager"
        className="object-cover contrast-[1.05]"
        sizes="176px"
      />
    </div>
  );
}

function MarqueeRow({
  items,
  reverse,
}: {
  items: GalleryItem[];
  reverse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-[#fff9df] to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-[#fff9df] to-transparent sm:w-32" />
      <div
        className={cn(
          "-ml-24 flex w-max will-change-transform sm:-ml-32",
          reverse
            ? "animate-showcase-marquee-right"
            : "animate-showcase-marquee-left",
        )}
      >
        {marqueeCopies.map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 gap-4 pr-4"
            aria-hidden={copy > 0}
          >
            {items.map((item, i) => (
              <GalleryCard
                key={`${copy}-${item.id}-${i}`}
                item={item}
                index={i}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export async function ShowcaseGalleryV2() {
  const generations = await prisma.imageJob.findMany({
    where: {
      isPublic: true,
      status: "DONE",
      lineartUrl: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 36,
    select: {
      id: true,
      inputFileName: true,
      lineartUrl: true,
    },
  });

  const publicGenerations = generations.filter(
    (generation): generation is GalleryItem => Boolean(generation.lineartUrl),
  );

  const reachableGenerations = (
    await Promise.all(
      publicGenerations.map(async (generation) =>
        (await isReachableImage(generation.lineartUrl)) ? generation : null,
      ),
    )
  )
    .filter((generation): generation is GalleryItem => Boolean(generation))
    .slice(0, 24);

  if (reachableGenerations.length === 0) {
    return null;
  }

  const repeatCount = Math.max(
    1,
    Math.ceil(minimumCardsPerRow / reachableGenerations.length),
  );
  const galleryItems = reachableGenerations.flatMap((generation) =>
    Array.from({ length: repeatCount }, () => generation),
  );

  return (
    <section
      id="showcase-gallery"
      className="magical-section scroll-mt-24 py-20 lg:py-28"
    >
      <LandingDecor variant="yellow" />
      <MaxWidthWrapper className="relative z-10">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="playful-pill mb-4 inline-flex items-center gap-2">
            Fresh from the gallery
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            See what families are creating
          </h2>
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            A peek at the kinds of pages you can make—then make them your own.
          </p>
        </div>

        <div
          className="mb-10 flex flex-wrap items-center justify-center gap-2"
          role="list"
          aria-label="Example categories"
        >
          {categories.map((label) => (
            <span
              key={label}
              role="listitem"
              className="rounded-full border border-white/70 bg-white/85 px-4 py-1.5 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur"
            >
              {label}
            </span>
          ))}
        </div>
      </MaxWidthWrapper>

      <div className="relative z-10 flex flex-col gap-6">
        <MarqueeRow items={galleryItems} />
        <MarqueeRow items={[...galleryItems].reverse()} reverse />
      </div>
    </section>
  );
}
