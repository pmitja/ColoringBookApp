"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

type UploadMode = "photo" | "ai" | "consistent" | "name";
const BATCH_MIN = 1;
const BATCH_MAX = 5;
const MINIMUM_PROMPT_LENGTH = 12;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 24;
const PRIMARY_STYLE_ORDER: StyleId[] = [
  "DEFAULT",
  "CARTOON",
  "ANIME",
  "INTRICATE",
  "MINIMALIST",
  "SCIFI",
];
const NAME_THEME_OPTIONS = [
  {
    id: "floral-hearts",
    label: "Floral Hearts",
    subtitle: "Flowers, hearts, soft swirls",
    prompt:
      "cute flowers, floating hearts, rounded swirls, bubble dots, and sparkles",
  },
  {
    id: "garden-party",
    label: "Garden Party",
    subtitle: "Ladybugs, blossoms, playful leaves",
    prompt:
      "ladybugs, flowers, leaf sprigs, stars, and curved garden vines with tiny dots",
  },
  {
    id: "starry-kawaii",
    label: "Starry Kawaii",
    subtitle: "Stars, bows, sparkles",
    prompt:
      "kawaii stars, bows, tiny hearts, curved ribbons, and sparkly doodles",
  },
  {
    id: "mixed-doodles",
    label: "Mixed Doodles",
    subtitle: "Balanced cute symbols",
    prompt:
      "a balanced mix of flowers, hearts, stars, swirls, and friendly dot clusters",
  },
] as const;

type NameThemeId = (typeof NAME_THEME_OPTIONS)[number]["id"];

type JobReferenceResponse = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  cartoonUrl?: string | null;
  lineartUrl?: string | null;
};

type ReferenceCreation = {
  id: string;
  inputFileName: string;
  previewUrl: string;
};

export interface GeneratorStudioProps {
  heading: string;
  text: string;
  enabledModes: UploadMode[];
  defaultMode?: UploadMode;
  isPaidUser?: boolean;
  referenceCreations?: ReferenceCreation[];
}

function getStyleKeys(): StyleId[] {
  return PRIMARY_STYLE_ORDER.filter((styleId) => styleId in BASE_STYLES);
}

function normalizeNameInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sanitizeNameInput(value: string) {
  return value
    .replace(/[^a-zA-Z\s'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, NAME_MAX_LENGTH);
}

function buildNamePagePrompt({
  name,
  themePrompt,
  extraDetails,
}: {
  name: string;
  themePrompt: string;
  extraDetails: string;
}) {
  const safeName = normalizeNameInput(name).toUpperCase();
  const cleanDetails = extraDetails.trim();

  return [
    `Create a black-and-white printable coloring page featuring the name "${safeName}" in very large, centered, rounded bubble letters.`,
    "The name must be the only readable text in the artwork.",
    `Surround the name with ${themePrompt}.`,
    "Use thick clean outlines, smooth curves, high contrast, and a pure white background.",
    "Keep all enclosed areas white for coloring. No grayscale shading, hatching, texture fills, logos, watermarks, page borders, or frame.",
    "Composition should be portrait orientation and balanced for a full-page print.",
    cleanDetails ? `Extra request: ${cleanDetails}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function GeneratorStudio({
  heading,
  text,
  enabledModes,
  defaultMode,
  isPaidUser = false,
  referenceCreations = [],
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
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("DEFAULT");
  const [batchCount, setBatchCount] = useState(BATCH_MIN);
  const [isPrivateMode, setIsPrivateMode] = useState(isPaidUser);
  const [isUpscaleEnabled, setIsUpscaleEnabled] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [namePageName, setNamePageName] = useState("");
  const [nameThemeId, setNameThemeId] = useState<NameThemeId>("floral-hearts");
  const [namePageDetails, setNamePageDetails] = useState("");

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
    if (!isPaidUser) {
      setIsPrivateMode(false);
      setIsUpscaleEnabled(false);
      return;
    }

    setIsPrivateMode(true);
  }, [isPaidUser]);

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
        const previewUrl = jobData.lineartUrl || jobData.cartoonUrl;

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

  const handleSelectCreationReference = useCallback(
    (creation: ReferenceCreation) => {
      if (referencePreviewUrl) {
        URL.revokeObjectURL(referencePreviewUrl);
      }

      setError(null);
      setReferenceFile(null);
      setReferencePreviewUrl(null);
      setReferenceJobId(creation.id);
      setReferenceJobPreviewUrl(creation.previewUrl);
      setMode("consistent");
    },
    [referencePreviewUrl],
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

        const payload = (await response.json()) as {
          jobId: string;
          jobIds?: string[];
          batchCount?: number;
        };
        setUploadProgress(100);

        setTimeout(() => {
          if ((payload.batchCount ?? payload.jobIds?.length ?? 1) > 1) {
            router.push("/creations");
            return;
          }
          router.push(`/processing/${payload.jobId}`);
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
    formData.append("batchCount", String(batchCount));
    formData.append("private", String(isPaidUser ? isPrivateMode : false));
    formData.append("upscale", String(isPaidUser ? isUpscaleEnabled : false));

    await submitJob("/api/upload", formData);
  }, [
    batchCount,
    isPaidUser,
    isPrivateMode,
    isUpscaleEnabled,
    selectedFile,
    selectedStyle,
    submitJob,
  ]);

  const handleAIGenerator = useCallback(async () => {
    if (generatorPrompt.trim().length < MINIMUM_PROMPT_LENGTH) {
      setError(
        `Please enter a more detailed prompt (at least ${MINIMUM_PROMPT_LENGTH} characters).`,
      );
      return;
    }

    const formData = new FormData();
    formData.append("mode", "prompt");
    formData.append("prompt", generatorPrompt.trim());
    formData.append("style", selectedStyle);
    formData.append("private", String(isPaidUser ? isPrivateMode : false));
    formData.append("upscale", String(isPaidUser ? isUpscaleEnabled : false));

    await submitJob("/api/generate", formData);
  }, [
    generatorPrompt,
    isPaidUser,
    isPrivateMode,
    isUpscaleEnabled,
    selectedStyle,
    submitJob,
  ]);

  const handleConsistentCharacters = useCallback(async () => {
    if (!referenceFile && !referenceJobId) {
      setError("Please upload a reference character image.");
      return;
    }

    if (consistentPrompt.trim().length < MINIMUM_PROMPT_LENGTH) {
      setError(
        `Please describe the new scene/behavior in at least ${MINIMUM_PROMPT_LENGTH} characters.`,
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
    formData.append("private", String(isPaidUser ? isPrivateMode : false));
    formData.append("upscale", String(isPaidUser ? isUpscaleEnabled : false));

    await submitJob("/api/generate", formData);
  }, [
    consistentPrompt,
    isPaidUser,
    isPrivateMode,
    isUpscaleEnabled,
    referenceFile,
    referenceJobId,
    selectedStyle,
    submitJob,
  ]);

  const handleNamePageGenerator = useCallback(async () => {
    const normalizedName = normalizeNameInput(namePageName);

    if (normalizedName.length < NAME_MIN_LENGTH) {
      setError(
        `Please enter a name with at least ${NAME_MIN_LENGTH} characters.`,
      );
      return;
    }

    const selectedTheme =
      NAME_THEME_OPTIONS.find((theme) => theme.id === nameThemeId) ??
      NAME_THEME_OPTIONS[0];

    const formData = new FormData();
    formData.append("mode", "prompt");
    formData.append(
      "prompt",
      buildNamePagePrompt({
        name: normalizedName,
        themePrompt: selectedTheme.prompt,
        extraDetails: namePageDetails,
      }),
    );
    formData.append("private", String(isPaidUser ? isPrivateMode : false));
    formData.append("upscale", String(isPaidUser ? isUpscaleEnabled : false));

    await submitJob("/api/generate", formData);
  }, [
    isPaidUser,
    isPrivateMode,
    isUpscaleEnabled,
    namePageDetails,
    namePageName,
    nameThemeId,
    submitJob,
  ]);

  const generatorPromptLength = generatorPrompt.trim().length;
  const consistentPromptLength = consistentPrompt.trim().length;
  const hasReferenceInput = Boolean(referenceFile || referenceJobId);
  const normalizedNamePageName = normalizeNameInput(namePageName);
  const namePageNameLength = normalizedNamePageName.length;
  const selectedNameTheme =
    NAME_THEME_OPTIONS.find((theme) => theme.id === nameThemeId) ??
    NAME_THEME_OPTIONS[0];

  const hasCoreInput =
    mode === "photo"
      ? Boolean(selectedFile)
      : mode === "ai"
        ? generatorPromptLength > 0
        : mode === "consistent"
          ? hasReferenceInput || consistentPromptLength > 0
          : namePageNameLength > 0;

  const isReadyToSubmit =
    mode === "photo"
      ? Boolean(selectedFile)
      : mode === "ai"
        ? generatorPromptLength >= MINIMUM_PROMPT_LENGTH
        : mode === "consistent"
          ? hasReferenceInput && consistentPromptLength >= MINIMUM_PROMPT_LENGTH
          : namePageNameLength >= NAME_MIN_LENGTH;

  const stepStates: Array<{
    id: string;
    title: string;
    description: string;
    state: "idle" | "active" | "done";
  }> = [
    {
      id: "1",
      title: "Add Input",
      description:
        mode === "photo"
          ? "Upload your source photo"
          : mode === "ai"
            ? "Write your scene prompt"
            : mode === "consistent"
              ? "Add a reference image"
              : "Enter a name",
      state: hasCoreInput ? "done" : "active",
    },
    {
      id: "2",
      title: "Tune Output",
      description: "Choose style and options",
      state:
        hasCoreInput && !isReadyToSubmit
          ? "active"
          : isReadyToSubmit
            ? "done"
            : "idle",
    },
    {
      id: "3",
      title: isUploading ? "Generating" : "Generate",
      description: "Create printable line art",
      state: isUploading || isReadyToSubmit ? "active" : "idle",
    },
  ];

  const renderStylePicker = (
    subtitle = "Pick the artistic pass before line-art conversion.",
  ) => (
    <div className="border-border/50 bg-muted/30 rounded-2xl border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-bold">Style</Label>
        <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                "group relative overflow-hidden rounded-2xl border-2 p-1 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
                isSelected
                  ? "bg-primary/5 border-primary shadow-sm"
                  : "hover:bg-muted/50 border-transparent bg-background hover:border-border",
              )}
            >
              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted"
              >
                <Image
                  src={preset.previewImage}
                  alt={`${preset.label} style preview`}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-500",
                    isSelected ? "scale-105" : "group-hover:scale-110"
                  )}
                  sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 24vw, 44vw"
                />
                {isSelected && (
                   <div className="ring-primary/20 absolute inset-0 rounded-xl ring-2 ring-inset" />
                )}
              </div>
              <div className="p-2">
                 <p
                   className={cn(
                     "text-sm font-bold transition-colors",
                     isSelected ? "text-primary" : "text-foreground group-hover:text-primary",
                   )}
                 >
                   {preset.label}
                 </p>
                 <p className="line-clamp-1 text-xs font-medium text-muted-foreground">
                   {preset.subtitle}
                 </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <DashboardHeader heading={heading} text={text} />

      <div className="mx-auto max-w-6xl space-y-8 pb-10">
        <Card className="playful-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-border/50 relative z-10 space-y-6 border-b pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-3xl">Generator Studio</CardTitle>
                <CardDescription className="mt-2 text-base">
                  Pick your creation mode, tune style, and generate printable
                  line art.
                </CardDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icons.check className="size-3.5" />
                Original files not stored
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {stepStates.map((step) => (
                <FlowStep
                  key={step.id}
                  id={step.id}
                  title={step.title}
                  description={step.description}
                  state={step.state}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-6 md:p-8">
            {isUploading ? (
              <div
                className="border-border/80 bg-secondary/45 space-y-3 rounded-2xl border p-4"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icons.spinner className="size-4 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Generating your coloring page
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {uploadProgress}%
                  </p>
                </div>
                <Progress value={uploadProgress} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  Keep this tab open. We’ll redirect automatically when your
                  page is ready.
                </p>
              </div>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="space-y-6">
                <Tabs
                  value={mode}
                  onValueChange={(value) => {
                    const nextMode = value as UploadMode;
                    if (!availableModes.includes(nextMode)) return;
                    setMode(nextMode);
                    setError(null);
                  }}
                  className="space-y-6"
                >
                  {showModeTabs ? (
                    <TabsList
                      className={cn(
                        "bg-muted/50 border-border/50 grid h-auto w-full rounded-2xl border p-1.5",
                        availableModes.length === 2
                          ? "grid-cols-2"
                          : availableModes.length === 3
                            ? "grid-cols-3"
                            : "grid-cols-4",
                      )}
                    >
                      {availableModes.includes("photo") ? (
                        <TabsTrigger
                          value="photo"
                          className="rounded-xl py-3 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          Photo Upload
                        </TabsTrigger>
                      ) : null}
                      {availableModes.includes("ai") ? (
                        <TabsTrigger
                          value="ai"
                          className="rounded-xl py-3 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          AI Generator
                        </TabsTrigger>
                      ) : null}
                      {availableModes.includes("name") ? (
                        <TabsTrigger
                          value="name"
                          className="rounded-xl py-3 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          Name Pages
                        </TabsTrigger>
                      ) : null}
                      {availableModes.includes("consistent") ? (
                        <TabsTrigger
                          value="consistent"
                          className="rounded-xl py-3 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          Consistent Characters
                        </TabsTrigger>
                      ) : null}
                    </TabsList>
                  ) : null}

                  {availableModes.includes("photo") ? (
                    <TabsContent value="photo" className="space-y-4">
                      {!selectedFile ? (
                        <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-2xl border p-6">
                          <div
                            {...getPhotoRootProps()}
                            className={cn(
                              "border-border/70 bg-muted/40 dark:border-border/60 dark:bg-muted/20 flex cursor-pointer flex-col items-start rounded-2xl border-2 border-dashed p-8 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isPhotoDragActive
                                ? "border-primary/70 bg-emerald-500/10"
                                : "hover:border-primary/60 hover:bg-muted/60 dark:hover:bg-muted/30",
                            )}
                          >
                            <input {...getPhotoInputProps()} />
                            <div className="bg-secondary/80 mb-4 flex size-16 items-center justify-center rounded-full">
                              <Icons.media className="size-8 text-primary" />
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
                        <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-4 rounded-2xl border p-6">
                          <div className="border-border/70 bg-muted/30 dark:border-border/60 dark:bg-muted/20 relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border">
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
                            <span className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-full border px-3 py-1">
                              File: {selectedFile.name}
                            </span>
                            <span className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-full border px-3 py-1">
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
                          disabled={isUploading || !isReadyToSubmit}
                          className="flex-1 gap-2"
                          size="lg"
                        >
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Icons.package className="size-4" />
                              {batchCount > 1
                                ? `Process ${batchCount} Photos`
                                : "Process Photo"}
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
                          className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-full"
                          aria-label="Remove selected image"
                          title="Remove selected image"
                        >
                          <Icons.close className="size-4" />
                        </Button>
                      </div>
                      {!isReadyToSubmit ? (
                        <p className="text-xs text-muted-foreground">
                          Upload a photo to enable generation.
                        </p>
                      ) : null}
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("ai") ? (
                    <TabsContent value="ai" className="space-y-6">
                      <div className="border-border/50 bg-muted/30 rounded-2xl border p-5">
                        <Label
                          htmlFor="generator-prompt"
                          className="mb-4 block text-base font-bold"
                        >
                          Describe your coloring page
                        </Label>
                        <Textarea
                          id="generator-prompt"
                          name="generator-prompt"
                          value={generatorPrompt}
                          onChange={(e) => setGeneratorPrompt(e.target.value)}
                          placeholder="Example: cheerful fox teacher in a forest classroom, kids reading books, clean scene composition"
                          className="focus-visible:ring-primary/50 min-h-[160px] resize-none rounded-xl bg-background p-4 text-base"
                          disabled={isUploading}
                        />
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
                          <p>
                            Keep it specific: subject, setting, action, and
                            mood.
                          </p>
                          <p
                            className={cn(
                              "shrink-0",
                              generatorPromptLength < MINIMUM_PROMPT_LENGTH &&
                                "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {generatorPromptLength}/{MINIMUM_PROMPT_LENGTH} min
                          </p>
                        </div>
                      </div>

                      {renderStylePicker(
                        "This style guides the AI scene generation.",
                      )}

                      <Button
                        onClick={handleAIGenerator}
                        disabled={isUploading || !isReadyToSubmit}
                        className="w-full gap-2 rounded-full py-6 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="size-5 animate-spin" />
                            Generating Magic...
                          </>
                        ) : (
                          <>
                            <Icons.arrowRight className="size-5" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                      {!isReadyToSubmit ? (
                        <p className="text-center text-sm font-medium text-muted-foreground">
                          Write at least {MINIMUM_PROMPT_LENGTH} characters to
                          generate.
                        </p>
                      ) : null}
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("name") ? (
                    <TabsContent value="name" className="space-y-4">
                      <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-3 rounded-2xl border p-4">
                        <Label
                          htmlFor="name-page-name"
                          className="text-base font-medium"
                        >
                          Name to generate
                        </Label>
                        <Input
                          id="name-page-name"
                          name="name-page-name"
                          value={namePageName}
                          onChange={(event) => {
                            setNamePageName(
                              sanitizeNameInput(event.target.value),
                            );
                          }}
                          placeholder="Example: Sara"
                          className="h-12 text-lg font-semibold tracking-wide"
                          maxLength={NAME_MAX_LENGTH}
                          disabled={isUploading}
                        />
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <p>Letters, spaces, apostrophes, and hyphens only.</p>
                          <p
                            className={cn(
                              "shrink-0",
                              namePageNameLength < NAME_MIN_LENGTH &&
                                "text-amber-600 dark:text-amber-300",
                            )}
                          >
                            {namePageNameLength}/{NAME_MAX_LENGTH}
                          </p>
                        </div>
                      </div>

                      <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-3 rounded-2xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label className="text-base font-medium">
                            Decoration Theme
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Controls the doodles around the name.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {NAME_THEME_OPTIONS.map((theme) => {
                            const isSelected = theme.id === nameThemeId;

                            return (
                              <button
                                key={theme.id}
                                type="button"
                                disabled={isUploading}
                                onClick={() => setNameThemeId(theme.id)}
                                className={cn(
                                  "rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  isSelected
                                    ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
                                    : "border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 hover:bg-muted/45 dark:hover:bg-muted/20 text-foreground",
                                )}
                              >
                                <p className="text-sm font-semibold">
                                  {theme.label}
                                </p>
                                <p
                                  className={cn(
                                    "mt-1 text-xs",
                                    isSelected
                                      ? "text-primary/85"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {theme.subtitle}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Selected: {selectedNameTheme.label}
                        </p>
                      </div>

                      <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-3 rounded-2xl border p-4">
                        <Label
                          htmlFor="name-page-details"
                          className="text-base font-medium"
                        >
                          Optional extra details
                        </Label>
                        <Textarea
                          id="name-page-details"
                          name="name-page-details"
                          value={namePageDetails}
                          onChange={(event) =>
                            setNamePageDetails(event.target.value)
                          }
                          placeholder="Example: add bigger flowers in the top corners and keep open space around each letter"
                          className="min-h-[100px]"
                          disabled={isUploading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Keep this short for clean printable outlines.
                        </p>
                      </div>

                      <Button
                        onClick={handleNamePageGenerator}
                        disabled={isUploading || !isReadyToSubmit}
                        className="w-full gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="size-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icons.arrowRight className="size-4" />
                            Generate Name Page
                          </>
                        )}
                      </Button>
                      {!isReadyToSubmit ? (
                        <p className="text-xs text-muted-foreground">
                          Enter at least {NAME_MIN_LENGTH} characters for the
                          name.
                        </p>
                      ) : null}
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("consistent") ? (
                    <TabsContent value="consistent" className="space-y-4">
                      {isReferenceLoading ? (
                        <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 flex items-center gap-2 rounded-xl border p-3 text-sm text-muted-foreground">
                          <Icons.spinner className="size-4 animate-spin" />
                          Loading reference image from your results...
                        </div>
                      ) : null}
                      <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-4 rounded-2xl border p-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            Reference character image
                          </Label>
                          {!referenceFile && !referenceJobId ? (
                            <div
                              {...getReferenceRootProps()}
                              className={cn(
                                "border-border/70 bg-muted/40 dark:border-border/60 dark:bg-muted/20 flex cursor-pointer flex-col items-start rounded-2xl border-2 border-dashed p-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isReferenceDragActive
                                  ? "border-primary/70 bg-emerald-500/10"
                                  : "hover:border-primary/60 hover:bg-muted/60 dark:hover:bg-muted/30",
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
                              <div className="border-border/70 bg-muted/30 dark:border-border/60 dark:bg-muted/20 relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border">
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
                          {referenceCreations.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                  Or choose from your recent creations.
                                </p>
                                <Link
                                  href="/creations"
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  Open all
                                </Link>
                              </div>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {referenceCreations.map((creation) => {
                                  const isSelected =
                                    creation.id === referenceJobId;

                                  return (
                                    <button
                                      key={creation.id}
                                      type="button"
                                      disabled={isUploading}
                                      onClick={() =>
                                        handleSelectCreationReference(creation)
                                      }
                                      className={cn(
                                        "group rounded-xl p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        isSelected
                                          ? "bg-primary/5"
                                          : "hover:bg-muted/50",
                                      )}
                                      title={creation.inputFileName}
                                    >
                                      <div
                                        className={cn(
                                          "relative aspect-square overflow-hidden rounded-lg border",
                                          isSelected
                                            ? "ring-primary/40 border-primary ring-1"
                                            : "border-border/70 dark:border-border/60",
                                        )}
                                      >
                                        <Image
                                          src={creation.previewUrl}
                                          alt={`Reference ${creation.inputFileName}`}
                                          fill
                                          className="object-cover transition-transform group-hover:scale-[1.02]"
                                          sizes="(min-width: 640px) 20vw, 30vw"
                                        />
                                      </div>
                                      <p
                                        className={cn(
                                          "mt-1 truncate text-[11px] text-muted-foreground",
                                          isSelected &&
                                            "font-medium text-foreground",
                                        )}
                                      >
                                        {creation.inputFileName.replace(
                                          /\.[^/.]+$/,
                                          "",
                                        )}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No finished creations yet. Generate one first to
                              reuse it as a reference.
                            </p>
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
                            name="consistent-prompt"
                            value={consistentPrompt}
                            onChange={(e) =>
                              setConsistentPrompt(e.target.value)
                            }
                            placeholder="Example: same girl riding a bicycle through a flower market, smiling and waving"
                            className="min-h-[120px]"
                            disabled={isUploading}
                          />
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <p>
                              We keep core character identity while changing
                              scene/action.
                            </p>
                            <p
                              className={cn(
                                "shrink-0",
                                consistentPromptLength <
                                  MINIMUM_PROMPT_LENGTH &&
                                  "text-amber-600 dark:text-amber-300",
                              )}
                            >
                              {consistentPromptLength}/{MINIMUM_PROMPT_LENGTH}{" "}
                              min
                            </p>
                          </div>
                        </div>
                      </div>

                      {renderStylePicker(
                        "Style controls the new scene output before line-art conversion.",
                      )}

                      <Button
                        onClick={handleConsistentCharacters}
                        disabled={
                          isUploading ||
                          (!referenceFile && !referenceJobId) ||
                          consistentPromptLength < MINIMUM_PROMPT_LENGTH
                        }
                        className="w-full gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Icons.spinner className="size-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icons.arrowRight className="size-4" />
                            Generate Consistent Character Scene
                          </>
                        )}
                      </Button>
                      {!isReadyToSubmit ? (
                        <p className="text-xs text-muted-foreground">
                          Add a reference image and write at least{" "}
                          {MINIMUM_PROMPT_LENGTH} characters to generate.
                        </p>
                      ) : null}
                    </TabsContent>
                  ) : null}
                </Tabs>

                <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-4 rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Output Settings</p>
                      <p className="text-xs text-muted-foreground">
                        Private mode and upscale are paid-only features.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                        isPaidUser
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-100",
                      )}
                    >
                      {isPaidUser ? "Paid Active" : "Upgrade Required"}
                    </span>
                  </div>

                  {mode === "photo" ? (
                    <div className="border-border/70 bg-muted/35 dark:border-border/60 dark:bg-muted/20 space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Batch Generation ({batchCount})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generate multiple variations in one run
                        </p>
                      </div>
                      <input
                        type="range"
                        min={BATCH_MIN}
                        max={BATCH_MAX}
                        step={1}
                        value={batchCount}
                        disabled={isUploading}
                        onChange={(event) =>
                          setBatchCount(
                            Number.parseInt(event.target.value, 10) ||
                              BATCH_MIN,
                          )
                        }
                        className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                      />
                    </div>
                  ) : null}

                  <div className="border-border/70 bg-muted/35 dark:border-border/60 dark:bg-muted/20 flex items-start justify-between gap-3 rounded-xl border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">
                        Paid users default to private mode. Private jobs are
                        hidden from public listings.
                      </p>
                    </div>
                    <Switch
                      checked={isPrivateMode}
                      onCheckedChange={setIsPrivateMode}
                      disabled={!isPaidUser || isUploading}
                      aria-label="Toggle private mode"
                    />
                  </div>

                  <div className="border-border/70 bg-muted/35 dark:border-border/60 dark:bg-muted/20 flex items-start justify-between gap-3 rounded-xl border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Upscale</p>
                      <p className="text-xs text-muted-foreground">
                        Increase export resolution for cleaner print quality.
                      </p>
                    </div>
                    <Switch
                      checked={isUpscaleEnabled}
                      onCheckedChange={setIsUpscaleEnabled}
                      disabled={!isPaidUser || isUploading}
                      aria-label="Toggle upscale"
                    />
                  </div>
                </div>

                {isUploading ? (
                  <p className="sr-only" aria-live="polite">
                    Generation in progress. {uploadProgress}% complete.
                  </p>
                ) : null}

                {error ? (
                  <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
                    <Icons.warning className="size-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 space-y-4 rounded-2xl border p-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What You&rsquo;ll Get
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clean line art made for printing and coloring.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-2xl border p-3 text-left">
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
                  <div className="border-border/70 bg-background/70 dark:border-border/60 dark:bg-background/35 rounded-2xl border p-3 text-left">
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
                    Prompt and output settings tuned for coloring pages.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95 rounded-3xl border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.help className="size-5" />
              Tips for Best Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Use clear subjects and avoid crowded compositions.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                For consistent characters, use a front-facing reference with
                clear facial features.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Include action words in prompts: running, reading, flying,
                exploring.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                For name pages, shorter names usually produce cleaner bubble
                letters and better spacing.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Aspect ratio is set to Auto for best framing.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function FlowStep({
  id,
  title,
  description,
  state,
}: {
  id: string;
  title: string;
  description: string;
  state: "idle" | "active" | "done";
}) {
  return (
    <div
      className={cn(
        "border-border/70 bg-background/70 rounded-xl border p-3",
        state === "active" &&
          "border-primary/50 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.14)]",
        state === "done" && "border-primary/30 bg-secondary/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "border-border/80 inline-flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
            state === "active" && "border-primary/50 text-primary",
            state === "done" && "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          {state === "done" ? <Icons.check className="size-3.5" /> : id}
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
