import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { cn, constructMetadata } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "My Creations – Coloring Book Creator",
  description: "Browse all your coloring book creations.",
});

interface ImageJob {
  id: string;
  inputFileName: string;
  cartoonUrl?: string | null;
  lineartUrl?: string | null;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
}

function getStatusColor(status: string) {
  switch (status) {
    case "DONE":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "QUEUED":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
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

function getCardLinkForCreation(creation: ImageJob) {
  switch (creation.status) {
    case "DONE":
      return `/results/${creation.id}`;
    case "PROCESSING":
    case "QUEUED":
      return `/processing/${creation.id}`;
    default:
      return "#";
  }
}

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
            <Button variant="secondary" className="gap-2">
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
            <Button variant="secondary" className="w-full gap-2">
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

      <div className="space-y-6 overflow-x-hidden">
        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
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
                      className="pl-10"
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
                  <div className="inline-flex rounded-md bg-muted p-1">
                    <Link href={buildHref({ view: "grid" })}>
                      <Button
                        variant={view === "grid" ? "default" : "ghost"}
                        size="sm"
                        className="gap-1"
                      >
                        <Icons.dashboard className="h-4 w-4" /> Grid
                      </Button>
                    </Link>
                    <Link href={buildHref({ view: "list" })}>
                      <Button
                        variant={view === "list" ? "default" : "ghost"}
                        size="sm"
                        className="gap-1"
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
        {creations.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="media" />
            <EmptyPlaceholder.Title>
              No coloring books yet
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              You haven't created any coloring books yet. Upload your first
              family photo to get started!
            </EmptyPlaceholder.Description>
            <Link href="/upload">
              <Button className="gap-2">
                <Icons.media className="h-4 w-4" />
                Create First Coloring Book
              </Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <>
            {view === "list" ? (
              <CreationsTable creations={creations} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {creations.map((creation) => (
                  <CreationCard key={creation.id} creation={creation} />
                ))}
              </div>
            )}
          </>
        )}

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

interface CreationCardProps {
  creation: ImageJob;
}

function CreationCard({ creation }: CreationCardProps) {
  const getCardLink = () => getCardLinkForCreation(creation);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 sm:aspect-[4/5]">
        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Coloring book from ${creation.inputFileName}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {creation.status === "PROCESSING" ? (
                <Icons.spinner className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              ) : creation.status === "QUEUED" ? (
                <Icons.help className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              ) : creation.status === "FAILED" ? (
                <Icons.warning className="mx-auto mb-2 h-8 w-8 text-red-500" />
              ) : (
                <Icons.media className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {creation.status === "PROCESSING" && "Processing..."}
                {creation.status === "QUEUED" && "In Queue"}
                {creation.status === "FAILED" && "Failed"}
                {creation.status === "DONE" && "Preview"}
              </p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute right-2 top-2">
          <Badge className={cn("text-xs", getStatusColor(creation.status))}>
            {creation.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-xs font-medium">
              {creation.inputFileName.replace(/\.[^/.]+$/, "")}
            </CardTitle>
            <CardDescription className="text-xs">
              {formatDate(creation.createdAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Link href={getCardLink()} className="flex-1">
            <Button size="sm" className="w-full">
              {creation.status === "DONE" ? "View Results" : "View Details"}
            </Button>
          </Link>
          {creation.status === "DONE" && (
            <Button size="sm" variant="outline">
              <Icons.arrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
        <Button variant="outline" className="gap-2">
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

function CreationsTable({ creations }: { creations: ImageJob[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table className="min-w-[360px] sm:min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[64px] sm:table-cell"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creations.map((creation) => (
              <TableRow key={creation.id}>
                <TableCell className="hidden sm:table-cell">
                  <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
                    {creation.lineartUrl ? (
                      <Image
                        src={creation.lineartUrl}
                        alt={creation.inputFileName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Icons.media className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] truncate whitespace-nowrap align-middle sm:max-w-[360px]">
                  {creation.inputFileName}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    className={cn("text-xs", getStatusColor(creation.status))}
                  >
                    {creation.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(creation.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={getCardLinkForCreation(creation)}>
                    <Button size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
