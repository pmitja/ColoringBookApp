"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Wand2, Image as ImageIcon, Sparkles, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";

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
import { cn } from "@/lib/utils";

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
  DONE: "Ready!",
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative flex size-24 items-center justify-center rounded-[2rem] bg-primary/10 shadow-sm border-2 border-primary/20">
          <div className="absolute inset-0 rounded-[2rem] border-4 border-primary/30 border-t-primary animate-spin" />
          <Wand2 className="size-10 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl">Locating Job...</h2>
          <p className="text-muted-foreground font-medium">Checking the status of your generation.</p>
        </div>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto text-center">
        <div className="flex size-24 items-center justify-center rounded-[2rem] bg-destructive/10 shadow-sm border-2 border-destructive/20">
          <AlertTriangle className="size-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl">Processing Error</h2>
          <p className="text-muted-foreground font-medium">{error || "Job not found or no longer exists."}</p>
        </div>
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button className="w-full gap-2 rounded-xl py-6 px-8 text-base font-bold shadow-md">
            <ArrowLeft className="size-5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-10">
      <div className="text-center space-y-3 pt-4 sm:pt-8">
        <h1 className="font-heading text-3xl sm:text-4xl">Creating Magic</h1>
        <p className="text-base font-medium text-muted-foreground max-w-lg mx-auto">
          Generating from <span className="font-bold text-foreground">{jobData.inputFileName}</span>
        </p>
      </div>

      <Card className={cn(
        "playful-card overflow-hidden transition-all duration-500",
        jobData.status === "DONE" ? "border-emerald-500/50 shadow-emerald-500/10 ring-4 ring-emerald-500/10" : 
        jobData.status === "FAILED" ? "border-destructive/50 shadow-destructive/10 ring-4 ring-destructive/10" :
        "border-primary/50 shadow-primary/10 ring-4 ring-primary/10"
      )}>
        <CardHeader className={cn(
          "relative z-10 space-y-4 border-b border-border/50 pb-6 transition-colors duration-500",
          jobData.status === "DONE" ? "bg-emerald-500/5" : 
          jobData.status === "FAILED" ? "bg-destructive/5" :
          "bg-primary/5"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-xl p-2.5 ring-1",
                jobData.status === "DONE" ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" : 
                jobData.status === "FAILED" ? "bg-destructive/10 text-destructive ring-destructive/20" :
                "bg-primary/10 text-primary ring-primary/20"
              )}>
                {jobData.status === "DONE" ? <Sparkles className="size-6" /> :
                 jobData.status === "FAILED" ? <AlertTriangle className="size-6" /> :
                 <Loader2 className="size-6 animate-spin" />}
              </div>
              <div>
                <CardTitle className="font-heading text-2xl">Job Status</CardTitle>
                <CardDescription className="text-sm font-medium mt-1">
                  {stageText}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={jobData.status === "FAILED" ? "destructive" : "default"}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold shadow-sm",
                jobData.status === "PROCESSING" && "bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/20 border-0",
                jobData.status === "DONE" && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20 border-0"
              )}
            >
              {jobData.status === "PROCESSING" && <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>}
              {statusText[jobData.status]}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 p-6 sm:p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Overall Progress</span>
              <span className={cn(
                "text-lg",
                jobData.status === "DONE" ? "text-emerald-600" : "text-primary"
              )}>{Math.round(progressValue)}%</span>
            </div>
            
            <div className="relative pt-2">
              <Progress 
                value={progressValue} 
                className={cn(
                  "h-4 rounded-full shadow-inner bg-muted/60",
                  jobData.status === "PROCESSING" && "animate-pulse",
                  jobData.status === "DONE" && "[&>div]:bg-emerald-500",
                  jobData.status === "FAILED" && "[&>div]:bg-destructive"
                )} 
              />
            </div>
            
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
              <span className="flex items-center gap-1.5">
                <Icons.clock className="size-3.5" />
                Estimated: {estimatedTimeLabel}
              </span>
              {jobData.status !== "DONE" && jobData.status !== "FAILED" && (
                <span className="animate-pulse text-primary">Do not close this page</span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-border/50 border-dashed">
            <StageRow
              label="Queue Job"
              description="Waiting for an available processing slot."
              active={jobData.status === "QUEUED"}
              done={queueDone}
              failed={jobData.status === "FAILED" && !queueDone}
            />
            <StageRow
              label="Generate Base Image"
              description="Creates the base illustration from your prompt or reference."
              active={stylingActive}
              done={stylingDone}
              failed={jobData.status === "FAILED" && queueDone && !stylingDone}
            />
            <StageRow
              label="Generate Line Art"
              description="Creates printable black-and-white outlines."
              active={lineartActive}
              done={lineartDone}
              failed={jobData.status === "FAILED" && stylingDone && !lineartDone}
            />
          </div>

          {jobData.status === "FAILED" && jobData.errorMessage ? (
            <Alert className="border-destructive/20 bg-destructive/10 text-destructive rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="size-5 mt-0.5 shrink-0" />
              <AlertDescription className="font-bold leading-tight">{jobData.errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-4">
            {jobData.status === "FAILED" ? (
              <>
                <Link href="/upload" className="flex-1 sm:flex-none">
                  <Button className="w-full gap-2 rounded-xl py-6 px-6 text-base font-bold shadow-md">
                    <Icons.refresh className="size-5" />
                    Try Again
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full gap-2 rounded-xl py-6 px-6 text-base font-bold border-2">
                    Back to Dashboard
                  </Button>
                </Link>
              </>
            ) : jobData.status === "DONE" ? (
              <Link href={`/results/${params.jobId}`} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button className="w-full gap-2 rounded-2xl py-7 text-xl font-bold shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  <Sparkles className="size-6" />
                  View Results
                  <ArrowRight className="size-6 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard" className="w-full">
                <Button variant="ghost" className="w-full gap-2 rounded-xl py-6 text-base font-bold text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-4" />
                  Return to Dashboard (Runs in background)
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageRow({
  label,
  description,
  active,
  done,
  failed,
}: {
  label: string;
  description: string;
  active: boolean;
  done: boolean;
  failed?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-4 rounded-2xl border-2 p-4 transition-all duration-300",
      active ? "border-primary/30 bg-primary/5 shadow-sm scale-[1.01]" : 
      done ? "border-emerald-500/20 bg-emerald-500/5" :
      failed ? "border-destructive/20 bg-destructive/5" :
      "border-border/50 bg-background/50 opacity-60"
    )}>
      <div className={cn(
        "flex size-10 items-center justify-center rounded-xl shrink-0 shadow-sm border",
        active ? "bg-background border-primary/20 text-primary" :
        done ? "bg-emerald-500 text-white border-emerald-600" :
        failed ? "bg-destructive text-white border-destructive" :
        "bg-muted border-border/50 text-muted-foreground"
      )}>
        {done ? (
          <Icons.check className="size-5" />
        ) : failed ? (
          <Icons.close className="size-5" />
        ) : active ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <div className="size-2.5 rounded-full bg-current opacity-40" />
        )}
      </div>
      <div className="space-y-1">
        <p className={cn(
          "text-base font-bold leading-none",
          active ? "text-primary" :
          done ? "text-emerald-700 dark:text-emerald-400" :
          failed ? "text-destructive" :
          "text-foreground"
        )}>{label}</p>
        <p className="text-sm font-medium text-muted-foreground leading-snug">{description}</p>
      </div>
    </div>
  );
}
