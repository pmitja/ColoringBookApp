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
  title: "Books – Colorline AI",
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900">Books (v2)</h1>
          <p className="text-lg font-bold text-slate-500">
            Create and manage books in the v2 editor.
          </p>
        </div>
        <Link href="/dashboard/book-editor/version-2/new">
          <Button className="gap-3 rounded-full py-7 px-8 text-xl font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-yellow-400 text-slate-900 border-2 border-slate-900 hover:bg-yellow-500 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[4px] active:shadow-none transition-all">
            <Icons.add className="size-6" />
            New Book
          </Button>
        </Link>
      </div>

      <div className="space-y-8 pb-10">
        <Card className="rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900">
                {books.length === 1
                  ? "1 book available"
                  : `${books.length} books available`}
              </p>
              <p className="text-base font-bold text-slate-500">
                Continue editing any draft or start a fresh book.
              </p>
            </div>
            <Link href="/dashboard/book-editor/version-2/new">
              <Button variant="outline" className="h-14 gap-2 rounded-2xl border-2 border-slate-900 bg-white px-6 text-lg font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:bg-slate-50 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <Icons.add className="size-5 text-yellow-500" />
                Start New Draft
              </Button>
            </Link>
          </CardContent>
        </Card>

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="mb-8 flex size-32 items-center justify-center rounded-[2.5rem] bg-white border-4 border-slate-200 rotate-6 shadow-sm">
              <Icons.media className="text-slate-300 size-16 -rotate-6" />
            </div>
            <h3 className="font-heading text-3xl font-black text-slate-400 mb-3">No books yet</h3>
            <p className="text-lg font-bold text-slate-300 max-w-sm mb-10 leading-relaxed">
              Create your first coloring book from your generated pages.
            </p>
            <Link href="/dashboard/book-editor/version-2/new">
              <Button className="gap-3 rounded-full py-8 px-10 text-xl font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-emerald-400 text-slate-900 border-2 border-slate-900 hover:bg-emerald-500 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all">
                <Icons.add className="size-6" />
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
                  className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border-4 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-900 hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2"
                >
                  <CardHeader className="border-b-4 border-slate-100 p-0 group-hover:border-slate-900 transition-colors duration-300">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
                      {book.thumbUrl ? (
                        <Image
                          src={book.thumbUrl}
                          alt={title}
                          fill
                          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 48vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-4 text-slate-300 bg-slate-50">
                          <Icons.media className="size-12" />
                          <p className="text-base font-black">No preview yet</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <p className="truncate text-2xl font-black text-slate-900">
                        {title}
                      </p>
                      <p className="text-sm font-bold text-slate-400">
                        Updated {formatDate(book.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4 border-t-2 border-slate-100 border-dashed group-hover:border-slate-200">
                      <DeleteBookButton bookId={book.id} bookTitle={title} />
                      <Link
                        href={`/dashboard/book-editor/version-2/${book.id}`}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full gap-2 rounded-xl h-12 font-bold bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 hover:bg-slate-800 hover:translate-y-[1px] hover:shadow-none transition-all">
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
