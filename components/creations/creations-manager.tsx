"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

type CreationStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

export type CreationListItem = {
  id: string;
  inputFileName: string;
  lineartUrl?: string | null;
  status: CreationStatus;
  createdAt: string;
};

type ViewMode = "grid" | "list";
type FilterStatus = "all" | CreationStatus;
type SortMode = "newest" | "oldest" | "name";

interface CreationsManagerProps {
  creations: CreationListItem[];
  view: ViewMode;
  query: {
    q: string;
    status: FilterStatus;
    sort: SortMode;
  };
}

function getStatusColor(status: CreationStatus) {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-300";
    case "PROCESSING":
      return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/25 dark:text-sky-300";
    case "QUEUED":
      return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/25 dark:text-amber-300";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-300";
    default:
      return "border-border bg-background/60 text-muted-foreground";
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCardLinkForCreation(creation: CreationListItem) {
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

export default function CreationsManager({
  creations,
  view,
  query,
}: CreationsManagerProps) {
  const [items, setItems] = useState<CreationListItem[]>(creations);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(creations);
    setSelectedIds(new Set());
  }, [creations]);

  const refreshCreations = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.q) {
      params.set("q", query.q);
    }
    if (query.status !== "all") {
      params.set("status", query.status);
    }
    if (query.sort !== "newest") {
      params.set("sort", query.sort);
    }

    const endpoint = params.toString()
      ? `/api/creations?${params.toString()}`
      : "/api/creations";

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to refresh creations.");
      }

      const payload = (await response.json()) as { creations: CreationListItem[] };
      if (!Array.isArray(payload.creations)) return;

      setItems(payload.creations);
      setSelectedIds((prev) => {
        const availableIds = new Set(payload.creations.map((item) => item.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (availableIds.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Creations refresh error:", error);
    }
  }, [query.q, query.sort, query.status]);

  useEffect(() => {
    void refreshCreations();
  }, [refreshCreations]);

  const hasActiveJobs = items.some(
    (item) => item.status === "PROCESSING" || item.status === "QUEUED",
  );

  useEffect(() => {
    if (!hasActiveJobs) return;

    const pollInterval = setInterval(() => {
      void refreshCreations();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [hasActiveJobs, refreshCreations]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshCreations();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshCreations]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const selectedCountLabel =
    selectedIds.size === 0 ? "Select items" : `${selectedIds.size} selected`;

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const shouldSelect = checked === true;
    setSelectedIds(
      shouldSelect ? new Set(items.map((item) => item.id)) : new Set(),
    );
  };

  const handleSelectOne = (id: string, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const openDeleteDialog = (ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
  };

  const closeDeleteDialog = () => {
    if (!deleting) {
      setPendingDeleteIds(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/creations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingDeleteIds }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload?.error || payload?.message || "Failed to delete creations.";
        throw new Error(message);
      }

      const deletedCount =
        typeof payload?.deletedCount === "number"
          ? payload.deletedCount
          : pendingDeleteIds.length;
      const storageError = payload?.storageError;
      if (storageError) {
        toast.warning(storageError);
      }

      const deleteSet = new Set(pendingDeleteIds);
      setItems((prev) => prev.filter((item) => !deleteSet.has(item.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteSet.forEach((id) => next.delete(id));
        return next;
      });

      toast.success(
        `Deleted ${deletedCount} creation${deletedCount === 1 ? "" : "s"}.`,
      );
      setPendingDeleteIds(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete creations.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="media" />
        <EmptyPlaceholder.Title>No creations yet</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Create your first coloring page to start building your library.
        </EmptyPlaceholder.Description>
        <Link href="/upload">
          <Button className="gap-2 rounded-full">
            <Icons.media className="size-4" />
            Create First Page
          </Button>
        </Link>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-border/80 bg-card/95 dark:border-slate-700 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={
              allSelected ? true : someSelected ? "indeterminate" : false
            }
            onCheckedChange={handleSelectAll}
            aria-label="Select all creations"
          />
          <span className="text-sm text-muted-foreground dark:text-slate-400">
            {selectedCountLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setSelectedIds(new Set())}
              disabled={deleting}
            >
              Clear
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="destructive"
            className="gap-2 rounded-full"
            onClick={() => openDeleteDialog(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <Icons.trash className="size-4" />
            )}
            Delete Selected
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <CreationsTable
          creations={items}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onDeleteOne={(id) => openDeleteDialog([id])}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((creation) => (
            <CreationCard
              key={creation.id}
              creation={creation}
              selected={selectedIds.has(creation.id)}
              onSelect={(checked) => handleSelectOne(creation.id, checked)}
              onDelete={() => openDeleteDialog([creation.id])}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDeleteIds} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDeleteIds?.length === 1 ? "creation" : "creations"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes selected creations and their stored files
              permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CreationCardProps {
  creation: CreationListItem;
  selected: boolean;
  onSelect: (checked: boolean | "indeterminate") => void;
  onDelete: () => void;
}

function CreationCard({
  creation,
  selected,
  onSelect,
  onDelete,
}: CreationCardProps) {
  const cardLink = getCardLinkForCreation(creation);

  return (
    <Card
      className={cn(
        "border-border/80 bg-card/95 dark:border-slate-700 dark:bg-slate-900 group overflow-hidden rounded-3xl border transition hover:-translate-y-0.5 hover:shadow-md",
        selected && "ring-primary/35 ring-2",
      )}
    >
      <div className="bg-background/60 dark:bg-slate-800/60 relative aspect-[3/4] sm:aspect-[4/5]">
        <div className="bg-background/95 dark:bg-slate-900/95 absolute left-2 top-2 z-10 rounded-md p-1 shadow-sm">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            aria-label={`Select ${creation.inputFileName}`}
          />
        </div>

        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Coloring page from ${creation.inputFileName}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {creation.status === "PROCESSING" ? (
                <Icons.spinner className="mx-auto mb-2 size-8 animate-spin text-muted-foreground" />
              ) : creation.status === "QUEUED" ? (
                <Icons.help className="mx-auto mb-2 size-8 text-muted-foreground" />
              ) : creation.status === "FAILED" ? (
                <Icons.warning className="mx-auto mb-2 size-8 text-rose-500" />
              ) : (
                <Icons.media className="mx-auto mb-2 size-8 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {creation.status === "PROCESSING" && "Processing"}
                {creation.status === "QUEUED" && "Queued"}
                {creation.status === "FAILED" && "Failed"}
                {creation.status === "DONE" && "Preview"}
              </p>
            </div>
          </div>
        )}

        <div className="absolute right-2 top-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full text-xs",
              getStatusColor(creation.status),
            )}
          >
            {creation.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm font-semibold">
            {creation.inputFileName.replace(/\.[^/.]+$/, "")}
          </CardTitle>
          <CardDescription className="text-xs">
            {formatDate(creation.createdAt)}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Link href={cardLink} className="flex-1">
            <Button size="sm" className="w-full rounded-full">
              {creation.status === "DONE" ? "Open" : "View"}
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 hover:bg-destructive/10 rounded-full text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${creation.inputFileName}`}
          >
            <Icons.trash className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreationsTableProps {
  creations: CreationListItem[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean | "indeterminate") => void;
  onSelectOne: (id: string, checked: boolean | "indeterminate") => void;
  onDeleteOne: (id: string) => void;
}

function CreationsTable({
  creations,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onDeleteOne,
}: CreationsTableProps) {
  const allSelected =
    creations.length > 0 && selectedIds.size === creations.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <Card className="border-border/80 bg-card/95 dark:border-slate-700 dark:bg-slate-900 rounded-3xl">
      <CardContent className="pt-6">
        <Table className="min-w-[420px] sm:min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px] text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={onSelectAll}
                  aria-label="Select all creations"
                />
              </TableHead>
              <TableHead className="hidden w-[64px] text-xs uppercase tracking-[0.2em] text-muted-foreground sm:table-cell"></TableHead>
              <TableHead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:table-cell">
                Status
              </TableHead>
              <TableHead className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:table-cell">
                Created
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creations.map((creation) => (
              <TableRow
                key={creation.id}
                className={cn(
                  "hover:bg-secondary/30",
                  selectedIds.has(creation.id) && "bg-secondary/35",
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(creation.id)}
                    onCheckedChange={(checked) =>
                      onSelectOne(creation.id, checked)
                    }
                    aria-label={`Select ${creation.inputFileName}`}
                  />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="border-border/70 bg-background/60 relative size-12 overflow-hidden rounded-lg border">
                    {creation.lineartUrl ? (
                      <Image
                        src={creation.lineartUrl}
                        alt={creation.inputFileName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Icons.media className="size-5" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] truncate whitespace-nowrap align-middle sm:max-w-[360px]">
                  {creation.inputFileName}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-xs",
                      getStatusColor(creation.status),
                    )}
                  >
                    {creation.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(creation.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={getCardLinkForCreation(creation)}>
                      <Button size="sm" className="rounded-full">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 hover:bg-destructive/10 rounded-full text-destructive"
                      onClick={() => onDeleteOne(creation.id)}
                      aria-label={`Delete ${creation.inputFileName}`}
                    >
                      <Icons.trash className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
