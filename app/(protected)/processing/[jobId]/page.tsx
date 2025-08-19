"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Icons } from "@/components/shared/icons";

type JobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

interface JobData {
  id: string;
  status: JobStatus;
  inputFileName: string;
  cartoonUrl?: string;
  lineartUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  currentStage?: "styling" | "lineart";
  progress?: number;
}

interface ProcessingPageProps {
  params: {
    jobId: string;
  };
}

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const router = useRouter();
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${params.jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data: JobData = await response.json();
        setJobData(data);
        setIsLoading(false);

        // If job is complete, redirect to results
        if (data.status === "DONE") {
          setTimeout(() => {
            router.push(`/results/${params.jobId}`);
          }, 2000);
        }

        // If job failed, stop polling
        if (data.status === "FAILED") {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error fetching job status:", err);
        setError("Failed to load job status");
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Poll every 3 seconds for updates
    pollInterval = setInterval(fetchJobStatus, 3000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [params.jobId, router]);

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "QUEUED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "DONE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getProgressValue = () => {
    if (!jobData) return 0;

    switch (jobData.status) {
      case "QUEUED":
        return 0;
      case "PROCESSING":
        if (jobData.currentStage === "styling") return 40;
        if (jobData.currentStage === "lineart") return 80;
        return jobData.progress || 20;
      case "DONE":
        return 100;
      case "FAILED":
        return 0;
      default:
        return 0;
    }
  };

  const getCurrentStageText = () => {
    if (!jobData) return "";

    switch (jobData.status) {
      case "QUEUED":
        return "Your image is in the processing queue...";
      case "PROCESSING":
        if (jobData.currentStage === "styling")
          return "Applying artistic style...";
        if (jobData.currentStage === "lineart")
          return "Generating coloring book line art...";
        return "Processing your image...";
      case "DONE":
        return "Complete! Redirecting to your coloring book...";
      case "FAILED":
        return "Processing failed. Please try again.";
      default:
        return "";
    }
  };

  const getEstimatedTime = () => {
    if (!jobData) return "";

    switch (jobData.status) {
      case "QUEUED":
        return "Estimated: 2-3 minutes";
      case "PROCESSING":
        if (jobData.currentStage === "styling")
          return "Estimated: 1-2 minutes remaining";
        if (jobData.currentStage === "lineart")
          return "Estimated: 30-60 seconds remaining";
        return "Estimated: 1-2 minutes remaining";
      case "DONE":
        return "Complete!";
      case "FAILED":
        return "";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          heading="Processing Your Photo"
          text="Creating your magical coloring book..."
        />
        <div className="flex justify-center">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error || !jobData) {
    return (
      <>
        <DashboardHeader
          heading="Processing Error"
          text="Something went wrong while processing your photo."
        />
        <div className="mx-auto max-w-2xl">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <Icons.warning className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-400">
              {error || "Job not found"}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        heading="Processing Your Photo"
        text={`Creating coloring book from: ${jobData.inputFileName}`}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Processing Status</CardTitle>
              <Badge
                className={cn("px-3 py-1", getStatusColor(jobData.status))}
              >
                {jobData.status}
              </Badge>
            </div>
            <CardDescription>{getCurrentStageText()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(getProgressValue())}%</span>
              </div>
              <Progress value={getProgressValue()} className="h-3" />
              {getEstimatedTime() && (
                <p className="text-center text-sm text-muted-foreground">
                  {getEstimatedTime()}
                </p>
              )}
            </div>

            {/* Processing Stages */}
            <div className="space-y-4">
              <h3 className="font-medium">Processing Stages</h3>

              {/* Stage 1: Artistic Style */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    jobData.status === "DONE" ||
                      (jobData.status === "PROCESSING" &&
                        jobData.currentStage === "lineart")
                      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : jobData.status === "PROCESSING" &&
                          jobData.currentStage === "styling"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
                  )}
                >
                  {jobData.status === "DONE" ||
                  (jobData.status === "PROCESSING" &&
                    jobData.currentStage === "lineart") ? (
                    <Icons.check className="h-4 w-4" />
                  ) : jobData.status === "PROCESSING" &&
                    jobData.currentStage === "styling" ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-medium">1</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">Apply Artistic Style</p>
                  <p className="text-sm text-muted-foreground">
                    Transforming your photo with your chosen art style
                  </p>
                </div>
              </div>

              {/* Stage 2: Line Art */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    jobData.status === "DONE"
                      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : jobData.status === "PROCESSING" &&
                          jobData.currentStage === "lineart"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
                  )}
                >
                  {jobData.status === "DONE" ? (
                    <Icons.check className="h-4 w-4" />
                  ) : jobData.status === "PROCESSING" &&
                    jobData.currentStage === "lineart" ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-medium">2</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">Generate Line Art</p>
                  <p className="text-sm text-muted-foreground">
                    Creating black & white coloring book outlines
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {jobData.status === "FAILED" && jobData.errorMessage && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <Icons.warning className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-400">
                  <strong>Error:</strong> {jobData.errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              {jobData.status === "FAILED" ? (
                <>
                  <Link href="/upload" className="flex-1">
                    <Button className="w-full">Try Again</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                </>
              ) : jobData.status === "DONE" ? (
                <Link href={`/results/${params.jobId}`} className="flex-1">
                  <Button className="w-full gap-2">
                    <Icons.arrowRight className="h-4 w-4" />
                    View Results
                  </Button>
                </Link>
              ) : (
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">
                    You can safely close this page and return later
                  </p>
                  <Link href="/dashboard" className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fun Animation/Message */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 text-4xl">
              {jobData.status === "PROCESSING" &&
                jobData.currentStage === "styling" &&
                "🎨"}
              {jobData.status === "PROCESSING" &&
                jobData.currentStage === "lineart" &&
                "✏️"}
              {jobData.status === "QUEUED" && "⏳"}
              {jobData.status === "DONE" && "🎉"}
              {jobData.status === "FAILED" && "😔"}
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-300">
              {jobData.status === "PROCESSING" &&
                "Magic is happening! Our AI artists are hard at work creating your personalized coloring book."}
              {jobData.status === "QUEUED" &&
                "Your image is in line for processing. Thank you for your patience!"}
              {jobData.status === "DONE" &&
                "Your magical coloring book is ready! Time to grab some crayons and start coloring."}
              {jobData.status === "FAILED" &&
                "Oops! Something went wrong. Don't worry, you can try again with a different photo."}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
