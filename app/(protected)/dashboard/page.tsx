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
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Dashboard – Color Genie",
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

const statusDot: Record<ImageJob["status"], string> = {
  DONE: "bg-emerald-500",
  PROCESSING: "bg-primary",
  QUEUED: "bg-chart-3",
  FAILED: "bg-destructive",
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
        text="A calm overview of usage, generation status, and recent pages."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/upload">
            <Button className="gap-2 rounded-full">
              <Icons.media className="size-5" />
              New from Photo
            </Button>
          </Link>
          <Link href="/ai-generator">
            <Button variant="outline" className="rounded-full">
              New from Prompt
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              Monthly Generations
            </CardTitle>
            <CardDescription>
              Current plan: {planLimits.planTitle}. Usage resets each month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">
                {displayGenerationsUsed} of {generationsAllocated} used
              </p>
              <Badge
                variant={generationsRemaining > 0 ? "secondary" : "destructive"}
                className="rounded-full px-3 py-1 font-medium"
              >
                {generationsRemaining} left
              </Badge>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {generationsRemaining > 0
                ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month.`
                : "You reached your current limit. Upgrade to continue generating."}
            </p>

            {overLimitCount > 0 ? (
              <p className="rounded-lg border border-orange-200 bg-orange-50/80 p-2 text-xs font-medium text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                {overLimitCount} additional generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month.
              </p>
            ) : null}

            {generationsRemaining <= 1 ? (
              <Link href="/dashboard/billing" className="inline-flex">
                <Button variant="outline" className="rounded-full">
                  Manage Plan
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Quick Actions</CardTitle>
            <CardDescription>Start your next page in one click.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickActionLink
              href="/upload"
              icon={<Icons.media className="size-5" />}
              title="Upload a Photo"
              description="Generate line art from an image"
            />
            <QuickActionLink
              href="/ai-generator"
              icon={<Icons.add className="size-5" />}
              title="Create from Prompt"
              description="Generate directly from text"
            />
            <QuickActionLink
              href="/creations"
              icon={<Icons.bookOpen className="size-5" />}
              title="Open Creations"
              description="Review and manage saved pages"
            />
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Pages"
          value={totalCreations}
          icon={<Icons.bookOpen className="size-5 text-primary" />}
        />
        <MetricCard
          label="Ready"
          value={statusCount["DONE"] ?? 0}
          icon={<Icons.download className="size-5 text-primary" />}
        />
        <MetricCard
          label="In Progress"
          value={processingCount}
          icon={<Icons.spinner className="size-5 animate-spin text-primary" />}
        />
        <MetricCard
          label="Failed"
          value={statusCount["FAILED"] ?? 0}
          icon={<Icons.warning className="size-5 text-destructive" />}
        />
      </section>

      <section className="mt-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Recent Creations
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Latest generated pages and current status.
            </p>
          </div>
          {recentCreations.length > 0 ? (
            <Link href="/creations">
              <Button variant="ghost" className="rounded-full font-medium">
                View all
                <Icons.arrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : null}
        </div>

        {recentCreations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <div className="relative mx-auto mb-6 flex size-40 items-center justify-center">
              <Image
                src="/_static/illustrations/call-waiting.svg"
                alt=""
                width={160}
                height={160}
                className="animate-floaty-slow opacity-90"
              />
            </div>
            <h3 className="mb-2 font-heading text-xl font-bold text-foreground">
              No pages yet
            </h3>
            <p className="mx-auto mb-8 max-w-sm text-muted-foreground">
              Upload your first photo to generate a clean printable page.
            </p>
            <Link href="/upload">
              <Button className="rounded-full px-8 py-6 text-base">
                Upload first photo
              </Button>
            </Link>
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recentCreations.map((creation) => (
                  <li
                    key={creation.id}
                    className="p-4 transition-colors hover:bg-muted/40 sm:px-6"
                  >
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/60 p-2.5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-4xl font-bold text-foreground">
            {value}
          </p>
        </div>
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
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/60 text-primary transition-transform group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground transition-colors group-hover:text-primary">
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <Icons.arrowRight className="ml-auto size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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
    <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
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
              <Icons.spinner className="size-6 animate-spin text-primary" />
            ) : creation.status === "QUEUED" ? (
              <Icons.help className="size-6 text-chart-3" />
            ) : creation.status === "FAILED" ? (
              <Icons.warning className="size-6 text-destructive" />
            ) : (
              <Icons.media className="size-6" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{previewLabel}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {creationDateFormatter.format(creation.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
        <span
          className={cn("size-2 shrink-0 rounded-full", statusDot[creation.status])}
          aria-hidden
        />
        {statusLabels[creation.status]}
      </div>

      <Link href={creationHref} className="sm:ml-2">
        <Button variant="outline" size="sm" className="h-10 rounded-full">
          {creation.status === "DONE" ? "Open" : "Track"}
        </Button>
      </Link>
    </div>
  );
}
