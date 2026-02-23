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
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Dashboard – Colorline AI",
  description: "Create magical coloring books from your family photos.",
});

interface ImageJob {
  id: string;
  inputFileName: string;
  lineartUrl?: string | null;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  createdAt: Date;
}

const creationDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const statusStyles: Record<ImageJob["status"], string> = {
  DONE: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/25 dark:text-emerald-300",
  PROCESSING:
    "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/25 dark:text-sky-300",
  QUEUED:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/25 dark:text-amber-300",
  FAILED:
    "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/25 dark:text-orange-300",
};

const statusLabels: Record<ImageJob["status"], string> = {
  DONE: "Ready",
  PROCESSING: "Processing",
  QUEUED: "Queued",
  FAILED: "Failed",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  const [
    recentCreations,
    totalCreations,
    groupedStatus,
    dbUser,
    generationsUsed,
  ] = await Promise.all([
    prisma.imageJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
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
  const generationsRemaining = Math.max(
    generationsAllocated - generationsUsed,
    0,
  );
  const overLimitCount = Math.max(generationsUsed - generationsAllocated, 0);
  const progressPercentage = Math.min(
    generationsAllocated > 0
      ? (generationsUsed / generationsAllocated) * 100
      : 0,
    100,
  );

  const processingCount =
    (statusCount["QUEUED"] ?? 0) + (statusCount["PROCESSING"] ?? 0);

  return (
    <>
      <DashboardHeader
        heading="Dashboard"
        text="A clean overview of usage, generation status, and recent pages."
      >
        <Link href="/upload">
          <Button className="gap-2 rounded-full px-4" size="sm">
            <Icons.media className="size-4" />
            New from Photo
          </Button>
        </Link>
        <Link href="/ai-generator">
          <Button className="rounded-full" size="sm" variant="outline">
            New from Prompt
          </Button>
        </Link>
      </DashboardHeader>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="playful-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-xl">
              Monthly Generations
            </CardTitle>
            <CardDescription>
              Current plan: {planLimits.planTitle}. Usage resets each month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {displayGenerationsUsed} of {generationsAllocated} used
              </p>
              <Badge
                variant={generationsRemaining > 0 ? "secondary" : "destructive"}
                className="rounded-full"
              >
                {generationsRemaining} left
              </Badge>
            </div>

            <Progress
              value={progressPercentage}
              className="h-2.5 rounded-full"
            />

            <p className="text-sm text-muted-foreground">
              {generationsRemaining > 0
                ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month.`
                : "You reached your current limit. Upgrade to continue generating."}
            </p>

            {overLimitCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {overLimitCount} additional generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month.
              </p>
            ) : null}

            {generationsRemaining <= 1 ? (
              <Link href="/dashboard/billing" className="inline-flex">
                <Button className="rounded-full" variant="outline">
                  Manage Plan
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="playful-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-xl">
              Quick Actions
            </CardTitle>
            <CardDescription>
              Start your next page in one click.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickActionLink
              href="/upload"
              icon={<Icons.media className="size-4" />}
              title="Upload a Photo"
              description="Generate line art from an image"
            />
            <QuickActionLink
              href="/ai-generator"
              icon={<Icons.add className="size-4" />}
              title="Create from Prompt"
              description="Generate directly from text"
            />
            <QuickActionLink
              href="/creations"
              icon={<Icons.bookOpen className="size-4" />}
              title="Open Creations"
              description="Review and manage saved pages"
            />
          </CardContent>
        </Card>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Pages"
          value={totalCreations}
          tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          icon={<Icons.bookOpen className="size-4" />}
        />
        <MetricCard
          label="Ready"
          value={statusCount["DONE"] ?? 0}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          icon={<Icons.download className="size-4" />}
        />
        <MetricCard
          label="In Progress"
          value={processingCount}
          tone="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
          icon={<Icons.spinner className="size-4" />}
        />
        <MetricCard
          label="Failed"
          value={statusCount["FAILED"] ?? 0}
          tone="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          icon={<Icons.warning className="size-4" />}
        />
      </section>

      <section className="mt-8 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold">Recent Creations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest generated pages and current status.
            </p>
          </div>
          {recentCreations.length > 0 ? (
            <Link href="/creations">
              <Button className="rounded-full" size="sm" variant="ghost">
                View all
                <Icons.arrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : null}
        </div>

        {recentCreations.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="media" />
            <EmptyPlaceholder.Title>No pages yet</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Upload your first photo to generate a clean printable page.
            </EmptyPlaceholder.Description>
            <Link href="/upload">
              <Button className="rounded-full">Upload first photo</Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <Card className="playful-card">
            <CardContent className="p-0">
              <ul className="divide-border/70 divide-y">
                {recentCreations.map((creation) => (
                  <li key={creation.id} className="p-4 sm:px-5">
                    <CreationRow creation={creation} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="playful-card group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-white/5" />
      <CardContent className="relative z-10 flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-heading text-4xl font-bold">{value}</p>
        </div>
        <span className={cn("rounded-2xl p-4 shadow-sm transition-transform group-hover:scale-110", tone)}>{icon}</span>
      </CardContent>
    </Card>
  );
}

function QuickActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-secondary/70 border-border/70 bg-background/40 flex items-start gap-3 rounded-2xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="mt-0.5 rounded-lg bg-secondary p-2 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

function CreationRow({ creation }: { creation: ImageJob }) {
  const previewLabel = creation.inputFileName.replace(/\.[^/.]+$/, "");

  const creationHref =
    creation.status === "DONE"
      ? `/results/${creation.id}`
      : creation.status === "FAILED"
        ? "/creations"
        : `/processing/${creation.id}`;

  return (
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <div className="border-border/70 bg-muted/40 relative size-14 shrink-0 overflow-hidden rounded-xl border">
        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Line art preview for ${previewLabel}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {creation.status === "PROCESSING" ? (
              <Icons.spinner className="size-5 animate-spin" />
            ) : creation.status === "QUEUED" ? (
              <Icons.help className="size-5" />
            ) : creation.status === "FAILED" ? (
              <Icons.warning className="size-5 text-rose-500" />
            ) : (
              <Icons.media className="size-5" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">
          {previewLabel}
        </p>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {creationDateFormatter.format(creation.createdAt)}
        </p>
      </div>

      <Badge
        className={cn(
          "rounded-full border text-xs",
          statusStyles[creation.status],
        )}
      >
        {statusLabels[creation.status]}
      </Badge>

      <Link href={creationHref} className="sm:ml-2">
        <Button className="rounded-full" size="sm" variant="outline">
          {creation.status === "DONE" ? "Open" : "Track"}
        </Button>
      </Link>
    </div>
  );
}
