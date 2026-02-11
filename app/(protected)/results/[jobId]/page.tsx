"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

interface JobData {
  id: string;
  status: "DONE" | "FAILED";
  inputFileName: string;
  cartoonUrl?: string; // This will store the styled version URL
  lineartUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResultsPageProps {
  params: {
    jobId: string;
  };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const fetchBlob = async (url: string, errorMessage: string) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(errorMessage);
    }
    return response.blob();
  };

  const copyShareLink = async () => {
    if (!jobData?.lineartUrl) return;
    try {
      await navigator.clipboard.writeText(jobData.lineartUrl);
      // Show success toast
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await fetch(`/api/jobs/${params.jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job data");
        }

        const data: JobData = await response.json();
        setJobData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching job data:", err);
        setError("Failed to load results");
        setIsLoading(false);
      }
    };

    fetchJobData();
  }, [params.jobId]);

  const handleDownload = async (format: "png" | "pdf" = "png") => {
    if (!jobData?.lineartUrl) return;

    setDownloading(`lineart-${format}`);

    try {
      const fileBaseName =
        jobData.inputFileName.split(".")[0] || "coloring-page";

      if (format === "png") {
        const imageBlob = await fetchBlob(
          `/api/download/lineart/${params.jobId}`,
          "Failed to fetch line art",
        );
        downloadBlob(imageBlob, `${fileBaseName}-coloring-page.png`);
        return;
      }

      const pdfBlob = await fetchBlob(
        `/api/download/lineart-pdf/${params.jobId}`,
        "Failed to generate PDF",
      );
      downloadBlob(pdfBlob, `${fileBaseName}-coloring-page.pdf`);
    } catch (err) {
      console.error("Download error:", err);
      // Show error toast
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async () => {
    if (!jobData?.lineartUrl) return;

    if (navigator.share) {
      try {
        const fileBaseName =
          jobData.inputFileName.split(".")[0] || "coloring-page";
        const pdfBlob = await fetchBlob(
          `/api/download/lineart-pdf/${params.jobId}`,
          "Failed to generate PDF",
        );
        const pdfFile = new File(
          [pdfBlob],
          `${fileBaseName}-coloring-page.pdf`,
          { type: "application/pdf" },
        );

        if (navigator.canShare && !navigator.canShare({ files: [pdfFile] })) {
          throw new Error("File sharing not supported");
        }

        await navigator.share({
          title: "My Coloring Book Page",
          text: "Check out this amazing coloring book page created from my photo!",
          files: [pdfFile],
        });
        return;
      } catch (err) {
        console.error("Share error:", err);
      }
    }

    await copyShareLink();
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          heading="Loading Results"
          text="Fetching your coloring book..."
        />
        <div className="flex justify-center">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error || !jobData || jobData.status !== "DONE") {
    return (
      <>
        <DashboardHeader
          heading="Results Not Available"
          text="Unable to load your coloring book results."
        />
        <div className="mx-auto max-w-2xl">
          <Alert className="border-rose-400/30 bg-rose-500/10 text-rose-800 dark:text-rose-100">
            <Icons.warning className="h-4 w-4 text-rose-500 dark:text-rose-200" />
            <AlertDescription className="text-rose-700 dark:text-rose-50">
              {error ||
                jobData?.errorMessage ||
                "Results not found or job not completed"}
            </AlertDescription>
          </Alert>
          <div className="mt-6 space-x-4 text-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline">Upload New Photo</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const createdDate = new Date(jobData.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const normalizedInputFileName = jobData.inputFileName.toLowerCase();
  const isPromptGeneratedJob =
    normalizedInputFileName.startsWith("ai-generator-") ||
    normalizedInputFileName.startsWith("consistent-character-");
  const consistentGeneratorHref = `/ai-generator?mode=consistent&referenceJobId=${encodeURIComponent(
    jobData.id,
  )}`;

  return (
    <>
      <DashboardHeader
        heading="Your Coloring Book is Ready!"
        text={`Created from: ${jobData.inputFileName}`}
      />

      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        {/* Success Message */}
        <Alert className="border-emerald-400/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100">
          <Icons.check className="h-4 w-4 text-emerald-500 dark:text-emerald-200" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-50">
            <strong>Success!</strong> Your coloring book page has been created
            and is ready to download!
          </AlertDescription>
        </Alert>

        {/* Coloring Page Result */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icons.media className="h-5 w-5" />
                  Your Coloring Book Page
                </CardTitle>
                <CardDescription>
                  Black & white line art perfect for coloring
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-400/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100"
              >
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Display */}
            {jobData.lineartUrl && (
              <div className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-white/10">
                <Image
                  src={jobData.lineartUrl}
                  alt="Coloring page line art"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}

            {/* Download Options */}
            <div className="space-y-4">
              <h3 className="font-medium">Download Options</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button
                  onClick={() => handleDownload("png")}
                  disabled={downloading === "lineart-png"}
                  className="gap-2"
                >
                  {downloading === "lineart-png" ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.package className="h-4 w-4" />
                  )}
                  Download PNG (High-res)
                </Button>
                <Button
                  onClick={() => handleDownload("pdf")}
                  disabled={downloading === "lineart-pdf"}
                  variant="outline"
                  className="gap-2 border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                >
                  {downloading === "lineart-pdf" ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.page className="h-4 w-4" />
                  )}
                  Download PDF (Print)
                </Button>
              </div>
            </div>

            {/* Share */}
            <div className="flex justify-start">
              <Button
                onClick={handleShare}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Icons.arrowUpRight className="h-4 w-4" />
                Share Coloring Page
              </Button>
            </div>

            {isPromptGeneratedJob ? (
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/40">
                <p className="text-sm font-medium">
                  Keep this character and generate new scenes
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll open Consistent Characters with this result already
                  added as the reference image.
                </p>
                <Link href={consistentGeneratorHref}>
                  <Button className="mt-3 gap-2">
                    <Icons.arrowRight className="h-4 w-4" />
                    Continue with this character
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="text-sm text-muted-foreground">
                <p>Created on {createdDate}</p>
                <p>Processing time: ~2 minutes</p>
              </div>
              <div className="flex gap-2">
                <Link href="/upload">
                  <Button className="gap-2">
                    <Icons.media className="h-4 w-4" />
                    Create Another
                  </Button>
                </Link>
                <Link href="/creations">
                  <Button
                    variant="outline"
                    className="gap-2 border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                  >
                    <Icons.bookOpen className="h-4 w-4" />
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coloring Tips */}
        <Card className="border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-50">
              <Icons.help className="h-5 w-5" />
              Coloring Tips for Kids
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-800 dark:text-amber-100">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-300">🖍️</span>
                  Start with light colors and build up darker ones
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-300">🎨</span>
                  Try different coloring tools: crayons, markers, colored
                  pencils
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-300">✨</span>
                  Don&apos;t worry about staying in the lines - creativity is
                  key!
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-300">👨‍👩‍👧‍👦</span>
                  Make it a family activity - color together!
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
