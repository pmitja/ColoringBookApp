import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";
import GeneratorStudio from "@/components/generator/generator-studio";

export const metadata: Metadata = {
  title: "AI Generator – Color Genie",
  description:
    "Generate coloring pages from prompts and consistent character references.",
};

export default async function AIGeneratorPage() {
  const user = await getCurrentUser();

  const [isPaidUser, referenceCreations] = user?.id
    ? await Promise.all([
        isUserOnPaidPlan(user.id),
        prisma.imageJob.findMany({
          where: {
            userId: user.id,
            status: "DONE",
            lineartUrl: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            inputFileName: true,
            lineartUrl: true,
          },
        }),
      ])
    : [false, []];

  const serializedReferenceCreations = referenceCreations
    .map((creation) => ({
      id: creation.id,
      inputFileName: creation.inputFileName,
      previewUrl: creation.lineartUrl,
    }))
    .filter(
      (
        creation,
      ): creation is {
        id: string;
        inputFileName: string;
        previewUrl: string;
      } => Boolean(creation.previewUrl),
    );

  return (
    <GeneratorStudio
      heading="AI Generator"
      text="Generate pages from prompts or keep a character consistent across new scenes."
      enabledModes={["ai", "consistent"]}
      defaultMode="ai"
      isPaidUser={isPaidUser}
      referenceCreations={serializedReferenceCreations}
    />
  );
}
