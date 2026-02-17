import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { cn, constructMetadata } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/components/dashboard/header";
import CreationsManager, {
  type CreationListItem,
} from "@/components/creations/creations-manager";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "My Creations – Colorline AI",
  description: "Browse all your coloring book creations.",
});

export default async function CreationsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: "all" | "DONE" | "PROCESSING" | "FAILED" | "QUEUED";
    sort?: "newest" | "oldest" | "name";
    view?: "grid" | "list";
  };
}) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="My Creations"
          text="Browse and manage all your coloring book creations."
        />
        <div className="mx-auto max-w-2xl">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="warning" />
            <EmptyPlaceholder.Title>
              Authentication Required
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Please sign in to view your creations.
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </div>
      </>
    );
  }

  const q = (searchParams?.q ?? "").trim();
  const status = (searchParams?.status ?? "all") as
    | "all"
    | "DONE"
    | "PROCESSING"
    | "FAILED"
    | "QUEUED";
  const sort = (searchParams?.sort ?? "newest") as "newest" | "oldest" | "name";
  const view = (searchParams?.view ?? "grid") as "grid" | "list";

  // Fetch actual user creations from database (with filters)
  const creations = await prisma.imageJob.findMany({
    where: {
      userId: user.id,
      AND: [
        q
          ? {
              inputFileName: {
                contains: q,
                mode: "insensitive",
              },
            }
          : {},
        status && status !== "all" ? { status } : {},
      ],
    },
    orderBy:
      sort === "name"
        ? { inputFileName: "asc" }
        : { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: 50, // Limit to recent 50 creations
  });

  const creationItems: CreationListItem[] = creations.map((creation) => ({
    id: creation.id,
    inputFileName: creation.inputFileName,
    lineartUrl: creation.lineartUrl,
    status: creation.status,
    createdAt: creation.createdAt.toISOString(),
  }));

  const buildHref = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (view && view !== "grid") params.set("view", view);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || value === "newest" || value === "grid") {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });
    const query = params.toString();
    return query ? `/creations?${query}` : "/creations";
  };

  return (
    <>
      <DashboardHeader
        heading="My Creations"
        text="Browse and manage all your coloring book creations."
      >
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/dashboard/book-editor/new">
            <Button
              variant="outline"
              className="gap-2 border-slate-200/70 bg-white/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Icons.media className="h-4 w-4" />
              New Book
            </Button>
          </Link>
          <Link href="/upload">
            <Button className="gap-2">
              <Icons.media className="h-4 w-4" />
              Upload Image
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      {/* Mobile actions */}
      <div className="sm:hidden">
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/book-editor/new"
            className="min-w-[140px] flex-1"
          >
            <Button
              variant="outline"
              className="w-full gap-2 border-slate-200/70 bg-white/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Icons.media className="h-4 w-4" />
              New Book
            </Button>
          </Link>
          <Link href="/upload" className="min-w-[140px] flex-1">
            <Button className="w-full gap-2">
              <Icons.media className="h-4 w-4" />
              Upload Image
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6 overflow-x-hidden pb-10">
        {/* Controls */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-4">
              {/* Top row: search + sort + view */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form className="flex-1" action={"/creations"} method="GET">
                  {/* preserve other params */}
                  {status && status !== "all" && (
                    <input type="hidden" name="status" value={status} />
                  )}
                  {sort && sort !== "newest" && (
                    <input type="hidden" name="sort" value={sort} />
                  )}
                  {view && view !== "grid" && (
                    <input type="hidden" name="view" value={view} />
                  )}
                  <div className="relative">
                    <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      name="q"
                      defaultValue={q}
                      placeholder="Search by filename..."
                      className="border-slate-200/70 bg-white/80 pl-10 dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                </form>

                <div className="flex items-center gap-2 sm:justify-end">
                  {/* Sort menu */}
                  <div className="hidden sm:block">
                    <SortMenu
                      current={sort}
                      hrefNewest={buildHref({ sort: "newest" })}
                      hrefOldest={buildHref({ sort: "oldest" })}
                      hrefName={buildHref({ sort: "name" })}
                    />
                  </div>
                  {/* View toggle */}
                  <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 p-1 dark:border-white/10 dark:bg-white/5">
                    <Link href={buildHref({ view: "grid" })}>
                      <Button
                        variant={view === "grid" ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-1 rounded-full px-3",
                          view !== "grid" &&
                            "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icons.dashboard className="h-4 w-4" /> Grid
                      </Button>
                    </Link>
                    <Link href={buildHref({ view: "list" })}>
                      <Button
                        variant={view === "list" ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-1 rounded-full px-3",
                          view !== "list" &&
                            "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icons.post className="h-4 w-4" /> List
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Status filters */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "DONE", label: "Completed" },
                  { key: "PROCESSING", label: "Processing" },
                  { key: "QUEUED", label: "Queued" },
                  { key: "FAILED", label: "Failed" },
                ].map(({ key, label }) => (
                  <Link key={key} href={buildHref({ status: key })}>
                    <Button
                      size="sm"
                      variant={status === (key as any) ? "default" : "outline"}
                      className={cn(
                        "rounded-full text-xs",
                        status === (key as any)
                          ? "border-transparent"
                          : "border-slate-200/70 bg-white/80 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground dark:hover:text-foreground",
                      )}
                    >
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <CreationsManager creations={creationItems} view={view} />

        {/* Load More Button */}
        {creations.length >= 50 && (
          <div className="pt-6 text-center">
            <Button variant="outline" size="lg">
              Load More Creations
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

interface SortMenuProps {
  current: "newest" | "oldest" | "name";
  hrefNewest: string;
  hrefOldest: string;
  hrefName: string;
}

function SortMenu({
  current,
  hrefNewest,
  hrefOldest,
  hrefName,
}: SortMenuProps) {
  const currentLabel =
    current === "name"
      ? "Name A-Z"
      : current === "oldest"
        ? "Oldest First"
        : "Newest First";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-slate-200/70 bg-white/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <Icons.arrowUpRight className="h-4 w-4 rotate-90" />
          Sort: {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={hrefNewest}>Newest First</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={hrefOldest}>Oldest First</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={hrefName}>Name A-Z</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
