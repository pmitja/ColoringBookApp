"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";

import { BASE_STYLES, STYLE_PRESETS, type StyleId } from "@/config/prompts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

type UploadMode = "photo" | "ai" | "consistent";
type AspectRatio = "auto";
type JobReferenceResponse = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  cartoonUrl?: string | null;
  lineartUrl?: string | null;
};

export interface GeneratorStudioProps {
  heading: string;
  text: string;
  enabledModes: UploadMode[];
  defaultMode?: UploadMode;
}

function getStyleKeys(): StyleId[] {
  return Object.keys(BASE_STYLES) as StyleId[];
}

export default function GeneratorStudio({
  heading,
  text,
  enabledModes,
  defaultMode,
}: GeneratorStudioProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availableModes = useMemo(() => {
    const deduped = Array.from(new Set(enabledModes));
    return deduped.length > 0 ? deduped : (["photo"] as UploadMode[]);
  }, [enabledModes]);
  const resolvedDefaultMode = useMemo(() => {
    if (defaultMode && availableModes.includes(defaultMode)) {
      return defaultMode;
    }
    return availableModes[0];
  }, [availableModes, defaultMode]);
  const [mode, setMode] = useState<UploadMode>(resolvedDefaultMode);
  const showModeTabs = availableModes.length > 1;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("FAST");
  const [aspectRatio] = useState<AspectRatio>("auto");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [generatorPrompt, setGeneratorPrompt] = useState("");

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(
    null,
  );
  const [referenceJobId, setReferenceJobId] = useState<string | null>(null);
  const [referenceJobPreviewUrl, setReferenceJobPreviewUrl] = useState<
    string | null
  >(null);
  const [consumedPrefillReferenceJobId, setConsumedPrefillReferenceJobId] =
    useState<string | null>(null);
  const [isReferenceLoading, setIsReferenceLoading] = useState(false);
  const [consistentPrompt, setConsistentPrompt] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!availableModes.includes(mode)) {
      setMode(resolvedDefaultMode);
    }
  }, [availableModes, mode, resolvedDefaultMode]);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (!requestedMode) return;

    const nextMode = requestedMode as UploadMode;
    if (!availableModes.includes(nextMode)) return;
    setMode(nextMode);
  }, [availableModes, searchParams]);

  useEffect(() => {
    if (!availableModes.includes("consistent")) return;

    const requestedReferenceJobId = searchParams.get("referenceJobId")?.trim();
    if (
      !requestedReferenceJobId ||
      requestedReferenceJobId === referenceJobId ||
      requestedReferenceJobId === consumedPrefillReferenceJobId
    ) {
      return;
    }

    let cancelled = false;

    const applyReferenceFromJob = async () => {
      setIsReferenceLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/jobs/${requestedReferenceJobId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load the selected reference image.");
        }

        const jobData = (await response.json()) as JobReferenceResponse;
        const previewUrl = jobData.cartoonUrl || jobData.lineartUrl;

        if (jobData.status !== "DONE" || !previewUrl) {
          throw new Error("Reference image is not ready yet.");
        }

        if (cancelled) return;

        if (referencePreviewUrl) {
          URL.revokeObjectURL(referencePreviewUrl);
        }

        setReferenceFile(null);
        setReferencePreviewUrl(null);
        setReferenceJobId(requestedReferenceJobId);
        setReferenceJobPreviewUrl(previewUrl);
        setConsumedPrefillReferenceJobId(requestedReferenceJobId);
        setMode("consistent");
      } catch (err) {
        if (cancelled) return;
        setReferenceJobId(null);
        setReferenceJobPreviewUrl(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load reference image from results.",
        );
      } finally {
        if (!cancelled) {
          setIsReferenceLoading(false);
        }
      }
    };

    void applyReferenceFromJob();

    return () => {
      cancelled = true;
    };
  }, [
    availableModes,
    consumedPrefillReferenceJobId,
    referenceJobId,
    referencePreviewUrl,
    searchParams,
  ]);

  const validateImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, HEIC, WEBP)");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return false;
    }

    return true;
  }, []);

  const onPhotoDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!validateImageFile(file)) return;

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setError(null);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [previewUrl, validateImageFile],
  );

  const onReferenceDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!validateImageFile(file)) return;

      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);

      setError(null);
      setReferenceFile(file);
      setReferencePreviewUrl(URL.createObjectURL(file));
      setReferenceJobId(null);
      setReferenceJobPreviewUrl(null);
    },
    [referencePreviewUrl, validateImageFile],
  );

  const {
    getRootProps: getPhotoRootProps,
    getInputProps: getPhotoInputProps,
    isDragActive: isPhotoDragActive,
  } = useDropzone({
    onDrop: onPhotoDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".heic", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    disabled: isUploading,
  });

  const {
    getRootProps: getReferenceRootProps,
    getInputProps: getReferenceInputProps,
    isDragActive: isReferenceDragActive,
  } = useDropzone({
    onDrop: onReferenceDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".heic", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    disabled: isUploading,
  });

  const styleKeys = useMemo(() => getStyleKeys(), []);

  const startProgress = useCallback(() => {
    setUploadProgress(0);

    return setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 8;
      });
    }, 220);
  }, []);

  const submitJob = useCallback(
    async (endpoint: string, formData: FormData) => {
      setIsUploading(true);
      setError(null);
      const progressInterval = startProgress();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Request failed");
        }

        const { jobId } = await response.json();
        setUploadProgress(100);

        setTimeout(() => {
          router.push(`/processing/${jobId}`);
        }, 450);
      } catch (err) {
        console.error("Generation error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start generation. Please try again.",
        );
        setIsUploading(false);
        setUploadProgress(0);
      } finally {
        clearInterval(progressInterval);
      }
    },
    [router, startProgress],
  );

  const handlePhotoUpload = useCallback(async () => {
    if (!selectedFile) {
      setError("Please upload a photo first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("style", selectedStyle);

    await submitJob("/api/upload", formData);
  }, [selectedFile, selectedStyle, submitJob]);

  const handleAIGenerator = useCallback(async () => {
    if (generatorPrompt.trim().length < 12) {
      setError("Please enter a more detailed prompt (at least 12 characters).");
      return;
    }

    const formData = new FormData();
    formData.append("mode", "prompt");
    formData.append("prompt", generatorPrompt.trim());
    formData.append("style", selectedStyle);
    formData.append("aspectRatio", aspectRatio);

    await submitJob("/api/generate", formData);
  }, [aspectRatio, generatorPrompt, selectedStyle, submitJob]);

  const handleConsistentCharacters = useCallback(async () => {
    if (!referenceFile && !referenceJobId) {
      setError("Please upload a reference character image.");
      return;
    }

    if (consistentPrompt.trim().length < 12) {
      setError(
        "Please describe the new scene/behavior in at least 12 characters.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("mode", "consistent");
    if (referenceFile) {
      formData.append("referenceImage", referenceFile);
    } else if (referenceJobId) {
      formData.append("referenceJobId", referenceJobId);
    }
    formData.append("prompt", consistentPrompt.trim());
    formData.append("style", selectedStyle);
    formData.append("aspectRatio", aspectRatio);

    await submitJob("/api/generate", formData);
  }, [
    aspectRatio,
    consistentPrompt,
    referenceFile,
    referenceJobId,
    selectedStyle,
    submitJob,
  ]);

  const renderStylePicker = (
    subtitle = "Pick the artistic pass before line-art conversion.",
  ) => (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-medium">Style</Label>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {styleKeys.map((styleId) => {
          const preset = STYLE_PRESETS[styleId];
          const isSelected = selectedStyle === styleId;

          return (
            <button
              key={styleId}
              type="button"
              disabled={isUploading}
              onClick={() => setSelectedStyle(styleId)}
              className={cn(
                "rounded-xl border bg-white px-4 py-3 text-left transition-colors dark:bg-slate-900",
                isSelected
                  ? "bg-primary/5 ring-primary/40 border-primary ring-1"
                  : "hover:border-primary/40 border-slate-200/70 dark:border-white/10",
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {preset.label}
              </p>
              <p className="text-sm text-muted-foreground">{preset.subtitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {preset.helper}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderAspectPicker = () => (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
      <Label className="text-base font-medium">Aspect ratio</Label>
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
        <p className="text-sm font-semibold">Auto</p>
        <p className="text-xs text-muted-foreground">
          The model picks the best framing automatically.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <DashboardHeader heading={heading} text={text} />

      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <Card className="border-slate-200/70 bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Generator Studio</CardTitle>
                <CardDescription>
                  Pick your creation mode, tune style, and generate printable
                  line art.
                </CardDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-100">
                Privacy Promise
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="space-y-4">
                <Tabs
                  value={mode}
                  onValueChange={(value) => {
                    const nextMode = value as UploadMode;
                    if (!availableModes.includes(nextMode)) return;
                    setMode(nextMode);
                    setError(null);
                  }}
                  className="space-y-4"
                >
                  {showModeTabs ? (
                    <TabsList
                      className={cn(
                        "grid w-full",
                        availableModes.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3",
                      )}
                    >
                      {availableModes.includes("photo") ? (
                        <TabsTrigger value="photo">Photo Upload</TabsTrigger>
                      ) : null}
                      {availableModes.includes("ai") ? (
                        <TabsTrigger value="ai">AI Generator</TabsTrigger>
                      ) : null}
                      {availableModes.includes("consistent") ? (
                        <TabsTrigger value="consistent">
                          Consistent Characters
                        </TabsTrigger>
                      ) : null}
                    </TabsList>
                  ) : null}

                  {availableModes.includes("photo") ? (
                    <TabsContent value="photo" className="space-y-4">
                      {!selectedFile ? (
                        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                          <div
                            {...getPhotoRootProps()}
                            className={cn(
                              "flex cursor-pointer flex-col items-start rounded-2xl border-2 border-dashed border-slate-200/70 bg-slate-50 p-8 text-left transition-colors dark:border-white/10 dark:bg-slate-950/40",
                              isPhotoDragActive
                                ? "border-primary/70 bg-emerald-500/10"
                                : "hover:border-primary/60 hover:bg-slate-100 dark:hover:bg-white/5",
                            )}
                          >
                            <input {...getPhotoInputProps()} />
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70 dark:bg-white/10">
                              <Icons.media className="h-8 w-8 text-primary" />
                            </div>
                            {isPhotoDragActive ? (
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
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-slate-950/40">
                            {previewUrl ? (
                              <Image
                                src={previewUrl}
                                alt="Upload preview"
                                fill
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                              File: {selectedFile.name}
                            </span>
                            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                              Size:{" "}
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      )}

                      {renderStylePicker()}

                      <div className="flex gap-3">
                        <Button
                          onClick={handlePhotoUpload}
                          disabled={isUploading || !selectedFile}
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
                          onClick={() => {
                            if (previewUrl) URL.revokeObjectURL(previewUrl);
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          variant="outline"
                          disabled={isUploading || !selectedFile}
                          size="lg"
                          className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("ai") ? (
                    <TabsContent value="ai" className="space-y-4">
                      <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <Label
                          htmlFor="generator-prompt"
                          className="text-base font-medium"
                        >
                          Describe your coloring page
                        </Label>
                        <Textarea
                          id="generator-prompt"
                          value={generatorPrompt}
                          onChange={(e) => setGeneratorPrompt(e.target.value)}
                          placeholder="Example: cheerful fox teacher in a forest classroom, kids reading books, clean scene composition"
                          className="min-h-[140px]"
                          disabled={isUploading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Keep it specific: subject, setting, action, and mood.
                        </p>
                      </div>

                      {renderStylePicker(
                        "This style guides the AI scene generation.",
                      )}
                      {renderAspectPicker()}

                      <Button
                        onClick={handleAIGenerator}
                        disabled={
                          isUploading || generatorPrompt.trim().length < 12
                        }
                        className="w-full gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icons.arrowRight className="h-4 w-4" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("consistent") ? (
                    <TabsContent value="consistent" className="space-y-4">
                      {isReferenceLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
                          <Icons.spinner className="h-4 w-4 animate-spin" />
                          Loading reference image from your results...
                        </div>
                      ) : null}
                      <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            Reference character image
                          </Label>
                          {!referenceFile && !referenceJobId ? (
                            <div
                              {...getReferenceRootProps()}
                              className={cn(
                                "flex cursor-pointer flex-col items-start rounded-2xl border-2 border-dashed border-slate-200/70 bg-slate-50 p-6 text-left transition-colors dark:border-white/10 dark:bg-slate-950/40",
                                isReferenceDragActive
                                  ? "border-primary/70 bg-emerald-500/10"
                                  : "hover:border-primary/60 hover:bg-slate-100 dark:hover:bg-white/5",
                              )}
                            >
                              <input {...getReferenceInputProps()} />
                              <p className="text-sm font-medium">
                                Drop reference image or click to browse
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Use the same character you want to keep
                                consistent.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-slate-950/40">
                                {referencePreviewUrl ||
                                referenceJobPreviewUrl ? (
                                  <Image
                                    src={
                                      referencePreviewUrl ||
                                      referenceJobPreviewUrl ||
                                      ""
                                    }
                                    alt="Reference character preview"
                                    fill
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {referenceJobId
                                  ? "Reference linked from a previous generated result."
                                  : "Reference uploaded from your device."}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isUploading}
                                onClick={() => {
                                  if (referencePreviewUrl)
                                    URL.revokeObjectURL(referencePreviewUrl);
                                  setReferenceFile(null);
                                  setReferencePreviewUrl(null);
                                  setReferenceJobId(null);
                                  setReferenceJobPreviewUrl(null);
                                }}
                              >
                                Use another reference
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="consistent-prompt"
                            className="text-base font-medium"
                          >
                            New scene / behavior prompt
                          </Label>
                          <Textarea
                            id="consistent-prompt"
                            value={consistentPrompt}
                            onChange={(e) =>
                              setConsistentPrompt(e.target.value)
                            }
                            placeholder="Example: same girl riding a bicycle through a flower market, smiling and waving"
                            className="min-h-[120px]"
                            disabled={isUploading}
                          />
                          <p className="text-xs text-muted-foreground">
                            We keep core character identity while changing
                            scene/action.
                          </p>
                        </div>
                      </div>

                      {renderStylePicker(
                        "Style controls the new scene output before line-art conversion.",
                      )}
                      {renderAspectPicker()}

                      <Button
                        onClick={handleConsistentCharacters}
                        disabled={
                          isUploading ||
                          (!referenceFile && !referenceJobId) ||
                          consistentPrompt.trim().length < 12
                        }
                        className="w-full gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icons.arrowRight className="h-4 w-4" />
                            Generate Consistent Character Scene
                          </>
                        )}
                      </Button>
                    </TabsContent>
                  ) : null}
                </Tabs>

                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Preparing your coloring page...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                ) : null}

                {error ? (
                  <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-100">
                    <Icons.warning className="h-4 w-4 text-rose-500 dark:text-rose-200" />
                    <AlertDescription className="text-rose-700 dark:text-rose-50">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What You&rsquo;ll Get
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
                    Works with home printers and classroom worksheets.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Prompt, style, and aspect ratio tuned for coloring pages.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <span className="text-amber-500 dark:text-amber-300">•</span>
                Use clear subjects and avoid crowded compositions.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">•</span>
                For consistent characters, use a front-facing reference with
                clear facial features.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">•</span>
                Include action words in prompts: running, reading, flying,
                exploring.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-300">•</span>
                Aspect ratio is set to Auto for best framing.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
