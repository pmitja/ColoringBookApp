import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata = constructMetadata({
  title: "Books – Coloring Book Creator",
  description:
    "Choose to create a new book or edit one of your existing books.",
});

async function getUserBooks(userId: string) {
  const raw = await (prisma as any).book.findMany({
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
    try {
      const pages = (b.data as any)?.pages || [];
      let assetId: string | undefined = undefined;
      for (const p of pages) {
        const el = (p?.elements || []).find((e: any) => e?.type === "image");
        if (el?.data?.assetId) {
          assetId = el.data.assetId as string;
          break;
        }
      }
      if (assetId) {
        bookIdToAssetId[b.id] = assetId;
        assetIds.push(assetId);
      }
    } catch {}
  }

  let assetIdToUrl: Record<string, string> = {};
  if (assetIds.length > 0) {
    const jobs = await (prisma as any).imageJob.findMany({
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

export default async function BookChooserPage() {
  const user = await getCurrentUser();
  const books = user?.id ? await getUserBooks(user.id) : [];

  return (
    <div className="grid gap-4">
      <DashboardHeader
        heading="Your Books"
        text="Create a new coloring book or continue editing an existing one."
      />
      <div className="flex justify-end">
        <Link href="/dashboard/book-editor/new">
          <Button>Create new book</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-4">
          {!books || books.length === 0 ? (
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  You don\'t have any books yet.
                </p>
              </div>
              <Link href="/dashboard/book-editor/new">
                <Button variant="secondary">Create your first book</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {books.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-24 w-32 overflow-hidden rounded border bg-muted">
                      {b.thumbUrl ? (
                        <img
                          src={b.thumbUrl}
                          alt={b.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {b.updatedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/book-editor/${b.id}`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
