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

      <div className="mx-auto max-w-4xl space-y-8 pb-10">
        <Card className="overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b-4 border-slate-900 bg-yellow-50 p-6 dark:border-slate-700 dark:bg-yellow-900/20">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="font-heading text-2xl font-black text-slate-900 dark:text-slate-50">
                  Coloring Page Output
                </CardTitle>
                <CardDescription className="text-base font-bold text-slate-500 dark:text-slate-400">
                  Clean line art optimized for printing.
                </CardDescription>
              </div>
              <Badge className="rounded-full border-2 border-emerald-700 bg-emerald-100 px-4 py-1 text-sm font-black text-emerald-700 hover:bg-emerald-200 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60">
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            {jobData.lineartUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-4 border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-800">
                <Image
                  src={jobData.lineartUrl}
                  alt="Coloring page line art"
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Button
                onClick={() => handleDownload("png")}
                disabled={downloading === "png"}
                className="h-14 gap-2 rounded-2xl border-2 border-slate-900 bg-yellow-400 text-lg font-black text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:bg-yellow-500 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:opacity-50"
              >
                {downloading === "png" ? (
                  <Icons.spinner className="size-5 animate-spin" />
                ) : (
                  <Icons.package className="size-5" />
                )}
                Download PNG
              </Button>
              <Button
                onClick={() => handleDownload("pdf")}
                disabled={downloading === "pdf"}
                variant="outline"
                className="h-14 gap-2 rounded-2xl border-2 border-slate-900 bg-white text-lg font-black text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:bg-slate-50 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] dark:hover:bg-slate-700 dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
              >
                {downloading === "pdf" ? (
                  <Icons.spinner className="size-5 animate-spin" />
                ) : (
                  <Icons.page className="size-5" />
                )}
                Download PDF
              </Button>
              <Button 
                onClick={handleShare} 
                variant="ghost" 
                className="h-14 gap-2 rounded-2xl border-2 border-transparent text-lg font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              >
                <Icons.arrowUpRight className="size-5" />
                Share
              </Button>
            </div>

            {consistentGeneratorHref ? (
              <div className="rounded-3xl border-4 border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-900/20">
                <p className="text-lg font-black text-purple-900 dark:text-purple-200">
                  Reuse this character
                </p>
                <p className="mt-1 text-base font-bold text-purple-700/80 dark:text-purple-300/90">
                  Open consistent mode with this result preselected as reference.
                </p>
                <Link href={consistentGeneratorHref}>
                  <Button className="mt-4 w-full gap-2 rounded-xl border-2 border-purple-900 bg-purple-200 text-purple-900 shadow-sm hover:bg-purple-300 dark:border-purple-600 dark:bg-purple-800 dark:text-purple-100 dark:hover:bg-purple-700 sm:w-auto" size="lg">
                    <Icons.arrowRight className="size-5" />
                    Continue with this character
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {createdDate ? <p>Created: {createdDate}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/coloring?jobId=${jobData.id}`}>
                <Button variant="outline" className="h-12 gap-2 rounded-xl border-2 border-slate-900 bg-white font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:bg-slate-50 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] dark:hover:bg-slate-700">
                  <Icons.palette className="size-4" />
                  Color Online
                </Button>
              </Link>
              <Link href="/upload">
                <Button className="h-12 gap-2 rounded-xl border-2 border-slate-900 bg-pink-400 font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:bg-pink-500 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-pink-600 dark:text-slate-50 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] dark:hover:bg-pink-700">
                  <Icons.media className="size-4" />
                  Create Another
                </Button>
              </Link>
              <Link href="/creations">
                <Button variant="outline" className="h-12 gap-2 rounded-xl border-2 border-slate-900 bg-slate-100 font-bold text-slate-900 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700">
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
