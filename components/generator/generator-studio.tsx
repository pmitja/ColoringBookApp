"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="relative z-10 mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <Label className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <div className="rounded-full bg-accent/60 p-1.5 text-primary">
               <Icons.palette className="size-5" />
            </div>
            Style Selection
          </Label>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-accent/50 px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm sm:self-auto">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
          </span>
          {STYLE_PRESETS[selectedStyle].label} Selected
        </div>
      </div>
      <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {styleKeys.map((styleId, index) => {
          const preset = STYLE_PRESETS[styleId];
          const isSelected = selectedStyle === styleId;

          return (
            <motion.button
              key={styleId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              type="button"
              disabled={isUploading}
              onClick={() => setSelectedStyle(styleId)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
                isSelected
                  ? "scale-[1.02] border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/30 hover:shadow-sm",
              )}
            >
                <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted"
              >
                <Image
                  src={preset.previewImage}
                  alt={`${preset.label} style preview`}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-700 ease-out",
                    isSelected ? "scale-105" : "group-hover:scale-110"
                  )}
                  sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 24vw, 44vw"
                />
                
                {isSelected && (
                   <div className="absolute right-2 top-2 rounded-full border-2 border-white bg-emerald-500 p-1 text-white shadow-sm">
                     <Icons.check className="size-3" />
                   </div>
                )}
              </div>
              <div className="p-2">
                 <p
                   className={cn(
                     "text-sm font-semibold transition-colors",
                     isSelected ? "text-primary-foreground" : "text-foreground group-hover:text-primary",
                   )}
                 >
                   {preset.label}
                 </p>
                 <p className={cn("mt-0.5 line-clamp-1 text-xs font-medium", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                   {preset.subtitle}
                 </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <DashboardHeader heading={heading} text={text} />

      <div className="mx-auto max-w-[96rem] space-y-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="relative z-10 space-y-4 border-b border-border bg-accent/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
                    <div className="rounded-full bg-card p-2 text-primary shadow-sm ring-1 ring-border">
                      <Icons.wandSparkles className="size-6" />
                    </div>
                    Generator Studio
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Pick your creation mode, tune style, and generate printable
                    line art.
                  </CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
                  <div className="rounded-full bg-primary/15 p-0.5 text-primary">
                    <Icons.check className="size-3" />
                  </div>
                  Original files not stored
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {stepStates.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <FlowStep
                      id={step.id}
                      title={step.title}
                      description={step.description}
                      state={step.state}
                    />
                  </motion.div>
                ))}
              </div>
            </CardHeader>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative z-10 p-5 md:p-6"
          >
            <AnimatePresence mode="wait">
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="border-primary/20 bg-primary/5 relative space-y-4 overflow-hidden rounded-2xl border p-5"
                      aria-live="polite"
                    >
                      <div className="bg-primary/5 absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]" />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/20 rounded-full p-2">
                            <Icons.spinner className="size-5 animate-spin text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              Generating your coloring page
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Keep this tab open. We’ll redirect automatically.
                            </p>
                          </div>
                        </div>
                        <div className="rounded-full border bg-background px-3 py-1 text-sm font-bold text-primary shadow-sm">
                          {uploadProgress}%
                        </div>
                      </div>
                      <Progress value={uploadProgress} className="relative z-10 h-3" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)] xl:items-start">
                  <Tabs
                    value={mode}
                    onValueChange={(value) => {
                      const nextMode = value as UploadMode;
                      if (!availableModes.includes(nextMode)) return;
                      setMode(nextMode);
                      setError(null);
                    }}
                    className="space-y-6 xl:min-w-0"
                  >
                    {showModeTabs ? (
                      <TabsList
                        className={cn(
                          "grid h-auto w-full rounded-full bg-muted p-1",
                          availableModes.length === 2
                            ? "grid-cols-2"
                            : availableModes.length === 3
                              ? "grid-cols-3"
                              : "grid-cols-4",
                        )}
                      >
                        {availableModes.includes("photo") && (
                          <TabsTrigger
                            value="photo"
                            className="rounded-full py-3 font-semibold text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Icons.media className="size-5" />
                              <span>Photo Upload</span>
                            </div>
                          </TabsTrigger>
                        )}
                        {availableModes.includes("ai") && (
                          <TabsTrigger
                            value="ai"
                            className="rounded-full py-3 font-semibold text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Icons.wandSparkles className="size-5" />
                              <span>AI Generator</span>
                            </div>
                          </TabsTrigger>
                        )}
                        {availableModes.includes("name") && (
                          <TabsTrigger
                            value="name"
                            className="rounded-full py-3 font-semibold text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Icons.page className="size-5" />
                              <span>Name Pages</span>
                            </div>
                          </TabsTrigger>
                        )}
                        {availableModes.includes("consistent") && (
                          <TabsTrigger
                            value="consistent"
                            className="rounded-full py-3 font-semibold text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Icons.userCircle className="size-5" />
                              <span>Characters</span>
                            </div>
                          </TabsTrigger>
                        )}
                      </TabsList>
                    ) : null}

                  {availableModes.includes("photo") && (
                    <TabsContent value="photo" className="space-y-6">
                      {!selectedFile ? (
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
                          <div className="pointer-events-none absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10" />
                          <div
                            {...getPhotoRootProps()}
                            className={cn(
                              "relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 p-10 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              isPhotoDragActive
                                ? "scale-[0.98] border-primary bg-accent/40"
                                : "hover:border-primary hover:bg-accent/30",
                            )}
                          >
                            <input {...getPhotoInputProps()} />
                            <motion.div 
                              animate={isPhotoDragActive ? { scale: 1.1, rotate: [0, -10, 10, -10, 0] } : { scale: 1, rotate: 0 }}
                              transition={{ duration: 0.5 }}
                              className="mb-6 flex size-20 items-center justify-center rounded-full border border-border bg-card shadow-sm"
                            >
                              <Icons.media className="size-10 text-primary" />
                            </motion.div>
                            {isPhotoDragActive ? (
                              <p className="text-xl font-semibold text-primary">
                                Drop it to create magic!
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-xl font-semibold text-foreground">
                                  Drag & drop a photo here
                                </p>
                                <p className="text-base font-medium text-muted-foreground">
                                  or <span className="text-primary underline-offset-4 hover:underline">click to browse</span> your device
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-4">
                                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">JPG</span>
                                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">PNG</span>
                                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">HEIC</span>
                                  <span className="ml-1 text-xs font-medium text-muted-foreground">Up to 10MB</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
                          >
                            <div className="group relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                              {previewUrl && (
                                <>
                                  <Image
                                    src={previewUrl}
                                    alt="Upload preview"
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                </>
                              )}
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-slate-500">
                              <span className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-slate-100 px-4 py-1.5 font-bold shadow-sm">
                                <Icons.file className="size-4 text-blue-500" />
                                <span className="max-w-[200px] truncate text-slate-700">{selectedFile.name}</span>
                              </span>
                              <span className="rounded-full border-2 border-slate-200 bg-slate-100 px-4 py-1.5 font-bold text-slate-700 shadow-sm">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          </motion.div>
                      )}

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.1 }}
                      >
                        {renderStylePicker()}
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                         className="flex gap-3 pt-2"
                      >
                        <Button
                          onClick={handlePhotoUpload}
                          disabled={isUploading || !isReadyToSubmit}
                          className="group relative flex-1 gap-3 rounded-full py-7 text-lg font-semibold"
                          size="lg"
                        >
                          <div className="pointer-events-none absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Processing Magic...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="relative z-10 size-6 transition-transform duration-300 group-hover:rotate-12" />
                              <span className="relative z-10">
                                {batchCount > 1
                                  ? `Process ${batchCount} Photos`
                                  : "Turn into Line Art"}
                              </span>
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
                          className="size-14 shrink-0 rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove selected image"
                          title="Remove selected image"
                        >
                          <Icons.close className="size-6" />
                        </Button>
                      </motion.div>
                      {!isReadyToSubmit && (
                        <p className="mt-4 animate-pulse text-center text-sm font-medium text-muted-foreground">
                          Upload a photo to enable generation.
                        </p>
                      )}
                    </TabsContent>
                  )}

                  {availableModes.includes("ai") ? (
                    <TabsContent value="ai" className="space-y-8">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/30 relative overflow-hidden rounded-[2rem] border p-6 shadow-sm dark:bg-slate-800/50"
                      >
                        <div className="bg-primary/20 absolute right-0 top-0 size-32 -translate-y-1/4 translate-x-1/4 rounded-full blur-3xl" />
                        <Label
                          htmlFor="generator-prompt"
                          className="mb-5 flex items-center gap-2 font-heading text-xl font-bold"
                        >
                          <Icons.sparkles className="size-5 text-primary" />
                          Describe your coloring page
                        </Label>
                          <div className="relative">
                            <Textarea
                              id="generator-prompt"
                              name="generator-prompt"
                              value={generatorPrompt}
                              onChange={(e) => setGeneratorPrompt(e.target.value)}
                              placeholder="Example: a cheerful fox teacher in a cozy forest classroom, kids sitting on mushroom stools reading books, clean simple background..."
                              className="focus-visible:ring-primary/40 focus-visible:border-primary/50 bg-background/80 text-foreground/90 placeholder:text-muted-foreground/60 min-h-[160px] resize-none rounded-3xl border-2 p-5 text-base shadow-inner backdrop-blur-sm"
                              disabled={isUploading}
                            />
                            {generatorPromptLength > 0 && generatorPromptLength < MINIMUM_PROMPT_LENGTH && (
                              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
                                <Icons.warning className="size-3" />
                                Need {MINIMUM_PROMPT_LENGTH - generatorPromptLength} more chars
                              </div>
                            )}
                            {generatorPromptLength >= MINIMUM_PROMPT_LENGTH && (
                              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400">
                                <Icons.check className="size-3" />
                                Ready
                              </div>
                            )}
                          </div>
                        <div className="mt-4 flex items-center justify-between gap-3 px-2 text-sm font-medium text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Icons.info className="size-4 opacity-70" />
                            Be specific: subject, setting, action, and mood.
                          </p>
                          <p
                            className={cn(
                              "bg-muted/50 shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold",
                              generatorPromptLength < MINIMUM_PROMPT_LENGTH
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {generatorPromptLength} / {MINIMUM_PROMPT_LENGTH} min
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.1 }}
                      >
                        {renderStylePicker(
                          "This style guides the AI scene generation.",
                        )}
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                         className="pt-2"
                      >
                        <Button
                          onClick={handleAIGenerator}
                          disabled={isUploading || !isReadyToSubmit}
                          className="group relative w-full gap-3 rounded-full py-7 text-lg font-semibold"
                          size="lg"
                        >
                          <div className="pointer-events-none absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="relative z-10 size-6 transition-transform duration-300 group-hover:rotate-12" />
                              <span className="relative z-10">Generate Line Art</span>
                              <Icons.arrowRight className="relative z-10 ml-1 size-5 opacity-70 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="mt-4 animate-pulse text-center text-sm font-medium text-muted-foreground">
                            Write a bit more to unlock generation.
                          </p>
                        )}
                      </motion.div>
                    </TabsContent>
                  ) : null}

                  {availableModes.includes("name") && (
                    <TabsContent value="name" className="space-y-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/30 relative overflow-hidden rounded-[2rem] border p-6 shadow-sm dark:bg-slate-800/50"
                      >
                        <div className="bg-primary/20 absolute left-0 top-0 size-32 -translate-x-1/4 -translate-y-1/4 rounded-full blur-3xl" />
                        <div className="relative z-10 space-y-4">
                          <Label
                            htmlFor="name-page-name"
                            className="flex items-center gap-2 font-heading text-xl font-bold"
                          >
                            <Icons.page className="size-5 text-primary" />
                            Name to Generate
                          </Label>
                          <div className="relative">
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
                              className="bg-background/80 focus-visible:ring-primary/40 focus-visible:border-primary/50 h-16 rounded-3xl border-2 text-center text-2xl font-bold tracking-widest shadow-inner backdrop-blur-sm"
                              maxLength={NAME_MAX_LENGTH}
                              disabled={isUploading}
                            />
                            <div className="bg-muted/80 absolute right-4 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur-md">
                              {namePageNameLength} / {NAME_MAX_LENGTH}
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
                            <p className="flex items-center gap-1.5">
                              <Icons.info className="size-4 opacity-70" />
                              Letters, spaces, apostrophes, and hyphens only.
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-background/80 border-border/50 relative space-y-5 overflow-hidden rounded-[2rem] border p-6 shadow-sm backdrop-blur-sm"
                      >
                        <div className="relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <Label className="flex items-center gap-2 font-heading text-xl font-bold">
                              <Icons.palette className="size-5 text-primary" />
                              Decoration Theme
                            </Label>
                            <p className="mt-1 text-sm font-medium text-muted-foreground">
                              Controls the doodles around the name.
                            </p>
                          </div>
                          <div className="bg-muted/80 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-md">
                             {selectedNameTheme?.label ?? (NAME_THEME_OPTIONS[0] ? NAME_THEME_OPTIONS[0].label : "")}
                          </div>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {NAME_THEME_OPTIONS.map((theme, index) => {
                            const isSelected = theme.id === nameThemeId;

                            return (
                              <motion.button
                                key={theme.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                type="button"
                                disabled={isUploading}
                                onClick={() => setNameThemeId(theme.id)}
                                className={cn(
                                  "group relative overflow-hidden rounded-3xl border-2 p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  isSelected
                                    ? "bg-primary/5 border-primary shadow-md"
                                    : "bg-background/60 hover:bg-muted/40 hover:border-primary/30 border-transparent shadow-sm",
                                )}
                              >
                                {isSelected && (
                                  <motion.div 
                                    layoutId="theme-active-indicator"
                                    className="bg-primary/5 pointer-events-none absolute inset-0"
                                  />
                                )}
                                <div className="relative z-10 flex items-start justify-between gap-2">
                                  <div>
                                    <p className={cn("text-base font-bold transition-colors", isSelected ? "text-primary" : "group-hover:text-primary/80 text-foreground")}>
                                      {theme.label}
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-1 text-xs font-medium leading-relaxed transition-colors",
                                        isSelected
                                          ? "text-foreground/80"
                                          : "group-hover:text-muted-foreground/80 text-muted-foreground",
                                      )}
                                    >
                                      {theme.subtitle}
                                    </p>
                                  </div>
                                  <div className={cn(
                                    "shrink-0 rounded-full border-2 p-1 transition-colors",
                                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background/50 text-transparent"
                                  )}>
                                     <Icons.check className="size-3" />
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-background/80 border-border/50 space-y-4 rounded-[2rem] border p-6 shadow-sm backdrop-blur-sm"
                      >
                        <Label
                          htmlFor="name-page-details"
                          className="flex items-center gap-2 font-heading text-xl font-bold"
                        >
                          <Icons.settings className="size-5 text-primary" />
                          Optional Tweaks
                        </Label>
                        <Textarea
                          id="name-page-details"
                          name="name-page-details"
                          value={namePageDetails}
                          onChange={(event) =>
                            setNamePageDetails(event.target.value)
                          }
                          placeholder="Example: add bigger flowers in the top corners and keep open space around each letter"
                          className="focus-visible:ring-primary/40 focus-visible:border-primary/50 min-h-[100px] resize-none rounded-3xl border-2 bg-background p-4 text-base shadow-inner"
                          disabled={isUploading}
                        />
                        <p className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
                          <Icons.info className="size-4 opacity-70" />
                          Keep this short for clean printable outlines.
                        </p>
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.3 }}
                         className="pt-2"
                      >
                        <Button
                          onClick={handleNamePageGenerator}
                          disabled={isUploading || !isReadyToSubmit}
                          className="group relative w-full gap-3 rounded-full py-7 text-lg font-semibold"
                          size="lg"
                        >
                           <div className="pointer-events-none absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="relative z-10 size-6 transition-transform duration-300 group-hover:rotate-12" />
                              <span className="relative z-10">Generate Name Page</span>
                              <Icons.arrowRight className="relative z-10 ml-1 size-5 opacity-70 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="mt-4 animate-pulse text-center text-sm font-medium text-muted-foreground">
                            Enter a name to start generation.
                          </p>
                        )}
                      </motion.div>
                    </TabsContent>
                  )}

                  {availableModes.includes("consistent") && (
                    <TabsContent value="consistent" className="space-y-6">
                      {isReferenceLoading && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-xl border p-4 text-sm font-medium text-primary shadow-sm"
                        >
                          <div className="bg-primary/20 rounded-full p-1.5">
                            <Icons.spinner className="size-4 animate-spin" />
                          </div>
                          Loading reference image from your results...
                        </motion.div>
                      )}
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/30 relative overflow-hidden rounded-[2rem] border p-6 shadow-sm dark:bg-slate-800/50"
                      >
                        <div className="bg-primary/20 absolute right-0 top-0 size-32 -translate-y-1/4 translate-x-1/4 rounded-full blur-3xl" />
                        <div className="relative z-10 space-y-5">
                          <Label className="flex items-center gap-2 font-heading text-xl font-bold">
                            <Icons.userCircle className="size-5 text-primary" />
                            Reference Character
                          </Label>
                          
                          {!referenceFile && !referenceJobId ? (
                            <div
                              {...getReferenceRootProps()}
                              className={cn(
                                "border-border/70 bg-background/80 dark:border-border/60 dark:bg-muted/10 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isReferenceDragActive
                                  ? "bg-primary/5 scale-[0.98] border-primary shadow-inner"
                                  : "hover:border-primary/50 hover:bg-muted/60 dark:hover:bg-muted/30 hover:shadow-sm",
                              )}
                            >
                              <input {...getReferenceInputProps()} />
                              <motion.div 
                                animate={isReferenceDragActive ? { scale: 1.1, rotate: [0, -10, 10, -10, 0] } : { scale: 1, rotate: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full shadow-sm"
                              >
                                <Icons.imagePlus className="size-8 text-primary" />
                              </motion.div>
                              <p className="text-lg font-bold text-foreground">
                                Drop character image or <span className="decoration-primary/30 text-primary underline-offset-4 hover:underline">browse</span>
                              </p>
                              <p className="mt-2 text-sm font-medium text-muted-foreground">
                                Use the same character you want to keep consistent across scenes.
                              </p>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="border-border/70 bg-background/80 dark:border-border/60 dark:bg-muted/10 space-y-4 rounded-3xl border p-5 shadow-sm"
                            >
                              <div className="group relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border shadow-md">
                                {(referencePreviewUrl || referenceJobPreviewUrl) && (
                                  <>
                                    <Image
                                      src={referencePreviewUrl || referenceJobPreviewUrl || ""}
                                      alt="Reference character preview"
                                      fill
                                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col items-center gap-3">
                                <p className="bg-muted/50 border-border/50 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                                  {referenceJobId
                                    ? "Linked from a previous generation"
                                    : "Uploaded from your device"}
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isUploading}
                                  onClick={() => {
                                    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
                                    setReferenceFile(null);
                                    setReferencePreviewUrl(null);
                                    setReferenceJobId(null);
                                    setReferenceJobPreviewUrl(null);
                                  }}
                                  className="hover:bg-destructive/10 hover:border-destructive/30 rounded-full shadow-sm transition-all hover:text-destructive hover:shadow-md"
                                  size="sm"
                                >
                                  <Icons.trash className="mr-2 size-4" />
                                  Remove Reference
                                </Button>
                              </div>
                            </motion.div>
                          )}
                          
                          {referenceCreations && referenceCreations.length > 0 ? (
                            <div className="border-border/50 mt-4 space-y-3 border-t pt-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-foreground/80 flex items-center gap-2 text-sm font-semibold">
                                  <Icons.library className="size-4 text-primary" />
                                  Recent Creations
                                </p>
                                <Link
                                  href="/creations"
                                  className="decoration-primary/30 bg-primary/5 rounded-md px-2 py-1 text-xs font-bold text-primary underline-offset-4 hover:underline"
                                >
                                  View Gallery
                                </Link>
                              </div>
                              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                                {referenceCreations.map((creation) => {
                                  const isSelected = creation.id === referenceJobId;

                                  return (
                                    <button
                                      key={creation.id}
                                      type="button"
                                      disabled={isUploading}
                                      onClick={() => handleSelectCreationReference(creation)}
                                      className={cn(
                                        "group rounded-2xl p-1.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        isSelected
                                          ? "bg-primary/10 shadow-sm"
                                          : "hover:bg-muted/60 bg-transparent",
                                      )}
                                      title={creation.inputFileName}
                                    >
                                      <div
                                        className={cn(
                                          "relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                                          isSelected
                                            ? "border-primary shadow-sm"
                                            : "dark:border-border/60 border-transparent",
                                        )}
                                      >
                                        <Image
                                          src={creation.previewUrl}
                                          alt={`Reference ${creation.inputFileName}`}
                                          fill
                                          className={cn(
                                            "object-cover transition-transform duration-500",
                                            isSelected ? "scale-105" : "group-hover:scale-110"
                                          )}
                                          sizes="(min-width: 640px) 20vw, 30vw"
                                        />
                                        {isSelected && (
                                           <div className="bg-primary/10 absolute inset-0" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="bg-muted/40 border-border/50 rounded-xl border p-4 text-center text-sm font-medium text-muted-foreground">
                              No creations yet. Generate one to reuse it here!
                            </p>
                          )}
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-background/80 border-border/50 space-y-4 rounded-[2rem] border p-6 shadow-sm backdrop-blur-sm"
                      >
                        <Label
                          htmlFor="consistent-prompt"
                          className="flex items-center gap-2 font-heading text-xl font-bold"
                        >
                          <Icons.wandSparkles className="size-5 text-primary" />
                          New Scene Context
                        </Label>
                        <div className="relative">
                          <Textarea
                            id="consistent-prompt"
                            name="consistent-prompt"
                            value={consistentPrompt}
                            onChange={(e) => setConsistentPrompt(e.target.value)}
                            placeholder="Example: the same little girl riding a bicycle through a sunny flower market, smiling and waving..."
                            className="focus-visible:ring-primary/40 focus-visible:border-primary/50 text-foreground/90 placeholder:text-muted-foreground/60 min-h-[140px] resize-none rounded-3xl border-2 bg-background p-5 text-base shadow-inner"
                            disabled={isUploading}
                          />
                          {consistentPromptLength > 0 && consistentPromptLength < MINIMUM_PROMPT_LENGTH && (
                            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
                              <Icons.warning className="size-3" />
                              Need {MINIMUM_PROMPT_LENGTH - consistentPromptLength} chars
                            </div>
                          )}
                          {consistentPromptLength >= MINIMUM_PROMPT_LENGTH && (
                            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400">
                              <Icons.check className="size-3" />
                              Ready
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <Icons.info className="size-4 opacity-70" />
                            We keep the character identity, you describe the action.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                      >
                        {renderStylePicker(
                          "Style controls the new scene output before line-art conversion.",
                        )}
                      </motion.div>

                      <motion.div
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.3 }}
                         className="pt-2"
                      >
                        <Button
                          onClick={handleConsistentCharacters}
                          disabled={
                            isUploading ||
                            (!referenceFile && !referenceJobId) ||
                            consistentPromptLength < MINIMUM_PROMPT_LENGTH
                          }
                          className="group relative w-full gap-3 rounded-full py-7 text-lg font-semibold"
                          size="lg"
                        >
                           <div className="pointer-events-none absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.userCircle className="relative z-10 size-6 transition-transform duration-300 group-hover:rotate-12" />
                              <span className="relative z-10">Generate Consistent Scene</span>
                              <Icons.arrowRight className="relative z-10 ml-1 size-5 opacity-70 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="mt-4 animate-pulse text-center text-sm font-medium text-muted-foreground">
                            Add a reference and description to begin.
                          </p>
                        )}
                      </motion.div>
                    </TabsContent>
                  )}
                </Tabs>

                  <div className="space-y-4 xl:sticky xl:top-6">
                  <div className="relative space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="space-y-1">
                        <h3 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                          <Icons.settings className="size-5 text-foreground" />
                          Output Settings
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          Customize your generation preferences
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm",
                          isPaidUser
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                        )}
                      >
                        {isPaidUser ? "Pro Active" : "Upgrade to Pro"}
                      </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                      {mode === "photo" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-3 rounded-2xl border border-border bg-muted/40 p-5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                                <Icons.copy className="size-4 text-primary" />
                                Batch Generation
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">
                                Generate {batchCount} variations in one run
                              </p>
                            </div>
                            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                              x{batchCount}
                            </div>
                          </div>
                          <div className="px-1 pt-2">
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
                              className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground">
                              <span>1</span>
                              <span>2</span>
                              <span>3</span>
                              <span>4</span>
                              <span>5</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
                        <div className="flex-1 space-y-1.5">
                          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Icons.user className="size-4 text-primary" />
                            Private Mode
                          </p>
                          <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                            Hide your creations from the public gallery. Included in Pro.
                          </p>
                        </div>
                        <Switch
                          checked={isPrivateMode}
                          onCheckedChange={setIsPrivateMode}
                          disabled={!isPaidUser || isUploading}
                          aria-label="Toggle private mode"
                          className="border-border data-[state=checked]:bg-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
                        <div className="flex-1 space-y-1.5">
                          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Icons.arrowUpRight className="size-4 text-primary" />
                            High-Res Upscale
                          </p>
                          <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                            Export in 4K resolution for crisper prints. Included in Pro.
                          </p>
                        </div>
                        <Switch
                          checked={isUpscaleEnabled}
                          onCheckedChange={setIsUpscaleEnabled}
                          disabled={!isPaidUser || isUploading}
                          aria-label="Toggle upscale"
                          className="border-border data-[state=checked]:bg-primary"
                        />
                      </div>
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
              </div>

              <div className="relative mt-6 h-fit space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm xl:sticky xl:top-6">
                <div className="relative z-10 space-y-1.5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icons.package className="size-4" />
                    What You&rsquo;ll Get
                  </h3>
                  <p className="font-heading text-lg font-bold text-foreground">
                    Perfect, crisp line art generated specifically for coloring.
                  </p>
                </div>
                
                <div className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="group rounded-2xl border border-border bg-muted/40 p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card">
                      <Image
                        src="/illustrations/lineart-sample.svg"
                        alt="Line art sample"
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Icons.imagePlus className="size-4 text-primary" />
                        HD PNG Image
                      </p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Transparent</span>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="group rounded-2xl border border-border bg-muted/40 p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card">
                      <Image
                        src="/illustrations/color-sample.svg"
                        alt="Print ready preview"
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Icons.fileText className="size-4 text-primary" />
                        Print-Ready PDF
                      </p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">A4 Size</span>
                    </div>
                  </motion.div>
                </div>

                <div className="relative z-10 border-t border-border pt-4">
                  <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600">
                        <Icons.check className="size-3" />
                      </div>
                      <span className="leading-snug">Vector-like crisp outlines that kids can color easily without bleeding.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600">
                        <Icons.check className="size-3" />
                      </div>
                      <span className="leading-snug">Optimized for standard US Letter / A4 home & classroom printers.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-600">
                        <Icons.check className="size-3" />
                      </div>
                      <span className="leading-snug">Custom AI pipeline tuned specifically for coloring book formats.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 font-heading text-xl font-bold text-foreground">
                <div className="rounded-full bg-accent/60 p-2 text-primary">
                  <Icons.help className="size-5" />
                </div>
                Tips for great results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4 text-sm font-medium text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/60">
                  <div className="mt-0.5 shrink-0 rounded-full bg-accent/60 p-1 text-primary">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">Keep descriptions specific but simple. <strong className="text-foreground">Avoid crowded scenes</strong> or too many tiny details.</span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/60">
                  <div className="mt-0.5 shrink-0 rounded-full bg-accent/60 p-1 text-primary">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">For consistent characters, use a <strong className="text-foreground">front-facing reference</strong> with clear facial features.</span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/60">
                  <div className="mt-0.5 shrink-0 rounded-full bg-accent/60 p-1 text-primary">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">Include <strong className="text-foreground">dynamic action words</strong> like: running, reading, flying, or exploring.</span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted/60">
                  <div className="mt-0.5 shrink-0 rounded-full bg-accent/60 p-1 text-primary">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">For Name Pages, <strong className="text-foreground">shorter names</strong> create cleaner bubble letters and better overall spacing.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
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
        "relative overflow-hidden rounded-3xl border-2 p-4 shadow-sm transition-all duration-300",
        state === "active" &&
          "scale-[1.01] border-primary bg-accent/50 shadow-sm",
        state === "done" && "border-border bg-muted/80 opacity-90",
        state === "idle" && "border-border bg-muted/40 opacity-70 hover:opacity-100"
      )}
    >
      <div className="relative z-10 flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition-colors",
            state === "active" && "border-primary bg-primary text-primary-foreground",
            state === "done" && "border-primary/30 bg-primary/15 text-primary",
            state === "idle" && "border-border bg-muted text-muted-foreground"
          )}
        >
          {state === "done" ? <Icons.check className="size-4" /> : id}
        </span>
        <div>
          <p className={cn("text-base font-semibold", state === "idle" ? "text-muted-foreground" : "text-foreground")}>{title}</p>
          <p className="mt-0.5 text-xs font-medium leading-tight text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
