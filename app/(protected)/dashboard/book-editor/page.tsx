import Image from "next/image";
import Link from "next/link";
import { 
  BookText, 
  Library, 
  Plus, 
  Clock, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  BookMarked
} from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-3xl md:text-4xl">My Books</h1>
          <p className="text-base font-medium text-muted-foreground">
            Manage your coloring books before exporting to printable PDFs.
          </p>
        </div>
        <Link href="/dashboard/book-editor/new">
          <Button className="gap-2 rounded-2xl py-6 px-6 text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="size-5" />
            New Book
          </Button>
        </Link>
      </div>

      <div className="space-y-6 pb-10">
        <Card className="playful-card overflow-hidden border-2 shadow-sm">
          <CardContent className="relative z-10 flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
                <Library className="size-8 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading text-foreground">
                  {books.length === 1
                    ? "1 Book Saved"
                    : `${books.length} Books Saved`}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Your personal library of custom creations.
                </p>
              </div>
            </div>
            
            <Link href="/dashboard/book-editor/new">
              <Button variant="outline" className="bg-background/80 border-2 border-border/50 gap-2 rounded-xl py-6 px-6 font-bold shadow-sm transition-all hover:scale-105 hover:bg-muted/50">
                <Sparkles className="size-4 text-primary" />
                Create Another
              </Button>
            </Link>
          </CardContent>
        </Card>

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-[2rem] bg-muted/40 shadow-sm border-2 border-border/50 rotate-3">
              <BookMarked className="text-muted-foreground/60 size-12 -rotate-3" />
            </div>
            <h3 className="font-heading text-2xl mb-2">No books yet</h3>
            <p className="text-base font-medium text-muted-foreground max-w-sm mb-8">
              Start building your first custom coloring book. Add pages, arrange them, and export to PDF!
            </p>
            <Link href="/dashboard/book-editor/new">
              <Button className="gap-2 rounded-2xl px-8 py-7 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="size-6" />
                Create First Book
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => {
              const title = book.title?.trim() || "Untitled book";

              return (
                <Card
                  key={book.id}
                  className="group relative flex flex-col overflow-hidden rounded-[2rem] border-2 border-border/50 bg-background/50 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <CardHeader className="border-border/50 relative z-10 border-b-2 p-0">
                    <div className="bg-muted/20 relative aspect-[4/3] w-full overflow-hidden">
                      {book.thumbUrl ? (
                        <Image
                          src={book.thumbUrl}
                          alt={title}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background to-muted/30">
                          <BookText className="size-10 text-muted-foreground/30" />
                          <p className="text-sm font-bold text-muted-foreground/50">Empty Cover</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      
                      <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Link href={`/dashboard/book-editor/${book.id}`}>
                          <Button size="icon" className="rounded-full shadow-lg bg-primary text-primary-foreground hover:scale-110">
                            <ArrowRight className="size-5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 flex flex-1 flex-col justify-between p-5">
                    <div className="space-y-1.5">
                      <Link href={`/dashboard/book-editor/${book.id}`} className="block group/link">
                        <p className="truncate text-xl font-bold text-foreground transition-colors group-hover/link:text-primary">
                          {title}
                        </p>
                      </Link>
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="size-3.5" />
                        {formatLastEdited(book.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t-2 border-border/50 border-dashed">
                      <Link href={`/dashboard/book-editor/${book.id}`} className="flex-1">
                        <Button variant="ghost" className="w-full gap-2 rounded-xl font-bold hover:bg-primary/5 hover:text-primary justify-start px-2">
                          <BookOpen className="size-4" />
                          Open Book
                        </Button>
                      </Link>
                      <div className="shrink-0 transition-transform hover:scale-110">
                         <DeleteBookButton bookId={book.id} bookTitle={title} />
                      </div>
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
