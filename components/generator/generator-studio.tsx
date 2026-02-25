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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
        <div>
          <Label className="text-xl font-heading font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-full border-2 border-slate-900 dark:border-slate-600">
               <Icons.palette className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            Style Selection
          </Label>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-slate-900 dark:border-slate-600 rounded-full px-4 py-1.5 text-xs font-black shadow-sm inline-flex items-center gap-2 self-start sm:self-auto text-slate-900 dark:text-slate-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 border border-slate-900"></span>
          </span>
          {STYLE_PRESETS[selectedStyle].label} Selected
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 relative z-10">
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
                "group relative overflow-hidden rounded-2xl border-2 p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
                isSelected
                  ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 shadow-md transform scale-[1.02]"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm",
              )}
            >
              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700"
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
                   <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-sm border-2 border-white">
                     <Icons.check className="size-3" />
                   </div>
                )}
              </div>
              <div className="p-2">
                 <p
                   className={cn(
                     "text-sm font-extrabold transition-colors",
                     isSelected ? "text-white dark:text-slate-900" : "text-slate-900 dark:text-slate-50 group-hover:text-purple-600 dark:group-hover:text-purple-400",
                   )}
                 >
                   {preset.label}
                 </p>
                 <p className={cn("line-clamp-1 text-xs font-bold mt-0.5", isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500")}>
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900 dark:text-slate-50">{heading}</h1>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
            {text}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] space-y-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
            <CardHeader className="bg-pink-50 dark:bg-pink-900/20 border-b-4 border-slate-900 dark:border-slate-700 p-6 relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="font-heading flex items-center gap-2 text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-full p-2 text-pink-500 dark:text-pink-400 shadow-sm">
                      <Icons.wandSparkles className="size-6" />
                    </div>
                    Generator Studio
                  </CardTitle>
                  <CardDescription className="text-base font-bold text-slate-600 dark:text-slate-400">
                    Pick your creation mode, tune style, and generate printable
                    line art.
                  </CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 dark:border-slate-600 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-sm">
                  <div className="bg-emerald-500 rounded-full p-0.5 text-white border border-emerald-700">
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
                      className="border-primary/20 bg-primary/5 space-y-4 rounded-2xl border p-5 relative overflow-hidden"
                      aria-live="polite"
                    >
                      <div className="absolute inset-0 bg-primary/5 -translate-x-[100%] animate-[shimmer_2s_infinite]" />
                      <div className="flex items-center justify-between gap-3 relative z-10">
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
                        <div className="bg-background rounded-full px-3 py-1 text-sm font-bold text-primary shadow-sm border">
                          {uploadProgress}%
                        </div>
                      </div>
                      <Progress value={uploadProgress} className="h-3 relative z-10" />
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
                          "bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 grid h-auto w-full rounded-[2rem] p-2",
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
                            className="rounded-3xl py-4 font-extrabold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] data-[state=active]:border-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-50"
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
                            className="rounded-3xl py-4 font-extrabold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] data-[state=active]:border-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-50"
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
                            className="rounded-3xl py-4 font-extrabold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] data-[state=active]:border-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-50"
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
                            className="rounded-3xl py-4 font-extrabold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:data-[state=active]:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] data-[state=active]:border-2 data-[state=active]:border-slate-900 dark:data-[state=active]:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-50"
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
                        <div className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
                          <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 pointer-events-none" />
                          <div
                            {...getPhotoRootProps()}
                            className={cn(
                              "relative z-10 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-4 border-dashed p-10 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
                              isPhotoDragActive
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[0.98]"
                                : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-blue-400 dark:hover:border-slate-600 hover:bg-blue-50/50 dark:hover:bg-slate-800",
                            )}
                          >
                            <input {...getPhotoInputProps()} />
                            <motion.div 
                              animate={isPhotoDragActive ? { scale: 1.1, rotate: [0, -10, 10, -10, 0] } : { scale: 1, rotate: 0 }}
                              transition={{ duration: 0.5 }}
                              className="bg-blue-100 dark:bg-blue-900/30 mb-6 flex size-20 items-center justify-center rounded-full shadow-sm border-2 border-slate-900 dark:border-slate-600"
                            >
                              <Icons.media className="size-10 text-blue-600" />
                            </motion.div>
                            {isPhotoDragActive ? (
                              <p className="text-xl font-extrabold text-blue-600">
                                Drop it to create magic! ✨
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-xl font-extrabold text-slate-900">
                                  Drag & drop a photo here
                                </p>
                                <p className="text-base text-slate-500 font-bold">
                                  or <span className="text-blue-600 hover:underline underline-offset-4 decoration-blue-300">click to browse</span> your device
                                </p>
                                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t-2 border-slate-200">
                                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-md">JPG</span>
                                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-md">PNG</span>
                                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-md">HEIC</span>
                                  <span className="text-xs text-slate-400 ml-1 font-bold">Up to 10MB</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] space-y-4"
                          >
                            <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-[1.5rem] border-4 border-slate-900 dark:border-slate-700 shadow-sm group bg-slate-100 dark:bg-slate-800">
                              {previewUrl && (
                                <>
                                  <Image
                                    src={previewUrl}
                                    alt="Upload preview"
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-500 mt-4">
                              <span className="bg-slate-100 rounded-full border-2 border-slate-200 px-4 py-1.5 font-bold shadow-sm flex items-center gap-2">
                                <Icons.file className="size-4 text-blue-500" />
                                <span className="max-w-[200px] truncate text-slate-700">{selectedFile.name}</span>
                              </span>
                              <span className="bg-slate-100 rounded-full border-2 border-slate-200 px-4 py-1.5 font-bold shadow-sm text-slate-700">
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
                         className="pt-2 flex gap-3"
                      >
                        <Button
                          onClick={handlePhotoUpload}
                          disabled={isUploading || !isReadyToSubmit}
                          className="flex-1 gap-3 rounded-full py-7 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform hover:translate-y-[2px] active:translate-y-[4px] group relative overflow-hidden bg-emerald-400 text-slate-900 border-2 border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          size="lg"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Processing Magic...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="size-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
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
                          className="bg-white rounded-full size-14 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:bg-red-50 hover:text-red-600 hover:border-slate-900 transition-all shrink-0 border-2 border-slate-900"
                          aria-label="Remove selected image"
                          title="Remove selected image"
                        >
                          <Icons.close className="size-6" />
                        </Button>
                      </motion.div>
                      {!isReadyToSubmit && (
                        <p className="text-center text-sm font-medium text-muted-foreground mt-4 animate-pulse">
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
                        className="bg-muted/30 dark:bg-slate-800/50 rounded-[2rem] border p-6 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
                        <Label
                          htmlFor="generator-prompt"
                          className="mb-5 flex items-center gap-2 text-xl font-heading font-bold"
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
                              className="focus-visible:ring-primary/40 focus-visible:border-primary/50 min-h-[160px] resize-none rounded-[1.5rem] bg-background/80 backdrop-blur-sm p-5 text-base shadow-inner text-foreground/90 placeholder:text-muted-foreground/60 border-2"
                              disabled={isUploading}
                            />
                            {generatorPromptLength > 0 && generatorPromptLength < MINIMUM_PROMPT_LENGTH && (
                              <div className="absolute bottom-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-amber-200/50 flex items-center gap-1.5">
                                <Icons.warning className="size-3" />
                                Need {MINIMUM_PROMPT_LENGTH - generatorPromptLength} more chars
                              </div>
                            )}
                            {generatorPromptLength >= MINIMUM_PROMPT_LENGTH && (
                              <div className="absolute bottom-4 right-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-emerald-200/50 flex items-center gap-1.5">
                                <Icons.check className="size-3" />
                                Ready
                              </div>
                            )}
                          </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-muted-foreground px-2">
                          <p className="flex items-center gap-1.5">
                            <Icons.info className="size-4 opacity-70" />
                            Be specific: subject, setting, action, and mood.
                          </p>
                          <p
                            className={cn(
                              "shrink-0 font-mono text-xs font-bold bg-muted/50 px-2 py-1 rounded-md",
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
                          className="w-full gap-3 rounded-full py-7 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform hover:translate-y-[2px] active:translate-y-[4px] group relative overflow-hidden bg-purple-400 text-slate-900 border-2 border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          size="lg"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="size-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                              <span className="relative z-10">Generate Line Art</span>
                              <Icons.arrowRight className="size-5 ml-1 opacity-70 group-hover:translate-x-1 transition-transform relative z-10" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="text-center text-sm font-medium text-muted-foreground mt-4 animate-pulse">
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
                        className="bg-muted/30 dark:bg-slate-800/50 rounded-[2rem] border p-6 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 -translate-y-1/4 -translate-x-1/4 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
                        <div className="relative z-10 space-y-4">
                          <Label
                            htmlFor="name-page-name"
                            className="flex items-center gap-2 text-xl font-heading font-bold"
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
                              className="h-16 text-2xl font-bold tracking-widest text-center rounded-[1.5rem] bg-background/80 backdrop-blur-sm border-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 shadow-inner"
                              maxLength={NAME_MAX_LENGTH}
                              disabled={isUploading}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-muted/80 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-muted-foreground shadow-sm border">
                              {namePageNameLength} / {NAME_MAX_LENGTH}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-2">
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
                        className="bg-background/80 backdrop-blur-sm space-y-5 rounded-[2rem] border border-border/50 p-6 shadow-sm relative overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                          <div>
                            <Label className="text-xl font-heading font-bold flex items-center gap-2">
                              <Icons.palette className="size-5 text-primary" />
                              Decoration Theme
                            </Label>
                            <p className="text-sm font-medium text-muted-foreground mt-1">
                              Controls the doodles around the name.
                            </p>
                          </div>
                          <div className="bg-muted/80 backdrop-blur-md border rounded-full px-3 py-1.5 text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
                             {selectedNameTheme?.label ?? (NAME_THEME_OPTIONS[0] ? NAME_THEME_OPTIONS[0].label : "")}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 relative z-10">
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
                                  "group relative overflow-hidden rounded-[1.5rem] border-2 p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  isSelected
                                    ? "bg-primary/5 border-primary shadow-md"
                                    : "bg-background/60 hover:bg-muted/40 hover:border-primary/30 border-transparent shadow-sm",
                                )}
                              >
                                {isSelected && (
                                  <motion.div 
                                    layoutId="theme-active-indicator"
                                    className="absolute inset-0 bg-primary/5 pointer-events-none"
                                  />
                                )}
                                <div className="relative z-10 flex items-start justify-between gap-2">
                                  <div>
                                    <p className={cn("text-base font-bold transition-colors", isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80")}>
                                      {theme.label}
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-1 text-xs font-medium leading-relaxed transition-colors",
                                        isSelected
                                          ? "text-foreground/80"
                                          : "text-muted-foreground group-hover:text-muted-foreground/80",
                                      )}
                                    >
                                      {theme.subtitle}
                                    </p>
                                  </div>
                                  <div className={cn(
                                    "shrink-0 rounded-full border-2 p-1 transition-colors",
                                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-transparent bg-background/50"
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
                        className="bg-background/80 backdrop-blur-sm space-y-4 rounded-[2rem] border border-border/50 p-6 shadow-sm"
                      >
                        <Label
                          htmlFor="name-page-details"
                          className="flex items-center gap-2 text-xl font-heading font-bold"
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
                          className="min-h-[100px] resize-none rounded-[1.5rem] bg-background p-4 text-base focus-visible:ring-primary/40 focus-visible:border-primary/50 shadow-inner border-2"
                          disabled={isUploading}
                        />
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2">
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
                          className="w-full gap-3 rounded-full py-7 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform hover:translate-y-[2px] active:translate-y-[4px] group relative overflow-hidden bg-pink-400 text-slate-900 border-2 border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          size="lg"
                        >
                           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.wandSparkles className="size-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                              <span className="relative z-10">Generate Name Page</span>
                              <Icons.arrowRight className="size-5 ml-1 opacity-70 group-hover:translate-x-1 transition-transform relative z-10" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="text-center text-sm font-medium text-muted-foreground mt-4 animate-pulse">
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
                        className="bg-muted/30 dark:bg-slate-800/50 rounded-[2rem] border p-6 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
                        <div className="relative z-10 space-y-5">
                          <Label className="flex items-center gap-2 text-xl font-heading font-bold">
                            <Icons.userCircle className="size-5 text-primary" />
                            Reference Character
                          </Label>
                          
                          {!referenceFile && !referenceJobId ? (
                            <div
                              {...getReferenceRootProps()}
                              className={cn(
                                "border-border/70 bg-background/80 dark:border-border/60 dark:bg-muted/10 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed p-8 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isReferenceDragActive
                                  ? "border-primary bg-primary/5 scale-[0.98] shadow-inner"
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
                                Drop character image or <span className="text-primary hover:underline underline-offset-4 decoration-primary/30">browse</span>
                              </p>
                              <p className="mt-2 text-sm font-medium text-muted-foreground">
                                Use the same character you want to keep consistent across scenes.
                              </p>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="border-border/70 bg-background/80 dark:border-border/60 dark:bg-muted/10 space-y-4 rounded-[1.5rem] border p-5 shadow-sm"
                            >
                              <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-4 border-background shadow-lg group">
                                {(referencePreviewUrl || referenceJobPreviewUrl) && (
                                  <>
                                    <Image
                                      src={referencePreviewUrl || referenceJobPreviewUrl || ""}
                                      alt="Reference character preview"
                                      fill
                                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col items-center gap-3">
                                <p className="text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/50">
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
                                  className="rounded-full shadow-sm hover:shadow-md hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                                  size="sm"
                                >
                                  <Icons.trash className="size-4 mr-2" />
                                  Remove Reference
                                </Button>
                              </div>
                            </motion.div>
                          )}
                          
                          {referenceCreations && referenceCreations.length > 0 ? (
                            <div className="space-y-3 pt-4 border-t border-border/50 mt-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                  <Icons.library className="size-4 text-primary" />
                                  Recent Creations
                                </p>
                                <Link
                                  href="/creations"
                                  className="text-xs font-bold text-primary hover:underline underline-offset-4 decoration-primary/30 bg-primary/5 px-2 py-1 rounded-md"
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
                                            : "border-transparent dark:border-border/60",
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
                                           <div className="absolute inset-0 bg-primary/10" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-muted-foreground bg-muted/40 p-4 rounded-xl border border-border/50 text-center">
                              No creations yet. Generate one to reuse it here!
                            </p>
                          )}
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-background/80 backdrop-blur-sm space-y-4 rounded-[2rem] border border-border/50 p-6 shadow-sm"
                      >
                        <Label
                          htmlFor="consistent-prompt"
                          className="flex items-center gap-2 text-xl font-heading font-bold"
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
                            className="focus-visible:ring-primary/40 focus-visible:border-primary/50 min-h-[140px] resize-none rounded-[1.5rem] bg-background p-5 text-base shadow-inner text-foreground/90 placeholder:text-muted-foreground/60 border-2"
                            disabled={isUploading}
                          />
                          {consistentPromptLength > 0 && consistentPromptLength < MINIMUM_PROMPT_LENGTH && (
                            <div className="absolute bottom-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-amber-200/50 flex items-center gap-1.5">
                              <Icons.warning className="size-3" />
                              Need {MINIMUM_PROMPT_LENGTH - consistentPromptLength} chars
                            </div>
                          )}
                          {consistentPromptLength >= MINIMUM_PROMPT_LENGTH && (
                            <div className="absolute bottom-4 right-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-emerald-200/50 flex items-center gap-1.5">
                              <Icons.check className="size-3" />
                              Ready
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-2">
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
                          className="w-full gap-3 rounded-full py-7 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform hover:translate-y-[2px] active:translate-y-[4px] group relative overflow-hidden bg-blue-400 text-slate-900 border-2 border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          size="lg"
                        >
                           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                          {isUploading ? (
                            <>
                              <Icons.spinner className="size-6 animate-spin text-slate-900" />
                              <span className="relative z-10">Weaving Spells...</span>
                            </>
                          ) : (
                            <>
                              <Icons.userCircle className="size-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                              <span className="relative z-10">Generate Consistent Scene</span>
                              <Icons.arrowRight className="size-5 ml-1 opacity-70 group-hover:translate-x-1 transition-transform relative z-10" />
                            </>
                          )}
                        </Button>
                        {!isReadyToSubmit && (
                          <p className="text-center text-sm font-medium text-muted-foreground mt-4 animate-pulse">
                            Add a reference and description to begin.
                          </p>
                        )}
                      </motion.div>
                    </TabsContent>
                  )}
                </Tabs>

                  <div className="space-y-4 xl:sticky xl:top-6">
                  <div className="bg-white dark:bg-slate-900 space-y-5 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 p-5 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
                    <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-heading font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                          <Icons.settings className="size-5 text-slate-900 dark:text-slate-50" />
                          Output Settings
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                          Customize your generation preferences
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest shadow-sm border-2",
                          isPaidUser
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
                        )}
                      >
                        {isPaidUser ? "Pro Active ✨" : "Upgrade to Pro"}
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      {mode === "photo" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-slate-50 dark:bg-slate-800 space-y-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                                <Icons.copy className="size-4 text-blue-500" />
                                Batch Generation
                              </p>
                              <p className="text-xs text-slate-500 font-bold">
                                Generate {batchCount} variations in one run
                              </p>
                            </div>
                            <div className="bg-blue-100 text-blue-700 font-black px-3 py-1 rounded-full text-sm border border-blue-200">
                              x{batchCount}
                            </div>
                          </div>
                          <div className="pt-2 px-1">
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
                            <div className="flex justify-between mt-2 text-xs font-black text-slate-400">
                              <span>1</span>
                              <span>2</span>
                              <span>3</span>
                              <span>4</span>
                              <span>5</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="bg-white dark:bg-slate-800 flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-colors hover:border-slate-400 dark:hover:border-slate-600">
                        <div className="space-y-1.5 flex-1">
                          <p className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                            <Icons.user className="size-4 text-purple-500 dark:text-purple-400" />
                            Private Mode
                          </p>
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            Hide your creations from the public gallery. Included in Pro.
                          </p>
                        </div>
                        <Switch
                          checked={isPrivateMode}
                          onCheckedChange={setIsPrivateMode}
                          disabled={!isPaidUser || isUploading}
                          aria-label="Toggle private mode"
                          className="data-[state=checked]:bg-purple-500 border-2 border-slate-200"
                        />
                      </div>

                      <div className="bg-white flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 p-5 shadow-sm transition-colors hover:border-slate-400">
                        <div className="space-y-1.5 flex-1">
                          <p className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                            <Icons.arrowUpRight className="size-4 text-pink-500" />
                            High-Res Upscale
                          </p>
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            Export in 4K resolution for crisper prints. Included in Pro.
                          </p>
                        </div>
                        <Switch
                          checked={isUpscaleEnabled}
                          onCheckedChange={setIsUpscaleEnabled}
                          disabled={!isPaidUser || isUploading}
                          aria-label="Toggle upscale"
                          className="data-[state=checked]:bg-pink-500 border-2 border-slate-200"
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

              <div className="bg-white dark:bg-slate-900 space-y-5 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 p-5 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden xl:sticky xl:top-6 h-fit mt-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
                <div className="space-y-1.5 relative z-10">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Icons.package className="size-4" />
                    What You&rsquo;ll Get
                  </h3>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
                    Perfect, crisp line art generated specifically for coloring.
                  </p>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 relative z-10">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 text-left shadow-sm group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
                      <Image
                        src="/illustrations/lineart-sample.svg"
                        alt="Line art sample"
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-50">
                        <Icons.imagePlus className="size-4 text-blue-500" />
                        HD PNG Image
                      </p>
                      <span className="bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md">Transparent</span>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 text-left shadow-sm group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
                      <Image
                        src="/illustrations/color-sample.svg"
                        alt="Print ready preview"
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-50">
                        <Icons.fileText className="size-4 text-purple-500" />
                        Print-Ready PDF
                      </p>
                      <span className="bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md">A4 Size</span>
                    </div>
                  </motion.div>
                </div>

                <div className="relative z-10 pt-4 border-t-2 border-slate-100 dark:border-slate-700">
                  <ul className="space-y-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2.5">
                      <div className="bg-emerald-100 rounded-full p-1 mt-0.5 text-emerald-600">
                        <Icons.check className="size-3" />
                      </div>
                      <span className="leading-snug">Vector-like crisp outlines that kids can color easily without bleeding.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="bg-emerald-100 rounded-full p-1 mt-0.5 text-emerald-600">
                        <Icons.check className="size-3" />
                      </div>
                      <span className="leading-snug">Optimized for standard US Letter / A4 home & classroom printers.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="bg-emerald-100 rounded-full p-1 mt-0.5 text-emerald-600">
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
          <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-heading font-extrabold text-slate-900">
                <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 border-2 border-slate-900">
                  <Icons.help className="size-5" />
                </div>
                Tips for Magical Results ✨
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4 sm:grid-cols-2 text-sm font-bold text-slate-600">
                <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-200 transition-colors hover:border-slate-400 hover:bg-white">
                  <div className="bg-purple-100 text-purple-600 rounded-full p-1 shrink-0 mt-0.5 border border-purple-200">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">Keep descriptions specific but simple. <strong className="text-slate-900">Avoid crowded scenes</strong> or too many tiny details.</span>
                </li>
                <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-200 transition-colors hover:border-slate-400 hover:bg-white">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-1 shrink-0 mt-0.5 border border-blue-200">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">For consistent characters, use a <strong className="text-slate-900">front-facing reference</strong> with clear facial features.</span>
                </li>
                <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-200 transition-colors hover:border-slate-400 hover:bg-white">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full p-1 shrink-0 mt-0.5 border border-emerald-200">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">Include <strong className="text-slate-900">dynamic action words</strong> like: running, reading, flying, or exploring.</span>
                </li>
                <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-200 transition-colors hover:border-slate-400 hover:bg-white">
                  <div className="bg-pink-100 text-pink-600 rounded-full p-1 shrink-0 mt-0.5 border border-pink-200">
                    <Icons.wandSparkles className="size-3" />
                  </div>
                  <span className="leading-relaxed">For Name Pages, <strong className="text-slate-900">shorter names</strong> create cleaner bubble letters and better overall spacing.</span>
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
        "rounded-[1.5rem] border-2 p-4 shadow-sm transition-all duration-300 relative overflow-hidden",
        state === "active" &&
          "border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] scale-[1.02]",
        state === "done" && "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 opacity-80",
        state === "idle" && "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60 grayscale-[50%] hover:grayscale-0 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-600"
      )}
    >
      <div className="flex items-center gap-3 relative z-10">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full text-sm font-black shadow-sm border-2 transition-colors",
            state === "active" && "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100",
            state === "done" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
            state === "idle" && "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600"
          )}
        >
          {state === "done" ? <Icons.check className="size-4" /> : id}
        </span>
        <div>
          <p className={cn("text-base font-extrabold", state === "idle" ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-50")}>{title}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
