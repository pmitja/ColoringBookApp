import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
const BookEditor = dynamic(() => import("@/components/editor/book-editor-v2"), {
  ssr: false,
});

export const metadata = constructMetadata({
  title: "Edit Book – Colorline AI",
  description: "Edit your coloring book.",
});

// Minimal shape needed for the editor
interface BookState {
  title: string;
  pages: Array<{ id: string; elements: any[]; background?: string }>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function isBookState(value: unknown): value is BookState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as any).pages) && // eslint-disable-line @typescript-eslint/no-explicit-any
    typeof (value as any).title === "string" // eslint-disable-line @typescript-eslint/no-explicit-any
  );
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
    />
  );
}
