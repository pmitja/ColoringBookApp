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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

interface JobData {
  id: string;
  status: "DONE" | "FAILED";
  inputFileName: string;
  cartoonUrl?: string;
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
  const [activeTab, setActiveTab] = useState<string>("cartoon");

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

  const handleDownload = async (
    type: "cartoon" | "lineart",
    format: "png" | "pdf" = "png",
  ) => {
    if (!jobData) return;

    setDownloading(`${type}-${format}`);

    try {
      const url = type === "cartoon" ? jobData.cartoonUrl : jobData.lineartUrl;
      if (!url) throw new Error("Image URL not available");

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = `${jobData.inputFileName.split(".")[0]}-${type}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
      // Show error toast
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (type: "cartoon" | "lineart") => {
    if (!jobData) return;

    const url = type === "cartoon" ? jobData.cartoonUrl : jobData.lineartUrl;
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${type === "cartoon" ? "Cartoon" : "Coloring Book"}`,
          text: `Check out this amazing ${type === "cartoon" ? "cartoon version" : "coloring book"} created from my photo!`,
          url: url,
        });
      } catch (err) {
        console.error("Share error:", err);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        // Show success toast
      } catch (err) {
        console.error("Copy error:", err);
      }
    }
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
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <Icons.warning className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-400">
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

  return (
    <>
      <DashboardHeader
        heading="Your Coloring Book is Ready!"
        text={`Created from: ${jobData.inputFileName}`}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Success Message */}
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <Icons.check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            <strong>Success!</strong> Your magical coloring book has been
            created. Download both versions below.
          </AlertDescription>
        </Alert>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cartoon" className="gap-2">
              <Icons.media className="h-4 w-4" />
              Cartoon Version
            </TabsTrigger>
            <TabsTrigger value="lineart" className="gap-2">
              <Icons.media className="h-4 w-4" />
              Coloring Page
            </TabsTrigger>
          </TabsList>

          {/* Cartoon Tab */}
          <TabsContent value="cartoon" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icons.media className="h-5 w-5" />
                      Pixar-Style Cartoon
                    </CardTitle>
                    <CardDescription>
                      Your photo transformed into a beautiful 3D cartoon style
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Display */}
                {jobData.cartoonUrl && (
                  <div className="relative mx-auto aspect-square max-w-2xl overflow-hidden rounded-lg border">
                    <Image
                      src={jobData.cartoonUrl}
                      alt="Cartoon version"
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
                      onClick={() => handleDownload("cartoon", "png")}
                      disabled={downloading === "cartoon-png"}
                      className="gap-2"
                    >
                      {downloading === "cartoon-png" ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.package className="h-4 w-4" />
                      )}
                      Download PNG (High-res)
                    </Button>
                    <Button
                      onClick={() => handleDownload("cartoon", "pdf")}
                      disabled={downloading === "cartoon-pdf"}
                      variant="outline"
                      className="gap-2"
                    >
                      {downloading === "cartoon-pdf" ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.page className="h-4 w-4" />
                      )}
                      Download PDF (Print)
                    </Button>
                  </div>
                </div>

                {/* Share */}
                <div className="text-center">
                  <Button
                    onClick={() => handleShare("cartoon")}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Icons.arrowUpRight className="h-4 w-4" />
                    Share Cartoon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Line Art Tab */}
          <TabsContent value="lineart" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icons.media className="h-5 w-5" />
                      Coloring Book Page
                    </CardTitle>
                    <CardDescription>
                      Black & white line art perfect for coloring
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Display */}
                {jobData.lineartUrl && (
                  <div className="relative mx-auto aspect-square max-w-2xl overflow-hidden rounded-lg border bg-white">
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
                      onClick={() => handleDownload("lineart", "png")}
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
                      onClick={() => handleDownload("lineart", "pdf")}
                      disabled={downloading === "lineart-pdf"}
                      variant="outline"
                      className="gap-2"
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
                <div className="text-center">
                  <Button
                    onClick={() => handleShare("lineart")}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Icons.arrowUpRight className="h-4 w-4" />
                    Share Coloring Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
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
                  <Button variant="outline" className="gap-2">
                    <Icons.bookOpen className="h-4 w-4" />
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coloring Tips */}
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:border-yellow-800 dark:from-yellow-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <Icons.help className="h-5 w-5" />
              Coloring Tips for Kids
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800 dark:text-yellow-200">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">🖍️</span>
                  Start with light colors and build up darker ones
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">🎨</span>
                  Try different coloring tools: crayons, markers, colored
                  pencils
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">✨</span>
                  Don't worry about staying in the lines - creativity is key!
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">👨‍👩‍👧‍👦</span>
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
