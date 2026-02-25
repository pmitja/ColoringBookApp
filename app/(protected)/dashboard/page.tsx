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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900 dark:text-slate-50">Dashboard</h1>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
            A clean overview of usage, generation status, and recent pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/upload">
            <Button className="gap-2 rounded-full px-6 py-5 bg-emerald-400 text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all font-bold">
              <Icons.media className="size-5" />
              New from Photo
            </Button>
          </Link>
          <Link href="/ai-generator">
            <Button className="rounded-full px-6 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-2 border-slate-900 dark:border-slate-600 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all font-bold hover:bg-slate-50 dark:hover:bg-slate-700">
              New from Prompt
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20 border-b-4 border-slate-900 dark:border-slate-700 p-6">
            <CardTitle className="font-heading text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              Monthly Generations
            </CardTitle>
            <CardDescription className="font-medium text-slate-600 dark:text-slate-400">
              Current plan: {planLimits.planTitle}. Usage resets each month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                {displayGenerationsUsed} of {generationsAllocated} used
              </p>
              <div className={cn(
                "rounded-full px-4 py-1 text-sm font-black border-2 border-slate-900 shadow-sm",
                generationsRemaining > 0 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-slate-900 dark:border-slate-600" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-slate-900 dark:border-slate-600"
              )}>
                {generationsRemaining} left
              </div>
            </div>

            <div className="relative h-6 w-full overflow-hidden rounded-full border-2 border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
               <div 
                  className="h-full bg-amber-500 transition-all duration-500 ease-out border-r-2 border-slate-900 dark:border-slate-950"
                  style={{ width: `${progressPercentage}%` }}
               />
            </div>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {generationsRemaining > 0
                ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month.`
                : "You reached your current limit. Upgrade to continue generating."}
            </p>

            {overLimitCount > 0 ? (
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg border border-orange-200 dark:border-orange-800">
                {overLimitCount} additional generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month.
              </p>
            ) : null}

            {generationsRemaining <= 1 ? (
              <Link href="/dashboard/billing" className="inline-flex">
                <Button className="rounded-full border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:translate-y-[1px] hover:shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                  Manage Plan
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b-4 border-slate-900 dark:border-slate-700 p-6">
            <CardTitle className="font-heading text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              Quick Actions
            </CardTitle>
            <CardDescription className="font-medium text-slate-600 dark:text-slate-400">
              Start your next page in one click.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            <QuickActionLink
              href="/upload"
              icon={<Icons.media className="size-5" />}
              title="Upload a Photo"
              description="Generate line art from an image"
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-slate-900 dark:border-slate-600"
            />
            <QuickActionLink
              href="/ai-generator"
              icon={<Icons.add className="size-5" />}
              title="Create from Prompt"
              description="Generate directly from text"
              color="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-slate-900 dark:border-slate-600"
            />
            <QuickActionLink
              href="/creations"
              icon={<Icons.bookOpen className="size-5" />}
              title="Open Creations"
              description="Review and manage saved pages"
              color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-slate-900 dark:border-slate-600"
            />
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Pages"
          value={totalCreations}
          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-slate-700"
          icon={<Icons.bookOpen className="size-6 text-indigo-700 dark:text-indigo-400" />}
        />
        <MetricCard
          label="Ready"
          value={statusCount["DONE"] ?? 0}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-slate-700"
          icon={<Icons.download className="size-6 text-emerald-700 dark:text-emerald-400" />}
        />
        <MetricCard
          label="In Progress"
          value={processingCount}
          color="bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-slate-700"
          icon={<Icons.spinner className="size-6 text-sky-700 dark:text-sky-400 animate-spin" />}
        />
        <MetricCard
          label="Failed"
          value={statusCount["FAILED"] ?? 0}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-slate-700"
          icon={<Icons.warning className="size-6 text-orange-700 dark:text-orange-400" />}
        />
      </section>

      <section className="mt-10 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-extrabold text-slate-900 dark:text-slate-50">Recent Creations</h2>
            <p className="mt-2 text-base font-medium text-slate-600 dark:text-slate-400">
              Latest generated pages and current status.
            </p>
          </div>
          {recentCreations.length > 0 ? (
            <Link href="/creations">
              <Button className="rounded-full font-bold text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" variant="ghost">
                View all
                <Icons.arrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : null}
        </div>

        {recentCreations.length === 0 ? (
          <div className="rounded-[2rem] border-4 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-12 text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-600 mb-6">
               <Icons.media className="size-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">No pages yet</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-sm mx-auto">
              Upload your first photo to generate a clean printable page.
            </p>
            <Link href="/upload">
              <Button className="rounded-full px-8 py-6 bg-yellow-400 text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all font-bold text-lg">
                 Upload first photo
              </Button>
            </Link>
          </div>
        ) : (
          <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
            <CardContent className="p-0">
              <ul className="divide-y-2 divide-slate-100 dark:divide-slate-700">
                {recentCreations.map((creation) => (
                  <li key={creation.id} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]">
      <div className={cn("absolute top-0 right-0 p-4 rounded-bl-[2rem] border-b-4 border-l-4 border-slate-900 dark:border-slate-700", color)}>
         {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          {label}
        </p>
        <p className="font-heading text-5xl font-extrabold text-slate-900 dark:text-slate-50">{value}</p>
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3", color)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </span>
        <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </span>
      <Icons.arrowRight className="ml-auto size-5 text-slate-300 dark:text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-slate-900 dark:group-hover:text-slate-50" />
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

  const statusColors = {
     DONE: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
     PROCESSING: "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
     QUEUED: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
     FAILED: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  };

  return (
    <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800">
        {creation.status === "DONE" && creation.lineartUrl ? (
          <Image
            src={creation.lineartUrl}
            alt={`Line art preview for ${previewLabel}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-400">
            {creation.status === "PROCESSING" ? (
              <Icons.spinner className="size-6 animate-spin text-blue-500" />
            ) : creation.status === "QUEUED" ? (
              <Icons.help className="size-6 text-amber-500" />
            ) : creation.status === "FAILED" ? (
              <Icons.warning className="size-6 text-rose-500" />
            ) : (
              <Icons.media className="size-6" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
          {previewLabel}
        </p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {creationDateFormatter.format(creation.createdAt)}
        </p>
      </div>

      <div className={cn(
          "rounded-full border-2 px-3 py-1 text-xs font-black uppercase tracking-wider",
          statusColors[creation.status] || "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        )}
      >
        {statusLabels[creation.status]}
      </div>

      <Link href={creationHref} className="sm:ml-2">
        <Button className="rounded-full border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm hover:shadow-md transition-all h-10 px-5">
          {creation.status === "DONE" ? "Open" : "Track"}
        </Button>
      </Link>
    </div>
  );
}
