"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";
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

interface JobData {
  id: string;
  status: "DONE" | "FAILED";
  inputFileName: string;
  lineartUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

interface ResultsPageProps {
  params: {
    jobId: string;
  };
}

function normalizeFileBase(fileName: string) {
  return fileName.split(".")[0] || "coloring-page";
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await fetch(`/api/jobs/${params.jobId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch job data");
        }

        const data: JobData = await response.json();
        setJobData(data);
      } catch (err) {
        console.error("Error fetching job data:", err);
        setError("Failed to load results.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchJobData();
  }, [params.jobId]);

  const createdDate = useMemo(() => {
    if (!jobData?.createdAt) return null;

    const date = new Date(jobData.createdAt);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [jobData?.createdAt]);

  const consistentGeneratorHref = useMemo(() => {
    if (!jobData) return null;

    const normalizedInputFileName = jobData.inputFileName.toLowerCase();
    const isPromptGeneratedJob =
      normalizedInputFileName.startsWith("ai-generator-") ||
      normalizedInputFileName.startsWith("consistent-character-");

    if (!isPromptGeneratedJob) return null;

    return `/ai-generator?mode=consistent&referenceJobId=${encodeURIComponent(jobData.id)}`;
  }, [jobData]);

  const fetchBlob = async (url: string, errorMessage: string) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(errorMessage);
    }
    return response.blob();
  };

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

  const handleDownload = async (format: "png" | "pdf") => {
    if (!jobData?.lineartUrl) return;

    setDownloading(format);

    try {
      const fileBaseName = normalizeFileBase(jobData.inputFileName);

      if (format === "png") {
        const imageBlob = await fetchBlob(
          `/api/download/lineart/${params.jobId}`,
          "Failed to download PNG",
        );
        downloadBlob(imageBlob, `${fileBaseName}-coloring-page.png`);
      } else {
        const pdfBlob = await fetchBlob(
          `/api/download/lineart-pdf/${params.jobId}`,
          "Failed to download PDF",
        );
        downloadBlob(pdfBlob, `${fileBaseName}-coloring-page.pdf`);
      }
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async () => {
    if (!jobData?.lineartUrl) return;

    if (navigator.share) {
      try {
        const fileBaseName = normalizeFileBase(jobData.inputFileName);
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
          title: "My Coloring Page",
          text: "A coloring page generated with Colorline AI",
          files: [pdfFile],
        });
        return;
      } catch (err) {
        console.error("Share error:", err);
      }
    }

    await navigator.clipboard.writeText(jobData.lineartUrl);
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          heading="Loading Results"
          text="Fetching your generated page."
        />
        <div className="flex justify-center">
          <Icons.spinner className="size-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error || !jobData || jobData.status !== "DONE") {
    return (
      <>
        <DashboardHeader
          heading="Results Not Available"
          text="Unable to load this generation result."
        />
        <div className="mx-auto max-w-2xl space-y-4">
          <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
            <Icons.warning className="size-4" />
            <AlertDescription>
              {error ||
                jobData?.errorMessage ||
                "Result not found or job is not completed."}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
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

  return (
    <>
      <DashboardHeader
        heading="Result Ready"
        text={`Created from: ${jobData.inputFileName}`}
      />

      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <Card className="border-border/80 bg-card/95 rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-xl">
                  Coloring Page Output
                </CardTitle>
                <CardDescription>
                  Clean line art optimized for printing.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-full">
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {jobData.lineartUrl ? (
              <div className="border-border/70 bg-background/60 relative aspect-square w-full overflow-hidden rounded-2xl border">
                <Image
                  src={jobData.lineartUrl}
                  alt="Coloring page line art"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button
                onClick={() => handleDownload("png")}
                disabled={downloading === "png"}
                className="gap-2"
              >
                {downloading === "png" ? (
                  <Icons.spinner className="size-4 animate-spin" />
                ) : (
                  <Icons.package className="size-4" />
                )}
                Download PNG
              </Button>
              <Button
                onClick={() => handleDownload("pdf")}
                disabled={downloading === "pdf"}
                variant="outline"
                className="gap-2"
              >
                {downloading === "pdf" ? (
                  <Icons.spinner className="size-4 animate-spin" />
                ) : (
                  <Icons.page className="size-4" />
                )}
                Download PDF
              </Button>
              <Button onClick={handleShare} variant="ghost" className="gap-2">
                <Icons.arrowUpRight className="size-4" />
                Share
              </Button>
            </div>

            {consistentGeneratorHref ? (
              <div className="border-border/70 bg-secondary/35 rounded-2xl border p-4">
                <p className="text-sm font-medium text-foreground">
                  Reuse this character
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open consistent mode with this result preselected as reference.
                </p>
                <Link href={consistentGeneratorHref}>
                  <Button className="mt-3 gap-2" size="sm">
                    <Icons.arrowRight className="size-4" />
                    Continue with this character
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95 rounded-3xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="text-sm text-muted-foreground">
              {createdDate ? <p>Created: {createdDate}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/coloring?jobId=${jobData.id}`}>
                <Button variant="outline" className="gap-2">
                  <Icons.palette className="size-4" />
                  Color Online
                </Button>
              </Link>
              <Link href="/upload">
                <Button className="gap-2">
                  <Icons.media className="size-4" />
                  Create Another
                </Button>
              </Link>
              <Link href="/creations">
                <Button variant="outline" className="gap-2">
                  <Icons.bookOpen className="size-4" />
                  View All
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
