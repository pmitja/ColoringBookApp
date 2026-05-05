import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";
import { constructMetadata } from "@/lib/utils";

const BookEditor = dynamic(() => import("@/components/editor/book-editor-v2"), {
  ssr: false,
});

export const metadata = constructMetadata({
  title: "Edit Book – Color Genie",
  description: "Edit your coloring book.",
});

// Minimal shape needed for the editor
interface BookState {
  title: string;
  pages: Array<{
    id: string;
    elements: Array<Record<string, unknown>>;
    background?: string;
  }>;
}

function isBookState(value: unknown): value is BookState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeBook = value as {
    title?: unknown;
    pages?: unknown;
  };

  if (typeof maybeBook.title !== "string" || !Array.isArray(maybeBook.pages)) {
    return false;
  }

  return maybeBook.pages.every((page) => {
    if (typeof page !== "object" || page === null) {
      return false;
    }

    const maybePage = page as {
      id?: unknown;
      elements?: unknown;
      background?: unknown;
    };

    if (
      typeof maybePage.id !== "string" ||
      !Array.isArray(maybePage.elements)
    ) {
      return false;
    }

    if (
      maybePage.background !== undefined &&
      typeof maybePage.background !== "string"
    ) {
      return false;
    }

    return maybePage.elements.every(
      (element) => typeof element === "object" && element !== null,
    );
  });
}

async function getUserCreations(userId: string) {
  const creations = await prisma.imageJob.findMany({
    where: {
      userId,
      status: "DONE",
      lineartUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return creations
    .filter((c) => Boolean(c.lineartUrl))
    .map((c) => ({
      id: c.id,
      url: c.lineartUrl as string,
      name: c.inputFileName,
    }));
}

export default async function EditBookPage({
  params,
}: {
  params: { bookId: string };
}) {
  const user = await getCurrentUser();
  const userId = user?.id;
  const assets = userId ? await getUserCreations(userId) : [];
  const isPaidUser = userId ? await isUserOnPaidPlan(userId) : false;

  if (!userId) {
    return null;
  }

  const book = await prisma.book.findFirst({
    where: { id: params.bookId, userId },
    select: { id: true, title: true, data: true },
  });

  const initialBook = isBookState(book?.data)
    ? (book?.data as BookState)
    : null;

  return (
    <BookEditor
      assets={assets}
      initialBookId={book?.id || null}
      initialBook={initialBook}
      isPaidUser={isPaidUser}
    />
  );
}
