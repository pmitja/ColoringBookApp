import dynamic from "next/dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

const BookEditor = dynamic(() => import("@/components/editor/book-editor"), {
  ssr: false,
});

export const metadata = constructMetadata({
  title: "Book Editor – Coloring Book Creator",
  description: "Create your own coloring book with images and text pages.",
});

async function getUserCreations(userId: string) {
  // Limit to recent successful creations with available lineart URL
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

export default async function BookEditorPage() {
  const user = await getCurrentUser();
  const assets = user?.id ? await getUserCreations(user.id) : [];

  return (
    <>
      <DashboardHeader
        heading="Book Editor"
        text="Build your own book with draggable text boxes and your generated coloring pages."
      />
      {/* Global controls for the editor viewport */}
      {/* Format selector moved out of element controls per request */}
      {/* This could be hoisted further if needed */}
      <BookEditor assets={assets} />
    </>
  );
}
