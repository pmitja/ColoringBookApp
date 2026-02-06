"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

import { BASE_STYLES } from "@/config/prompts";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export default function UploadPage() {
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] =
    useState<keyof typeof BASE_STYLES>("INTO_PIXAR");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, HEIC)");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".heic", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload image and create job
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("style", selectedStyle);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { jobId } = await response.json();

      setUploadProgress(100);

      // Redirect to processing page immediately
      setTimeout(() => {
        router.push(`/processing/${jobId}`);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload image. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <>
      <DashboardHeader
        heading="Upload Photo"
        text="Choose a family photo to transform into a coloring book."
      />

      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <Card className="border-slate-200/70 bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Upload Your Photo</CardTitle>
                <CardDescription>
                  Best results with 1-4 people, clear faces, and good lighting.
                </CardDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-100">
                Privacy Promise
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div>
                {!selectedFile ? (
                  <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                    <div
                      {...getRootProps()}
                      className={cn(
                        "flex cursor-pointer flex-col items-start rounded-2xl border-2 border-dashed border-slate-200/70 bg-slate-50 p-8 text-left transition-colors dark:border-white/10 dark:bg-slate-950/40",
                        isDragActive
                          ? "border-primary/70 bg-emerald-500/10"
                          : "hover:border-primary/60 hover:bg-slate-100 dark:hover:bg-white/5",
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70 dark:bg-white/10">
                        <Icons.media className="h-8 w-8 text-primary" />
                      </div>
                      {isDragActive ? (
                        <p className="text-lg font-medium">
                          Drop your photo here
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-lg font-medium">
                            Drag & drop your photo, or{" "}
                            <span className="text-primary">
                              click to browse
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Supports JPG, PNG, HEIC up to 10MB
                          </p>
                        </div>
                      )}
                    </div>

                    {error && (
                      <Alert className="mt-4 border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-100">
                        <Icons.warning className="h-4 w-4 text-rose-500 dark:text-rose-200" />
                        <AlertDescription className="text-rose-700 dark:text-rose-50">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 rounded-2xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                    {/* Image Preview */}
                    <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-slate-950/40">
                      {previewUrl && (
                        <Image
                          src={previewUrl}
                          alt="Upload preview"
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                        File: {selectedFile.name}
                      </span>
                      <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                        Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                        Type: {selectedFile.type}
                      </span>
                    </div>

                    {/* Style Selection */}
                    <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="space-y-3">
                        <Label
                          htmlFor="style-select"
                          className="text-base font-medium"
                        >
                          Choose Art Style
                        </Label>
                        <Select
                          value={selectedStyle}
                          onValueChange={(value) =>
                            setSelectedStyle(value as keyof typeof BASE_STYLES)
                          }
                        >
                          <SelectTrigger
                            id="style-select"
                            className="border-slate-200/70 bg-white/80 text-foreground dark:border-white/10 dark:bg-white/5 dark:text-foreground"
                          >
                            <SelectValue placeholder="Select a style" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BASE_STYLES).map(
                              ([key, description]) => (
                                <SelectItem key={key} value={key}>
                                  {key
                                    .replace(/_/g, " ")
                                    .replace("INTO ", "")
                                    .toLowerCase()
                                    .replace(/\b\w/g, (l) =>
                                      l.toUpperCase(),
                                    )}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processing your photo...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="flex-1 gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icons.package className="h-4 w-4" />
                            Process Photo
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetUpload}
                        variant="outline"
                        disabled={isUploading}
                        size="lg"
                        className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                      >
                        <Icons.close className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What You’ll Get
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clean line art made for printing and coloring.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-left dark:border-white/10 dark:bg-white/5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                      <Image
                        src="/illustrations/lineart-sample.svg"
                        alt="Line art sample"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium">Line Art PNG</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-left dark:border-white/10 dark:bg-white/5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                      <Image
                        src="/illustrations/color-sample.svg"
                        alt="Print ready preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium">Print-ready PDF</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Crisp outlines that kids can color easily.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Great for home printers and classrooms.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Safe and private by default.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-50">
              <Icons.help className="h-5 w-5" />
              Tips for Best Results
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-800 dark:text-amber-100">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">📸</span>
                Use photos with clear faces and good lighting.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">
                  👨‍👩‍👧‍👦
                </span>
                Photos with 1-4 people work best.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">🖼️</span>
                Avoid busy backgrounds for cleaner line art.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">📱</span>
                High-resolution photos create better details.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
