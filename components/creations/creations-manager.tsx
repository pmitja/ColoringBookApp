"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

interface CreationsManagerProps {
  creations: CreationListItem[];
  view: ViewMode;
}

function getStatusColor(status: CreationStatus) {
  switch (status) {
    case "DONE":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100";
    case "PROCESSING":
      return "border-sky-400/30 bg-sky-500/15 text-sky-800 dark:text-sky-100";
    case "QUEUED":
      return "border-amber-400/30 bg-amber-500/15 text-amber-800 dark:text-amber-100";
    case "FAILED":
      return "border-rose-400/30 bg-rose-500/15 text-rose-800 dark:text-rose-100";
    default:
      return "border-slate-200/70 bg-white/80 text-muted-foreground dark:border-white/10 dark:bg-white/5";
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
}: CreationsManagerProps) {
  const [items, setItems] = useState<CreationListItem[]>(creations);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(creations);
    setSelectedIds(new Set());
  }, [creations]);

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

  const handleSelectOne = (
    id: string,
    checked: boolean | "indeterminate",
  ) => {
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
          payload?.error ||
          payload?.message ||
          "Failed to delete creations.";
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
        <EmptyPlaceholder.Title>No coloring books yet</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          You haven't created any coloring books yet. Upload your first family
          photo to get started!
        </EmptyPlaceholder.Description>
        <Link href="/upload">
          <Button className="gap-2">
            <Icons.media className="h-4 w-4" />
            Create First Coloring Book
          </Button>
        </Link>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={handleSelectAll}
            aria-label="Select all creations"
          />
          <span className="text-sm text-muted-foreground">
            {selectedCountLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-200/70 bg-white/80 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5"
              onClick={() => setSelectedIds(new Set())}
              disabled={deleting}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={() => openDeleteDialog(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.trash className="h-4 w-4" />
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
              Delete {pendingDeleteIds?.length === 1 ? "creation" : "creations"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected creations from your account and
              delete their files from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        "group overflow-hidden border-slate-200/70 bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
        selected && "ring-2 ring-rose-500/40",
      )}
    >
      <div className="relative aspect-[3/4] bg-slate-100 sm:aspect-[4/5] dark:bg-slate-950/40">
        <div className="absolute left-2 top-2 z-10 rounded-md bg-white/80 p-1 shadow-sm dark:bg-slate-900/80">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            aria-label={`Select ${creation.inputFileName}`}
          />
        </div>
        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Coloring book from ${creation.inputFileName}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

        <div className="absolute right-2 top-2">
          <Badge
            variant="outline"
            className={cn("text-xs", getStatusColor(creation.status))}
          >
            {creation.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold">
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
          <Link href={cardLink} className="flex-1">
            <Button size="sm" className="w-full">
              {creation.status === "DONE" ? "View Results" : "View Details"}
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-200/70 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-400/30 dark:hover:bg-rose-500/10"
            onClick={onDelete}
            aria-label={`Delete ${creation.inputFileName}`}
          >
            <Icons.trash className="h-4 w-4" />
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
    <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
      <CardContent className="pt-6">
        <Table className="min-w-[420px] sm:min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px] text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
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
                  "hover:bg-slate-100 dark:hover:bg-white/5",
                  selectedIds.has(creation.id) &&
                    "bg-rose-50/70 dark:bg-rose-500/10",
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
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
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
                    variant="outline"
                    className={cn("text-xs", getStatusColor(creation.status))}
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
                      <Button size="sm">View</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200/70 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-400/30 dark:hover:bg-rose-500/10"
                      onClick={() => onDeleteOne(creation.id)}
                      aria-label={`Delete ${creation.inputFileName}`}
                    >
                      <Icons.trash className="h-4 w-4" />
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
