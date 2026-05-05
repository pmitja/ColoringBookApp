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
  title: "My Books – Color Genie",
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
      <DashboardHeader
        heading="My Books"
        text="Manage your coloring books before exporting to printable PDFs."
      >
        <Link href="/dashboard/book-editor/new">
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
                    ? "1 Book Saved"
                    : `${books.length} Books Saved`}
                </p>
                <p className="mt-1 text-base font-medium text-muted-foreground">
                  Your personal library of custom creations.
                </p>
              </div>
            </div>
            
            <Link href="/dashboard/book-editor/new">
              <Button variant="outline" className="h-14 gap-2 rounded-2xl px-6 text-lg font-semibold">
                <Sparkles className="size-5 text-primary" />
                Create Another
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
            <h3 className="mb-3 font-heading text-3xl font-bold text-muted-foreground">No books yet</h3>
            <p className="mb-10 max-w-sm text-lg font-medium leading-relaxed text-muted-foreground">
              Start building your first custom coloring book. Add pages, arrange them, and export to PDF!
            </p>
            <Link href="/dashboard/book-editor/new">
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
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 dark:bg-slate-800">
                      {book.thumbUrl ? (
                        <Image
                          src={book.thumbUrl}
                          alt={title}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-800">
                          <BookText className="size-12 text-slate-200 dark:text-slate-600" />
                          <p className="text-base font-semibold text-muted-foreground">Empty Cover</p>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      
                      <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Link href={`/dashboard/book-editor/${book.id}`}>
                          <Button size="icon" className="size-12 rounded-full shadow-md hover:scale-105">
                            <ArrowRight className="size-6" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 flex flex-1 flex-col justify-between p-6">
                    <div className="space-y-2">
                      <Link href={`/dashboard/book-editor/${book.id}`} className="group/link block">
                        <p className="truncate font-heading text-2xl font-bold text-foreground transition-colors group-hover/link:text-primary">
                          {title}
                        </p>
                      </Link>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-500">
                        <Clock className="size-4" />
                        {formatLastEdited(book.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <Link href={`/dashboard/book-editor/${book.id}`} className="flex-1">
                        <Button variant="ghost" className="h-12 w-full justify-start gap-2 rounded-xl px-3 font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                          <BookOpen className="size-5" />
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
