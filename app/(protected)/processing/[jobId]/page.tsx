"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  errorMessage?: string;
  currentStage?: "styling" | "cartoon" | "lineart";
  progress?: number;
}

interface ProcessingPageProps {
  params: {
    jobId: string;
  };
}

const statusText: Record<JobStatus, string> = {
  QUEUED: "Queued",
  PROCESSING: "Processing",
  DONE: "Done",
  FAILED: "Failed",
};

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const router = useRouter();
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const fetchJobStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${params.jobId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data: JobData = await response.json();
        setJobData(data);
        setIsLoading(false);

        if (data.status === "DONE") {
          setTimeout(() => {
            router.push(`/results/${params.jobId}`);
          }, 1600);
        }

        if (data.status === "FAILED") {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error fetching job status:", err);
        setError("Failed to load job status.");
        setIsLoading(false);
      }
    };

    void fetchJobStatus();
    pollInterval = setInterval(fetchJobStatus, 2500);

    return () => {
      clearInterval(pollInterval);
    };
  }, [params.jobId, router]);

  const progressValue = useMemo(() => {
    if (!jobData) return 0;

    if (jobData.status === "QUEUED") return 10;
    if (jobData.status === "DONE") return 100;
    if (jobData.status === "FAILED") return 0;

    if (jobData.currentStage === "styling" || jobData.currentStage === "cartoon")
      return 45;
    if (jobData.currentStage === "lineart") return 82;
    return jobData.progress ?? 25;
  }, [jobData]);

  const stageText = useMemo(() => {
    if (!jobData) return "";

    if (jobData.status === "QUEUED") return "Your job is waiting in queue.";
    if (jobData.status === "DONE") return "Generation complete. Redirecting…";
    if (jobData.status === "FAILED") return "Generation failed.";

    if (jobData.currentStage === "styling" || jobData.currentStage === "cartoon") {
      return "Generating the base image.";
    }
    if (jobData.currentStage === "lineart") {
      return "Converting generated image into printable line art.";
    }
    return "Processing your image.";
  }, [jobData]);

  const estimatedTimeLabel = useMemo(() => {
    if (!jobData) return "";
    if (jobData.status === "DONE") return "Complete";
    if (jobData.status === "FAILED") return "No estimate available";
    if (jobData.status === "QUEUED") return "Usually starts within 1 minute";
    if (jobData.currentStage === "styling" || jobData.currentStage === "cartoon")
      return "About 20-40 seconds left";
    if (jobData.currentStage === "lineart") return "Finalizing output";
    return "Less than 1 minute remaining";
  }, [jobData]);

  const queueDone = jobData ? jobData.status !== "QUEUED" : false;
  const stylingActive =
    jobData?.status === "PROCESSING" &&
    (jobData.currentStage === "styling" || jobData.currentStage === "cartoon");
  const stylingDone =
    jobData?.status === "DONE" || jobData?.currentStage === "lineart";
  const lineartActive =
    jobData?.status === "PROCESSING" && jobData.currentStage === "lineart";
  const lineartDone = jobData?.status === "DONE";

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          heading="Processing"
          text="Preparing your coloring page."
        />
        <div className="flex justify-center">
          <Icons.spinner className="size-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error || !jobData) {
    return (
      <>
        <DashboardHeader
          heading="Processing Error"
          text="Could not load generation status."
        />
        <div className="mx-auto max-w-2xl space-y-4">
          <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
            <Icons.warning className="size-4" />
            <AlertDescription>{error || "Job not found."}</AlertDescription>
          </Alert>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        heading="Processing"
        text={`Generating from ${jobData.inputFileName}`}
      />

      <div className="mx-auto max-w-2xl space-y-6 pb-10">
        <Card className="border-border/80 bg-card/95 rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-xl">Job Status</CardTitle>
              <Badge
                variant={
                  jobData.status === "FAILED" ? "destructive" : "secondary"
                }
                className="rounded-full"
              >
                {statusText[jobData.status]}
              </Badge>
            </div>
            <CardDescription>{stageText}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
              <div className="border-border/70 bg-background/60 rounded-2xl border p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Progress
                </p>
                <p className="font-heading mt-2 text-4xl leading-none">
                  {Math.round(progressValue)}%
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {statusText[jobData.status]}
                </p>
              </div>

              <div className="border-border/70 bg-background/60 space-y-3 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Overall progress</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  Estimated: {estimatedTimeLabel}
                </p>
                {jobData.status !== "DONE" && jobData.status !== "FAILED" ? (
                  <p className="text-xs text-muted-foreground">
                    Keep this page open. You&apos;ll be redirected when output
                    is ready.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <StageRow
                label="Queue job"
                description="Waiting for an available processing slot."
                active={jobData.status === "QUEUED"}
                done={queueDone}
              />
              <StageRow
                label="Generate base image"
                description="Creates the base illustration from your prompt or reference."
                active={stylingActive}
                done={stylingDone}
              />
              <StageRow
                label="Generate line art"
                description="Creates printable black-and-white outlines."
                active={lineartActive}
                done={lineartDone}
              />
            </div>

            {jobData.status === "FAILED" && jobData.errorMessage ? (
              <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
                <Icons.warning className="size-4" />
                <AlertDescription>{jobData.errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {jobData.status === "FAILED" ? (
                <>
                  <Link href="/upload">
                    <Button>Try Again</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Back to Dashboard</Button>
                  </Link>
                </>
              ) : jobData.status === "DONE" ? (
                <Link href={`/results/${params.jobId}`}>
                  <Button className="gap-2">
                    <Icons.arrowRight className="size-4" />
                    View Results
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StageRow({
  label,
  description,
  active,
  done,
}: {
  label: string;
  description: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="border-border/70 bg-background/60 flex items-center gap-3 rounded-2xl border p-3">
      <span className="border-border/80 flex size-8 items-center justify-center rounded-full border">
        {done ? (
          <Icons.check className="size-4 text-emerald-600" />
        ) : active ? (
          <Icons.spinner className="size-4 animate-spin text-primary" />
        ) : (
          <span className="bg-muted-foreground/50 size-2 rounded-full" />
        )}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
