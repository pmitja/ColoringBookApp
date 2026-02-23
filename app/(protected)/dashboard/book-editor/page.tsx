import Image from "next/image";
import Link from "next/link";

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
  title: "My Books – Colorline AI",
  description: "Open and manage books before exporting printable PDFs.",
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

export default async function BookChooserPage() {
  const user = await getCurrentUser();
  const books = user?.id ? await getUserBooks(user.id) : [];

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="My Books"
          text="Sign in to manage and print your books."
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
    <>
      <DashboardHeader
        heading="My Books"
        text="Open an existing book or start a new one for print-ready export."
      >
        <Link href="/dashboard/book-editor/new">
          <Button className="gap-2 rounded-full">
            <Icons.add className="size-4" />
            New Book
          </Button>
        </Link>
      </DashboardHeader>

      <div className="space-y-6 pb-10">
        <Card className="border-border/80 bg-card/95 rounded-3xl border">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {books.length === 1
                  ? "1 book saved"
                  : `${books.length} books saved`}
              </p>
              <p className="text-sm text-muted-foreground">
                Keep editing any book until you are ready to export.
              </p>
            </div>
            <Link href="/dashboard/book-editor/new">
              <Button variant="outline" className="gap-2 rounded-full">
                <Icons.add className="size-4" />
                Make Another
              </Button>
            </Link>
          </CardContent>
        </Card>

        {books.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="bookOpen" />
            <EmptyPlaceholder.Title>No books yet</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Create your first book, then export and print whenever you are
              ready.
            </EmptyPlaceholder.Description>
            <Link href="/dashboard/book-editor/new">
              <Button className="gap-2 rounded-full">
                <Icons.add className="size-4" />
                Create First Book
              </Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => {
              const title = book.title?.trim() || "Untitled book";

              return (
                <Card
                  key={book.id}
                  className="border-border/80 bg-card/95 group overflow-hidden rounded-3xl border"
                >
                  <CardHeader className="p-0">
                    <div className="border-border/60 bg-muted/40 relative aspect-[4/3] w-full overflow-hidden border-b">
                      {book.thumbUrl ? (
                        <Image
                          src={book.thumbUrl}
                          alt={title}
                          fill
                          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 48vw, 100vw"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Icons.media className="size-5" />
                          <p className="text-xs">No preview yet</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="truncate text-base font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatLastEdited(book.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <DeleteBookButton bookId={book.id} bookTitle={title} />
                      <Link href={`/dashboard/book-editor/${book.id}`}>
                        <Button size="sm" className="gap-2 rounded-full">
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
    </>
  );
}
