"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";

interface DeleteBookButtonProps {
  bookId: string;
  bookTitle: string;
  size?: ButtonProps["size"];
}

export function DeleteBookButton({
  bookId,
  bookTitle,
  size = "sm",
}: DeleteBookButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const safeTitle = bookTitle.trim() || "book";

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete book.");
      }

      toast.success(`Deleted "${safeTitle}".`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete book.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size={size}
          variant="outline"
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Icons.spinner className="size-3.5 animate-spin" />
          ) : (
            <Icons.trash className="size-3.5" />
          )}
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this book?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{safeTitle}". This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete book"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
