import Image from "next/image";
import Link from "next/link";
import { Clock, Library, Plus } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeleteBookButton } from "@/components/dashboard/delete-book-button";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Books – Color Genie",
  description: "Create and manage books in the v2 editor.",
});

type ParsedBookData = {
  pages?: Array<{
    elements?: Array<{
      type?: string;
      data?: {
        assetId?: string;
      };
    }>;
  }>;
};

function extractFirstAssetId(data: unknown) {
  if (!data) return undefined;

  let parsedData: unknown = data;
  if (typeof parsedData === "string") {
    try {
      parsedData = JSON.parse(parsedData) as unknown;
    } catch {
      return undefined;
    }
  }

  if (typeof parsedData !== "object" || parsedData === null) {
    return undefined;
  }

  const pages = (parsedData as ParsedBookData).pages;
  if (!Array.isArray(pages)) {
    return undefined;
  }

  for (const page of pages) {
    const elements = page?.elements;
    if (!Array.isArray(elements)) continue;

    const imageElement = elements.find(
      (element) =>
        element?.type === "image" &&
        typeof element?.data?.assetId === "string" &&
        element.data.assetId.length > 0,
    );

    if (imageElement?.data?.assetId) {
      return imageElement.data.assetId;
    }
  }

  return undefined;
}

async function getUserBooks(userId: string) {
  const rawBooks = await prisma.book.findMany({
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

  const bookIdToAssetId: Record<string, string | undefined> = {};
  const assetIds: string[] = [];

  for (const book of rawBooks) {
    const assetId = extractFirstAssetId(book.data);
    if (!assetId) continue;

    bookIdToAssetId[book.id] = assetId;
    assetIds.push(assetId);
  }

  let assetIdToUrl: Record<string, string> = {};
  if (assetIds.length > 0) {
    const jobs = await prisma.imageJob.findMany({
      where: {
        id: { in: Array.from(new Set(assetIds)) },
        userId,
      },
      select: {
        id: true,
        lineartUrl: true,
      },
    });

    assetIdToUrl = Object.fromEntries(
      jobs
        .filter((job): job is { id: string; lineartUrl: string } =>
          Boolean(job.lineartUrl),
        )
        .map((job) => [job.id, job.lineartUrl]),
    );
  }

  return rawBooks.map((book) => ({
    id: book.id,
    title: book.title,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    thumbUrl: bookIdToAssetId[book.id]
      ? assetIdToUrl[bookIdToAssetId[book.id] as string]
      : undefined,
  }));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BookChooserPage() {
  const user = await getCurrentUser();
  const books = user?.id ? await getUserBooks(user.id) : [];

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="Books"
          text="Sign in to view books in the v2 editor."
        />
        <div className="mx-auto max-w-2xl">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="warning" />
            <EmptyPlaceholder.Title>
              Authentication Required
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Please sign in to view your books.
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        heading="Books (v2)"
        text="Create and manage books in the v2 editor."
      >
        <Link href="/dashboard/book-editor/version-2/new">
          <Button className="gap-3 rounded-full px-8 py-7 text-xl font-semibold">
            <Plus className="size-6" />
            New Book
          </Button>
        </Link>
      </DashboardHeader>

      <div className="space-y-8 pb-10">
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="relative z-10 flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="flex items-center gap-5">
              <div className="rounded-2xl bg-accent/60 p-4 text-primary shadow-sm ring-1 ring-border">
                <Library className="size-8" />
              </div>
              <div>
                <p className="font-heading text-3xl font-bold text-foreground">
                  {books.length === 1
                    ? "1 book available"
                    : `${books.length} books available`}
                </p>
                <p className="mt-1 text-base font-medium text-muted-foreground">
                  Continue editing any draft or start a fresh book.
                </p>
              </div>
            </div>
            <Link href="/dashboard/book-editor/version-2/new">
              <Button variant="outline" className="h-14 gap-2 rounded-2xl px-6 text-lg font-semibold">
                <Icons.add className="size-5 text-primary" />
                Start New Draft
              </Button>
            </Link>
          </CardContent>
        </Card>

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-8 flex size-44 items-center justify-center">
              <Image
                src="/illustrations/landing-book.svg"
                alt=""
                width={176}
                height={176}
                className="animate-floaty-slow opacity-90"
              />
            </div>
            <h3 className="mb-3 font-heading text-3xl font-bold text-muted-foreground">
              No books yet
            </h3>
            <p className="mb-10 max-w-sm text-lg font-medium leading-relaxed text-muted-foreground">
              Create your first coloring book from your generated pages.
            </p>
            <Link href="/dashboard/book-editor/version-2/new">
              <Button className="gap-3 rounded-full px-10 py-8 text-xl font-semibold">
                <Plus className="size-6" />
                Create First Book
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => {
              const title = book.title?.trim() || "Untitled book";

              return (
                <Card
                  key={book.id}
                  className="group relative flex flex-col overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardHeader className="border-b border-border p-0">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {book.thumbUrl ? (
                        <Image
                          src={book.thumbUrl}
                          alt={title}
                          fill
                          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 48vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-4 bg-muted text-muted-foreground">
                          <Icons.media className="size-12" />
                          <p className="text-base font-semibold">No preview yet</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <p className="truncate font-heading text-2xl font-bold text-foreground">
                        {title}
                      </p>
                      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock className="size-4" />
                        Updated {formatDate(book.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                      <DeleteBookButton bookId={book.id} bookTitle={title} />
                      <Link
                        href={`/dashboard/book-editor/version-2/${book.id}`}
                        className="flex-1"
                      >
                        <Button size="sm" className="h-12 w-full gap-2 rounded-xl font-semibold">
                          Open
                          <Icons.arrowRight className="size-4" />
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
    </div>
  );
}
