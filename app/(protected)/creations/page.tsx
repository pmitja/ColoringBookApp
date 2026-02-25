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
import CreationsManager, {
  type CreationListItem,
} from "@/components/creations/creations-manager";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "My Creations – Colorline AI",
  description: "Browse all your coloring book creations.",
});

type FilterStatus = "all" | "DONE" | "PROCESSING" | "FAILED" | "QUEUED";
type SortMode = "newest" | "oldest" | "name";
type ViewMode = "grid" | "list";

export default async function CreationsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: FilterStatus;
    sort?: SortMode;
    view?: ViewMode;
  };
}) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="My Creations"
          text="Sign in to view and manage your generated pages."
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
  const status = (searchParams?.status ?? "all") as FilterStatus;
  const sort = (searchParams?.sort ?? "newest") as SortMode;
  const view = (searchParams?.view ?? "grid") as ViewMode;

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
        status !== "all" ? { status } : {},
      ],
    },
    orderBy:
      sort === "name"
        ? { inputFileName: "asc" }
        : { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: 50,
  });

  const creationItems: CreationListItem[] = creations.map((creation) => ({
    id: creation.id,
    inputFileName: creation.inputFileName,
    lineartUrl: creation.lineartUrl,
    status: creation.status,
    createdAt: creation.createdAt.toISOString(),
  }));
  const readyCount = creationItems.filter(
    (item) => item.status === "DONE",
  ).length;
  const processingCount = creationItems.filter(
    (item) => item.status === "PROCESSING" || item.status === "QUEUED",
  ).length;
  const failedCount = creationItems.filter(
    (item) => item.status === "FAILED",
  ).length;

  const buildHref = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (sort !== "newest") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900 dark:text-slate-50">My Creations</h1>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
            Browse, filter, and manage your generated coloring pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/book-editor/new">
            <Button variant="outline" className="gap-2 rounded-full border-2 border-slate-900 dark:border-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm dark:text-slate-50 dark:hover:text-slate-50">
              <Icons.bookOpen className="size-4" />
              New Book
            </Button>
          </Link>
          <Link href="/upload">
            <Button className="gap-2 rounded-full bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-slate-50 border-2 border-slate-900 dark:border-slate-600 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all font-bold">
              <Icons.media className="size-4" />
              New Page
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6 overflow-x-hidden pb-10">
        <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardContent className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-8">
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                {creationItems.length} total page{creationItems.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-base font-medium text-slate-500 dark:text-slate-400">
                Keep only the pages you still want to color, print, or export.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 dark:border-slate-600 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1.5 text-emerald-800 dark:text-emerald-300 shadow-sm">
                <span className="size-3 rounded-full bg-emerald-500 border border-slate-900"></span> Ready: {readyCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 dark:border-slate-600 bg-sky-100 dark:bg-sky-900/30 px-4 py-1.5 text-sky-800 dark:text-sky-300 shadow-sm">
                <span className="size-3 animate-pulse rounded-full bg-sky-500 border border-slate-900"></span> In progress: {processingCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 dark:border-slate-600 bg-orange-100 dark:bg-orange-900/30 px-4 py-1.5 text-orange-800 dark:text-orange-300 shadow-sm">
                <span className="size-3 rounded-full bg-orange-500 border border-slate-900"></span> Failed: {failedCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-visible">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <form className="group relative flex-1" action="/creations" method="GET">
                {status !== "all" ? (
                  <input type="hidden" name="status" value={status} />
                ) : null}
                {sort !== "newest" ? (
                  <input type="hidden" name="sort" value={sort} />
                ) : null}
                {view !== "grid" ? (
                  <input type="hidden" name="view" value={view} />
                ) : null}

                <Icons.search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-slate-900 dark:group-focus-within:text-slate-50" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by file name"
                  className="bg-slate-50 dark:bg-slate-800 focus-visible:ring-slate-900 h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-600 pl-12 text-base font-medium transition-all focus-visible:border-slate-900 dark:focus-visible:border-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-700 dark:text-slate-50"
                />
              </form>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-1 rounded-full border-2 border-slate-200 dark:border-slate-600 p-1">
                  <Link href={buildHref({ view: "grid" })}>
                    <Button
                      variant={view === "grid" ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-full px-4 font-bold transition-all",
                        view === "grid" 
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-2 border-slate-900 dark:border-slate-600 shadow-sm hover:bg-white dark:hover:bg-slate-800" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 border-2 border-transparent",
                      )}
                    >
                      <Icons.dashboard className="mr-2 size-4" />
                      Grid
                    </Button>
                  </Link>
                  <Link href={buildHref({ view: "list" })}>
                    <Button
                      variant={view === "list" ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-full px-4 font-bold transition-all",
                        view === "list" 
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-2 border-slate-900 dark:border-slate-600 shadow-sm hover:bg-white dark:hover:bg-slate-800" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 border-2 border-transparent",
                      )}
                    >
                      <Icons.post className="mr-2 size-4" />
                      List
                    </Button>
                  </Link>
                </div>

                <SortMenu
                  current={sort}
                  hrefNewest={buildHref({ sort: "newest" })}
                  hrefOldest={buildHref({ sort: "oldest" })}
                  hrefName={buildHref({ sort: "name" })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "DONE", label: "Ready" },
                { key: "PROCESSING", label: "Processing" },
                { key: "QUEUED", label: "Queued" },
                { key: "FAILED", label: "Failed" },
              ].map(({ key, label }) => (
                <Link key={key} href={buildHref({ status: key })}>
                  <Button
                    size="sm"
                    variant={
                      status === (key as FilterStatus) ? "default" : "outline"
                    }
                    className={cn(
                      "rounded-full px-4 font-bold transition-all border-2",
                      status === key 
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md hover:bg-slate-800 dark:hover:bg-slate-200" 
                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                    )}
                  >
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <CreationsManager
          creations={creationItems}
          view={view}
          query={{ q, status, sort }}
        />

        {creations.length >= 50 ? (
          <div className="pt-6 text-center">
            <Button variant="outline" size="lg" className="rounded-full border-2 border-slate-900 dark:border-slate-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-50">
              Load More Creations
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

interface SortMenuProps {
  current: SortMode;
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
        <Button variant="outline" className="gap-2 rounded-full border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-400 hover:border-slate-900 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
          <Icons.arrowUpRight className="size-4 rotate-90" />
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
