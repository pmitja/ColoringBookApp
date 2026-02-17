import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";
import { cn, constructMetadata } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { ReactBitsSpotlightCard } from "@/components/dashboard/reactbits-spotlight-card";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Dashboard – Colorline AI",
  description: "Create magical coloring books from your family photos.",
});

interface ImageJob {
  id: string;
  inputFileName: string;
  cartoonUrl?: string | null;
  lineartUrl?: string | null;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
}

const stylePresets = [
  { label: "General", hint: "Balanced line detail" },
  { label: "Simple", hint: "Bigger spaces for kids" },
  { label: "Detailed", hint: "More contours & texture" },
  { label: "Cartoon", hint: "Friendly soft edges" },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user?.id;
  if (!userId) {
    return null;
  }

  const [recentCreations, totalCreations, groupedStatus, dbUser, generationsUsed] =
    await Promise.all([
    prisma.imageJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.imageJob.count({
      where: { userId },
    }),
    prisma.imageJob.groupBy({
      by: ["status"],
      where: { userId },
      _count: {
        status: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
    prisma.imageJob.count({
      where: {
        userId,
        createdAt: {
          gte: getCurrentMonthStartUtc(),
        },
      },
    }),
  ]);

  const statusCount = groupedStatus.reduce<Record<string, number>>(
    (accumulator, statusGroup) => {
      accumulator[statusGroup.status] = statusGroup._count.status;
      return accumulator;
    },
    {},
  );

  const planLimits = resolveGenerationPlanLimit(dbUser ?? {});
  const generationsAllocated = planLimits.monthlyGenerationLimit;

  const displayGenerationsUsed = Math.min(
    generationsUsed,
    generationsAllocated,
  );
  const overLimitCount = Math.max(generationsUsed - generationsAllocated, 0);
  const generationsRemaining = Math.max(
    generationsAllocated - generationsUsed,
    0,
  );
  const progressPercentage = Math.min(
    generationsAllocated > 0 ? (generationsUsed / generationsAllocated) * 100 : 0,
    100,
  );

  const processingCount =
    (statusCount["QUEUED"] ?? 0) + (statusCount["PROCESSING"] ?? 0);
  const finishedCount = statusCount["DONE"] ?? 0;
  const failedCount = statusCount["FAILED"] ?? 0;

  return (
    <>
      <DashboardHeader
        heading="Your Creative Playground"
        text="Build coloring pages and books with big playful controls that are easy for both kids and adults."
      >
        <Link href="/upload">
          <Button className="shadow-primary/30 rounded-full px-5 shadow-sm">
            <Icons.media className="mr-2 size-4" />
            New Coloring Page
          </Button>
        </Link>
      </DashboardHeader>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <ReactBitsSpotlightCard
          spotlightColor="rgba(235, 205, 184, 0.42)"
          className="bg-card/95 border-border shadow-sm"
        >
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <span className="bg-background/90 inline-flex items-center rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Market Pattern: Photo + Prompt Modes
              </span>
              <h2 className="font-heading text-3xl leading-tight text-foreground">
                Generate pages from photos or text prompts
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Most top coloring apps offer both flows, so your dashboard now
                starts with either photo upload or prompt-based generation.
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/upload">
                  <Button className="w-full rounded-full" size="lg">
                    <Icons.media className="mr-2 size-4" />
                    Photo to Line Art
                  </Button>
                </Link>
                <Link href="/ai-generator">
                  <Button
                    className="w-full rounded-full"
                    size="lg"
                    variant="outline"
                  >
                    <Icons.add className="mr-2 size-4" />
                    Prompt to Page
                  </Button>
                </Link>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Style Presets
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {stylePresets.map((preset) => (
                    <div
                      key={preset.label}
                      className="bg-background/80 rounded-2xl border border-border p-3"
                    >
                      <p className="font-semibold text-foreground">
                        {preset.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preset.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-background/75 space-y-3 rounded-3xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Preview Quality
                </p>
                <Badge variant="secondary" className="rounded-full">
                  PDF + PNG
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background/85 space-y-1 rounded-2xl border border-border p-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Input
                  </p>
                  <Image
                    src="/illustrations/color-sample.svg"
                    alt="Colorful input image sample"
                    width={420}
                    height={280}
                    className="h-auto w-full rounded-xl"
                  />
                </div>
                <div className="bg-background/85 space-y-1 rounded-2xl border border-border p-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Output
                  </p>
                  <Image
                    src="/illustrations/lineart-sample.svg"
                    alt="Line art output sample"
                    width={420}
                    height={280}
                    className="h-auto w-full rounded-xl"
                  />
                </div>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span className="bg-background/85 rounded-xl border border-border px-2 py-1 text-center">
                  1. Upload / Prompt
                </span>
                <span className="bg-background/85 rounded-xl border border-border px-2 py-1 text-center">
                  2. Pick Preset
                </span>
                <span className="bg-background/85 rounded-xl border border-border px-2 py-1 text-center">
                  3. Print & Color
                </span>
              </div>
            </div>
          </div>
        </ReactBitsSpotlightCard>

        <ReactBitsSpotlightCard
          spotlightColor="rgba(191, 216, 234, 0.4)"
          className="bg-card/95 border-border shadow-sm"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-2xl">Generations</h3>
                <p className="text-sm text-muted-foreground">
                  Current plan: {planLimits.planTitle}
                </p>
              </div>
              <Badge variant={generationsRemaining > 0 ? "default" : "destructive"}>
                {generationsRemaining} left
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {displayGenerationsUsed} of {generationsAllocated} used this month.
            </p>
            <Progress value={progressPercentage} className="h-3 rounded-full" />
            <div className="bg-background/80 rounded-2xl border border-border p-3 text-sm text-muted-foreground">
              {generationsRemaining > 0
                ? `You can still generate ${generationsRemaining} more page${generationsRemaining > 1 ? "s" : ""}.`
                : "You reached your plan limit for this month. Upgrade to a higher plan to keep generating."}
            </div>
            {overLimitCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {overLimitCount} extra generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month before the current limits were applied.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="bg-background/85 rounded-xl border border-border px-2 py-1 text-center">
                Fast Queue
              </span>
              <span className="bg-background/85 rounded-xl border border-border px-2 py-1 text-center">
                Batch Friendly
              </span>
            </div>
            {generationsRemaining <= 1 ? (
              <Link href="/dashboard/billing" className="block">
                <Button variant="outline" className="w-full rounded-full">
                  Upgrade Plan
                </Button>
              </Link>
            ) : null}
          </div>
        </ReactBitsSpotlightCard>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlayfulMetric
          label="Pages Created"
          value={totalCreations}
          color="bg-secondary/80 text-secondary-foreground"
          icon={<Icons.bookOpen className="size-4" />}
        />
        <PlayfulMetric
          label="Ready to Print"
          value={finishedCount}
          color="bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          icon={<Icons.download className="size-4" />}
        />
        <PlayfulMetric
          label="Processing"
          value={processingCount}
          color="bg-sky-100/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
          icon={<Icons.spinner className="size-4" />}
        />
        <PlayfulMetric
          label="Needs Retry"
          value={failedCount}
          color="bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          icon={<Icons.warning className="size-4" />}
        />
      </div>

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl">Your Creations</h2>
            <p className="text-sm text-muted-foreground">
              Open recent pages to print, review, or keep editing.
            </p>
          </div>
          {recentCreations.length > 0 ? (
            <Link href="/creations">
              <Button variant="ghost" size="sm" className="rounded-full">
                View all
                <Icons.arrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : null}
        </div>

        {recentCreations.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="media" />
            <EmptyPlaceholder.Title>
              No coloring pages yet
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Upload your first family photo to generate a printable page.
            </EmptyPlaceholder.Description>
            <Link href="/upload">
              <Button className="rounded-full">Upload First Photo</Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentCreations.map((creation) => (
              <CreationCard key={creation.id} creation={creation} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PlayfulMetric({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border-border/75 bg-card/95 rounded-3xl">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="font-heading mt-2 text-3xl leading-none">{value}</p>
        </div>
        <span className={cn("rounded-2xl p-2.5", color)}>{icon}</span>
      </CardContent>
    </Card>
  );
}

interface CreationCardProps {
  creation: ImageJob;
}

function CreationCard({ creation }: CreationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "QUEUED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getCardLink = () => {
    switch (creation.status) {
      case "DONE":
        return `/results/${creation.id}`;
      case "PROCESSING":
      case "QUEUED":
        return `/processing/${creation.id}`;
      default:
        return "#";
    }
  };

  return (
    <Card className="border-border/80 bg-card/95 overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="bg-secondary/45 relative aspect-[4/3] dark:bg-white/5">
        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Coloring book from ${creation.inputFileName}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {creation.status === "PROCESSING" ? (
                <Icons.spinner className="mx-auto mb-2 size-8 animate-spin text-muted-foreground" />
              ) : creation.status === "QUEUED" ? (
                <Icons.help className="mx-auto mb-2 size-8 text-muted-foreground" />
              ) : creation.status === "FAILED" ? (
                <Icons.warning className="mx-auto mb-2 size-8 text-red-500" />
              ) : (
                <Icons.media className="mx-auto mb-2 size-8 text-muted-foreground" />
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
          <Badge className={cn("text-xs", getStatusColor(creation.status))}>
            {creation.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-xs font-semibold sm:text-sm">
              {creation.inputFileName.replace(/\.[^/.]+$/, "")}
            </CardTitle>
            <CardDescription className="text-xs">
              {formatDate(creation.createdAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex gap-2">
          <Link href={getCardLink()} className="flex-1">
            <Button size="sm" className="h-8 w-full rounded-full text-xs">
              {creation.status === "DONE" ? "View Results" : "View Details"}
            </Button>
          </Link>
          {creation.status === "DONE" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-2"
            >
              <Icons.arrowUpRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
