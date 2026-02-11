import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { cn, constructMetadata } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "My Books – Coloring Book Creator",
  description: "Make a book, then download and print the PDF.",
});

async function getUserBooks(userId: string) {
  const raw = await prisma.book.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      data: true,
    },
  });

  // Collect first image asset id per book (if any)
  const assetIds: string[] = [];
  const bookIdToAssetId: Record<string, string | undefined> = {};

  for (const b of raw) {
    const assetId = extractFirstAssetId(b.data);
    if (assetId) {
      bookIdToAssetId[b.id] = assetId;
      assetIds.push(assetId);
    }
  }

  let assetIdToUrl: Record<string, string> = {};
  if (assetIds.length > 0) {
    const jobs = await prisma.imageJob.findMany({
      where: { id: { in: Array.from(new Set(assetIds)) }, userId },
      select: { id: true, lineartUrl: true },
    });
    assetIdToUrl = Object.fromEntries(
      jobs
        .filter((j: any) => j.lineartUrl)
        .map((j: any) => [j.id, j.lineartUrl as string]),
    );
  }

  return raw.map((b) => ({
    id: b.id,
    title: b.title,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    thumbUrl: bookIdToAssetId[b.id]
      ? assetIdToUrl[bookIdToAssetId[b.id] as string]
      : undefined,
  }));
}

function extractFirstAssetId(data: unknown) {
  if (!data) return undefined;

  let value: any = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  const pages = Array.isArray(value?.pages) ? value.pages : [];
  for (const page of pages) {
    const elements = Array.isArray(page?.elements) ? page.elements : [];
    const imageElement = elements.find((e: any) => e?.type === "image");
    if (imageElement?.data?.assetId) {
      return imageElement.data.assetId as string;
    }
  }

  return undefined;
}

function formatLastEdited(date: Date) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDiff <= 0) return "Updated today";
  if (dayDiff === 1) return "Updated yesterday";

  return `Updated ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

const startSteps = [
  {
    id: "1",
    title: "Make a book",
    detail: "Tap Make New Book.",
    icon: Icons.add,
    iconTone:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  },
  {
    id: "2",
    title: "Pick a card",
    detail: "Choose the book you want.",
    icon: Icons.bookOpen,
    iconTone:
      "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
  },
  {
    id: "3",
    title: "Download and print",
    detail: "Get the PDF and print it.",
    icon: Icons.check,
    iconTone:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
] as const;

export default async function BookChooserPage() {
  const user = await getCurrentUser();
  const books = user?.id ? await getUserBooks(user.id) : [];

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="My Books to Print"
          text="Please sign in to see your books."
        />
        <div className="mx-auto max-w-2xl">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="warning" />
            <EmptyPlaceholder.Title>Authentication Required</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Please sign in to view your books.
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-6">
      <DashboardHeader
        heading="My Books to Print"
        text="Make or open a book. Then download the PDF and print it."
      >
        <Link
          href="/dashboard/book-editor/new"
          className={cn(
            buttonVariants({ rounded: "2xl" }),
            "hidden gap-2 sm:inline-flex",
          )}
        >
          <Icons.add className="size-4" />
          Make New Book
        </Link>
      </DashboardHeader>

      <div className="sm:hidden">
        <Link
          href="/dashboard/book-editor/new"
          className={cn(
            buttonVariants({ rounded: "2xl" }),
            "flex w-full items-center gap-2",
          )}
        >
          <Icons.add className="size-4" />
          Make New Book
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-amber-50 p-4 dark:border-sky-400/20 dark:from-sky-500/10 dark:via-cyan-500/10 dark:to-amber-500/10 sm:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-44 bg-gradient-to-l from-white/30 to-transparent dark:from-white/5" />
        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-sky-300/60 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-300/30 dark:bg-slate-900/30 dark:text-sky-200">
            Easy steps
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            What can I do here?
          </h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Follow these three steps.
          </p>

          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {startSteps.map((step) => {
              const StepIcon = step.icon;

              return (
                <li
                  key={step.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/85 p-3 dark:border-white/10 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                      {step.id}
                    </span>
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full",
                        step.iconTone,
                      )}
                    >
                      <StepIcon className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {step.detail}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {!books || books.length === 0 ? (
        <EmptyPlaceholder>
          <EmptyPlaceholder.Icon name="bookOpen" />
          <EmptyPlaceholder.Title>No books yet</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            Press Make New Book to create your first printable book.
          </EmptyPlaceholder.Description>
          <Link href="/dashboard/book-editor/new">
            <Button variant="secondary" className="gap-2 rounded-xl">
              <Icons.add className="size-4" />
              Make my first book
            </Button>
          </Link>
        </EmptyPlaceholder>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const title = book.title?.trim() || "My new book";
            return (
              <Card
                key={book.id}
                className="group overflow-hidden border-slate-200/80 bg-white/90 transition hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-white/5">
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200">
                      Ready to print
                    </div>
                    {book.thumbUrl ? (
                      <Image
                        src={book.thumbUrl}
                        alt={title}
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-sm font-medium text-muted-foreground">
                        No picture yet
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-1">
                    <p className="truncate text-base font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLastEdited(book.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <Link href={`/dashboard/book-editor/${book.id}`}>
                      <Button size="sm" className="gap-2 rounded-xl">
                        Open Book
                        <Icons.bookOpen className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
