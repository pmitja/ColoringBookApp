import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";

const BookEditor = dynamic(
  () => import("@/components/editor/book-editor-v2"),
  {
    ssr: false,
  },
);

export const metadata = constructMetadata({
  title: "New Book – Colorline AI",
  description: "Create a new coloring book.",
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

export default async function NewBookPage() {
  const user = await getCurrentUser();
  const assets = user?.id ? await getUserCreations(user.id) : [];

  return (
    <>
      <BookEditor assets={assets} initialBookId={null} initialBook={null} />
    </>
  );
}
