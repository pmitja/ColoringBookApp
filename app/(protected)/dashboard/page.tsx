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
        text="Transform your family photos into magical coloring adventures."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Card */}
        <Card className="border-2 border-dashed transition-colors hover:border-primary/50 md:col-span-2">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Icons.media className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">Upload Your Photo</CardTitle>
            <CardDescription>
              Drag & drop a family photo or click to browse. We'll create a
              beautiful coloring page!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {creditsRemaining > 0 ? (
              <Link href="/upload">
                <Button size="lg" className="gap-2">
                  <Icons.media className="h-4 w-4" />
                  Choose Photo
                </Button>
              </Link>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You've used all your free credits this month
                </p>
                <Link href="/dashboard/billing">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Icons.billing className="h-4 w-4" />
                    Get More Credits
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credits Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Credits</span>
              <Badge variant={creditsRemaining > 0 ? "default" : "destructive"}>
                {creditsRemaining} left
              </Badge>
            </CardTitle>
            <CardDescription>
              {creditsUsed} of {creditsAllocated} used this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {creditsRemaining > 0
                ? `Create ${creditsRemaining} more coloring books`
                : "Credits reset next month"}
            </div>
            {creditsRemaining <= 1 && (
              <Link href="/dashboard/billing">
                <Button variant="outline" size="sm" className="w-full">
                  Upgrade for unlimited
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Creations */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Creations</h2>
          {recentCreations.length > 0 && (
            <Link href="/creations">
              <Button variant="ghost" size="sm">
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
              <Button>Upload First Photo</Button>
            </Link>
          </EmptyPlaceholder>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentCreations.map((creation) => (
              <CreationCard key={creation.id} creation={creation} />
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <Card className="mt-8 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Icons.help className="h-5 w-5" />
            Tips for Best Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Use high-resolution photos with clear faces and good lighting
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Photos with 1-4 people work best for detailed coloring pages
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Avoid photos with busy backgrounds for cleaner line art
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Your photos are processed instantly and never stored on our
              servers
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
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
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

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-medium">
              {creation.inputFileName.replace(/\.[^/.]+$/, "")}
            </CardTitle>
            <CardDescription className="text-xs">
              {formatDate(creation.createdAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Link href={getCardLink()} className="flex-1">
            <Button size="sm" className="w-full">
              {creation.status === "DONE" ? "View Results" : "View Details"}
            </Button>
          </Link>
          {creation.status === "DONE" && (
            <Button size="sm" variant="outline">
              <Icons.arrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
