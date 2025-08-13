import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

const BookEditor = dynamic(() => import("@/components/editor/book-editor"), {
  ssr: false,
});

export const metadata = constructMetadata({
  title: "New Book – Coloring Book Creator",
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
      <DashboardHeader
        heading="New Book"
        text="Start a new book with draggable text boxes and your generated coloring pages."
      />
      <BookEditor assets={assets} initialBookId={null} initialBook={null} />
    </>
  );
}
