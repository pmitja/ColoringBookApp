import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Books – Coloring Book Creator",
  description: "Create a new coloring book or continue editing an existing one.",
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
          heading="Your Books"
          text="Create a new coloring book or continue editing an existing one."
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
        heading="Your Books"
        text="Create a new coloring book or continue editing an existing one."
      >
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/dashboard/book-editor/new">
            <Button className="gap-2">
              <Icons.add className="h-4 w-4" />
              New Book
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      <div className="sm:hidden">
        <Link href="/dashboard/book-editor/new" className="block">
          <Button className="w-full gap-2">
            <Icons.add className="h-4 w-4" />
            New Book
          </Button>
        </Link>
      </div>

      {!books || books.length === 0 ? (
        <EmptyPlaceholder>
          <EmptyPlaceholder.Icon name="bookOpen" />
          <EmptyPlaceholder.Title>No books yet</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            Create your first coloring book from your uploaded images.
          </EmptyPlaceholder.Description>
          <Link href="/dashboard/book-editor/new">
            <Button variant="secondary" className="gap-2">
              <Icons.add className="h-4 w-4" />
              Create your first book
            </Button>
          </Link>
        </EmptyPlaceholder>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const title = book.title?.trim() || "Untitled book";
            return (
              <Card
                key={book.id}
                className="group overflow-hidden border-slate-200/70 bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-950/40">
                    {book.thumbUrl ? (
                      <Image
                        src={book.thumbUrl}
                        alt={title}
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No preview available
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-1">
                    <p className="truncate font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDate(book.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link href={`/dashboard/book-editor/${book.id}`}>
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        Edit
                        <Icons.arrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link
                      href={`/dashboard/book-editor/${book.id}`}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Open editor
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
