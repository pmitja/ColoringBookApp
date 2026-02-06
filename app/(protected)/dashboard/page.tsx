import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
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
  title: "Dashboard – Coloring Book Creator",
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

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Fetch actual user creations from database
  const recentCreations = await prisma.imageJob.findMany({
    where: {
      userId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6, // Show 6 most recent creations on dashboard
  });

  // Mock data - in real app, fetch from database
  const creditsUsed = (user as any)?.creditsUsed || 0;
  const creditsAllocated = (user as any)?.creditsAllocated || 3;

  const creditsRemaining = creditsAllocated - creditsUsed;
  const progressPercentage = (creditsUsed / creditsAllocated) * 100;

  return (
    <>
      <DashboardHeader
        heading="Create Coloring Books"
        text="Turn family photos into coloring pages kids can’t wait to color."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="relative overflow-hidden border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,164,0.15),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.15),_transparent_55%)]" />
          <CardHeader className="relative z-10 space-y-3 pb-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/70 bg-slate-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-muted-foreground">
              New Project
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Start with a photo
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Upload one family photo and we’ll turn it into a clean, printable
              coloring page.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            {creditsRemaining > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/upload">
                  <Button size="lg" className="gap-2 rounded-2xl">
                    <Icons.media className="h-4 w-4" />
                    Choose Photo
                  </Button>
                </Link>
                <span className="text-xs text-muted-foreground">
                  {creditsRemaining} credits left this month
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You’ve used all your free credits this month.
                </p>
                <Link href="/dashboard/billing">
                  <Button size="lg" variant="outline" className="gap-2 rounded-2xl">
                    <Icons.billing className="h-4 w-4" />
                    Get More Credits
                  </Button>
                </Link>
              </div>
            )}

            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-semibold dark:bg-white/10">
                  1
                </span>
                Upload photo
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-semibold dark:bg-white/10">
                  2
                </span>
                Pick pages
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-semibold dark:bg-white/10">
                  3
                </span>
                Print & color
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Credits</span>
              <Badge variant={creditsRemaining > 0 ? "default" : "destructive"}>
                {creditsRemaining} left
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {creditsUsed} of {creditsAllocated} used this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5">
              {creditsRemaining > 0
                ? `You can create ${creditsRemaining} more books this month.`
                : "Credits reset next month."}
            </div>
            {creditsRemaining <= 1 && (
              <Link href="/dashboard/billing">
                <Button variant="outline" size="sm" className="w-full rounded-xl">
                  Upgrade for unlimited
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Your Creations</h2>
            <p className="text-xs text-muted-foreground">
              Recent pages you can open, edit, or print.
            </p>
          </div>
          {recentCreations.length > 0 && (
            <Link href="/creations">
              <Button variant="ghost" size="sm" className="rounded-xl">
                View all
                <Icons.arrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {recentCreations.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="media" />
            <EmptyPlaceholder.Title>
              No coloring books yet
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Upload your first family photo to create a magical coloring book.
            </EmptyPlaceholder.Description>
            <Link href="/upload">
              <Button className="rounded-xl">Upload First Photo</Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentCreations.map((creation) => (
              <CreationCard key={creation.id} creation={creation} />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-8 border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icons.help className="h-5 w-5 text-primary" />
            Tips for the best pages
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Simple tweaks can make the line art look extra clean.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use photos with clear faces and good lighting.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              1–4 people in the frame gives the best detail.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Simple backgrounds create cleaner line art.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Your files stay private and are not stored.
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    <Card className="overflow-hidden border-slate-200/70 bg-white/80 transition hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-white/5">
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
                <Icons.spinner className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              ) : creation.status === "QUEUED" ? (
                <Icons.help className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              ) : creation.status === "FAILED" ? (
                <Icons.warning className="mx-auto mb-2 h-8 w-8 text-red-500" />
              ) : (
                <Icons.media className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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

        {/* Status Badge */}
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
            <Button size="sm" className="h-8 w-full rounded-xl text-xs">
              {creation.status === "DONE" ? "View Results" : "View Details"}
            </Button>
          </Link>
          {creation.status === "DONE" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl px-2"
            >
              <Icons.arrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
