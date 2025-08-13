import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

const BookEditor = dynamic(() => import("@/components/editor/book-editor"), {
  ssr: false,
});

export const metadata = constructMetadata({
  title: "Edit Book – Coloring Book Creator",
  description: "Edit your coloring book.",
});

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

  return (
    <>
      <DashboardHeader
        heading={book ? `Editing: ${book.title}` : "Book Editor"}
        text="Build your own book with draggable text boxes and your generated coloring pages."
      />
      <BookEditor
        assets={assets}
        initialBookId={book?.id || null}
        initialBook={book?.data || null}
      />
    </>
  );
}
