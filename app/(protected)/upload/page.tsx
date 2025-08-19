"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

import { BASE_STYLES, FACE_ADDONS } from "@/config/prompts";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedAddons, setSelectedAddons] = useState<
    (keyof typeof FACE_ADDONS)[]
  >([]);

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
      formData.append("addons", JSON.stringify(selectedAddons));

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

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Privacy Reminder */}
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <Icons.warning className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            <strong>Privacy Promise:</strong> Your photo is processed instantly
            and never stored on our servers.
          </AlertDescription>
        </Alert>

        {!selectedFile ? (
          /* Upload Zone */
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Photo</CardTitle>
              <CardDescription>
                Upload a family photo to create a magical coloring book. Best
                results with 1-4 people and good lighting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={cn(
                  "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  isDragActive
                    ? "bg-primary/5 border-primary"
                    : "border-muted-foreground/25 hover:border-primary/50",
                )}
              >
                <input {...getInputProps()} />
                <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <Icons.media className="h-8 w-8 text-primary" />
                </div>
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop your photo here</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      Drag & drop your photo here, or{" "}
                      <span className="text-primary">click to browse</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports JPG, PNG, HEIC up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <Icons.warning className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Preview and Confirm */
          <Card>
            <CardHeader>
              <CardTitle>Preview Your Photo</CardTitle>
              <CardDescription>
                Review your photo before creating the coloring book.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Preview */}
              <div className="relative mx-auto aspect-square max-w-md overflow-hidden rounded-lg">
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
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong>File:</strong> {selectedFile.name}
                </p>
                <p>
                  <strong>Size:</strong>{" "}
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p>
                  <strong>Type:</strong> {selectedFile.type}
                </p>
              </div>

              {/* Style Selection */}
              <div className="space-y-4 border-t pt-4">
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
                    <SelectTrigger id="style-select">
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BASE_STYLES).map(([key, description]) => (
                        <SelectItem key={key} value={key}>
                          {key
                            .replace(/_/g, " ")
                            .replace("INTO ", "")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Face Enhancement Options */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Face Enhancements (Optional)
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(FACE_ADDONS).map(([key, description]) => (
                      <div key={key} className="flex items-start space-x-3">
                        <Checkbox
                          id={key}
                          checked={selectedAddons.includes(
                            key as keyof typeof FACE_ADDONS,
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAddons([
                                ...selectedAddons,
                                key as keyof typeof FACE_ADDONS,
                              ]);
                            } else {
                              setSelectedAddons(
                                selectedAddons.filter((addon) => addon !== key),
                              );
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor={key}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {key
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Icons.help className="h-5 w-5" />
              Tips for Best Results
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📸</span>
                Use photos with clear faces and good lighting
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">👨‍👩‍👧‍👦</span>
                Photos with 1-4 people work best
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">🖼️</span>
                Avoid busy backgrounds for cleaner line art
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📱</span>
                High-resolution photos create better details
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
