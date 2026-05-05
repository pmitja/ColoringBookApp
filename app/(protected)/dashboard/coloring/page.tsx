import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import ColoringStudio from "@/components/coloring/coloring-studio";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";

export const metadata = constructMetadata({
  title: "Color Online – Color Genie",
  description: "Paint generated coloring pages directly in your browser.",
});

interface DashboardColoringPageProps {
  searchParams?: {
    jobId?: string;
  };
}

export default async function DashboardColoringPage({
  searchParams,
}: DashboardColoringPageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return (
      <>
        <DashboardHeader
          heading="Color Online"
          text="Sign in to open and color your generated pages."
        />
        <div className="mx-auto max-w-2xl">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="warning" />
            <EmptyPlaceholder.Title>
              Authentication Required
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Please sign in to color pages online.
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </div>
      </>
    );
  }

  const jobs = await prisma.imageJob.findMany({
    where: {
      userId: user.id,
      status: "DONE",
      lineartUrl: { not: null },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 80,
    select: {
      id: true,
      inputFileName: true,
      createdAt: true,
    },
  });

  const pages = jobs.map((job) => ({
    id: job.id,
    inputFileName: job.inputFileName,
    createdAt: job.createdAt.toISOString(),
  }));

  const queryPageId =
    typeof searchParams?.jobId === "string" ? searchParams.jobId : undefined;
  const initialPageId =
    queryPageId && pages.some((page) => page.id === queryPageId)
      ? queryPageId
      : pages[0]?.id;

  return (
    <>
      <DashboardHeader
        heading="Color Online"
        text="Select a generated page, fill regions with color, then export or save your painted version."
      />

      <ColoringStudio pages={pages} initialPageId={initialPageId} />
    </>
  );
}
