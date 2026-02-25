"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, BookOpen, ChevronRight, FileImage, Type, BookOpenCheck, Loader2, Wand2, Paintbrush, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const MIN_PROMPT_LENGTH = 12;
const DEFAULT_PAGE_COUNT = 10;
const MIN_PAGE_COUNT = 1;
const MAX_PAGE_COUNT = 40;
const PAPER_FORMATS = ["A3", "A4", "A5"] as const;
const DEFAULT_PAPER_FORMAT = "A4";
const STYLE_PRESETS = [
  "CLASSIC",
  "PLAYFUL_ROUNDED",
  "BOLD_SIMPLE",
  "DETAILED_COZY",
  "WHIMSICAL",
] as const;
const DEFAULT_STYLE_PRESET = "CLASSIC";

type PaperFormat = (typeof PAPER_FORMATS)[number];
type StylePreset = (typeof STYLE_PRESETS)[number];

const STYLE_PRESET_LABELS: Record<StylePreset, string> = {
  CLASSIC: "Classic outline",
  PLAYFUL_ROUNDED: "Playful & Rounded",
  BOLD_SIMPLE: "Bold & Simple",
  DETAILED_COZY: "Detailed & Cozy",
  WHIMSICAL: "Whimsical Storybook",
};

const STYLE_PRESET_DESCRIPTIONS: Record<StylePreset, string> = {
  CLASSIC: "Standard coloring book style with clean lines.",
  PLAYFUL_ROUNDED: "Soft edges, cute proportions, great for kids.",
  BOLD_SIMPLE: "Thick lines, minimalistic details, easy to color.",
  DETAILED_COZY: "Intricate patterns, relaxing to color for adults.",
  WHIMSICAL: "Magical feel, dynamic flowing lines and elements.",
};

type GenerationStatus = "PROCESSING" | "DONE" | "FAILED";

interface AIColorBookMeta {
  status: GenerationStatus;
  completedAssets: number;
  totalAssets: number;
  currentStep?: string;
  error?: string;
}

function clampPageCount(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_COUNT;
  return Math.max(MIN_PAGE_COUNT, Math.min(MAX_PAGE_COUNT, Math.round(value)));
}

function parseMeta(payload: unknown): AIColorBookMeta | null {
  if (typeof payload !== "object" || payload === null) return null;
  const maybeBook = payload as { data?: unknown };
  if (typeof maybeBook.data !== "object" || maybeBook.data === null)
    return null;

  const maybeData = maybeBook.data as { meta?: unknown };
  if (typeof maybeData.meta !== "object" || maybeData.meta === null)
    return null;

  const aiColorBook = (maybeData.meta as { aiColorBook?: unknown }).aiColorBook;
  if (typeof aiColorBook !== "object" || aiColorBook === null) return null;

  const meta = aiColorBook as {
    status?: unknown;
    completedAssets?: unknown;
    totalAssets?: unknown;
    currentStep?: unknown;
    error?: unknown;
  };

  if (
    meta.status !== "PROCESSING" &&
    meta.status !== "DONE" &&
    meta.status !== "FAILED"
  ) {
    return null;
  }

  return {
    status: meta.status,
    completedAssets:
      typeof meta.completedAssets === "number" ? meta.completedAssets : 0,
    totalAssets: typeof meta.totalAssets === "number" ? meta.totalAssets : 0,
    currentStep:
      typeof meta.currentStep === "string" ? meta.currentStep : undefined,
    error: typeof meta.error === "string" ? meta.error : undefined,
  };
}

export default function AIColorBookGenerator() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [pageCount, setPageCount] = useState(DEFAULT_PAGE_COUNT);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>(
    DEFAULT_PAPER_FORMAT,
  );
  const [stylePreset, setStylePreset] = useState<StylePreset>(
    DEFAULT_STYLE_PRESET,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [meta, setMeta] = useState<AIColorBookMeta | null>(null);

  const isGenerating = Boolean(activeBookId);
  const canOpenGeneratedBook = Boolean(activeBookId && meta?.status === "DONE");
  const canSubmit =
    !isSubmitting &&
    !isGenerating &&
    prompt.trim().length >= MIN_PROMPT_LENGTH &&
    pageCount >= MIN_PAGE_COUNT &&
    pageCount <= MAX_PAGE_COUNT;

  const progressValue = useMemo(() => {
    if (!meta || meta.totalAssets <= 0) return 0;
    return Math.max(
      0,
      Math.min(
        100,
        Math.round((meta.completedAssets / meta.totalAssets) * 100),
      ),
    );
  }, [meta]);

  const pollGenerationStatus = useCallback(async () => {
    if (!activeBookId) return;

    try {
      const response = await fetch(`/api/books/${activeBookId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch generation status.");
      }

      const payload = await response.json();
      const nextMeta = parseMeta(payload);
      if (nextMeta) {
        setMeta(nextMeta);
      }

      if (nextMeta?.status === "DONE") {
        toast.success("Book is ready. Opening editor...");
        setActiveBookId(null);
        router.push(`/dashboard/book-editor/${activeBookId}`);
        router.refresh();
        return;
      }

      if (nextMeta?.status === "FAILED") {
        toast.error(nextMeta.error || "Book generation failed.");
        setActiveBookId(null);
      }
    } catch (error) {
      console.error("AI color book status polling failed:", error);
    }
  }, [activeBookId, router]);

  useEffect(() => {
    if (!activeBookId) return;

    void pollGenerationStatus();
    const interval = setInterval(() => {
      void pollGenerationStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeBookId, pollGenerationStatus]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
        toast.error(
          `Prompt must be at least ${MIN_PROMPT_LENGTH} characters long.`,
        );
        return;
      }

      const clampedCount = clampPageCount(pageCount);
      setPageCount(clampedCount);

      setIsSubmitting(true);
      setMeta(null);

      try {
        const response = await fetch("/api/books/ai-color-book", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            title: title.trim() || null,
            pageCount: clampedCount,
            paperFormat,
            stylePreset,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to start book generation.");
        }

        if (!payload?.bookId || typeof payload.bookId !== "string") {
          throw new Error("Server did not return a valid book id.");
        }

        setActiveBookId(payload.bookId);
        const nextMeta = parseMeta({ data: payload?.data });
        if (nextMeta) {
          setMeta(nextMeta);
        }
        toast.success("Book generation started.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to start book generation.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [pageCount, paperFormat, prompt, stylePreset, title],
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Left Column - Form */}
        <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="relative z-10 space-y-4 border-b-4 border-slate-900 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20 p-8 pb-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 p-3 text-purple-600 dark:text-purple-400 shadow-sm">
                <Wand2 className="size-8" />
              </div>
              <div>
                <CardTitle className="font-heading text-4xl font-extrabold text-slate-900 dark:text-slate-50">Book Studio</CardTitle>
                <CardDescription className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-1">
                  Describe your idea, we'll draw the entire book.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-8 sm:p-10">
            <form onSubmit={submit} className="space-y-10">
              {/* Concept Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full border-2 border-slate-900 dark:border-slate-600">
                    <BookOpen className="size-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <h3 className="font-heading text-2xl font-black">1. The Concept</h3>
                </div>
                
                <div className="grid gap-6 rounded-3xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 shadow-none transition-all focus-within:border-slate-900 dark:focus-within:border-slate-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                  <div className="space-y-3">
                    <Label htmlFor="book-title" className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-slate-50">
                      Book Title <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">(Optional)</span>
                    </Label>
                    <Input
                      id="book-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Magical Forest Adventures"
                      maxLength={120}
                      className="h-14 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 text-lg font-bold focus-visible:ring-0 focus-visible:border-slate-900 dark:focus-visible:border-slate-500 placeholder:text-slate-300 dark:placeholder:text-slate-500 dark:text-slate-50"
                      disabled={isGenerating || isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="book-prompt" className="text-lg font-black flex justify-between text-slate-900 dark:text-slate-50">
                      <span>Book Prompt</span>
                      <span className={cn("text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-md border-2", prompt.length < MIN_PROMPT_LENGTH ? "text-red-500 dark:text-red-400 border-red-200 dark:border-red-800" : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600")}>
                        {prompt.length} / 2000
                      </span>
                    </Label>
                    <Textarea
                      id="book-prompt"
                      placeholder="e.g. Cute woodland animals learning letters in a playful forest classroom. Friendly and educational."
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[160px] resize-none rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 text-lg font-medium leading-relaxed focus-visible:ring-0 focus-visible:border-slate-900 dark:focus-visible:border-slate-500 placeholder:text-slate-300 dark:placeholder:text-slate-500 dark:text-slate-50"
                      maxLength={2000}
                      disabled={isGenerating || isSubmitting}
                      required
                    />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <Icons.info className="size-4" />
                      Be descriptive! This will be used to generate the cover and all interior pages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Style Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                  <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full border-2 border-slate-900 dark:border-slate-600">
                    <Paintbrush className="size-5 text-pink-700 dark:text-pink-400" />
                  </div>
                  <h3 className="font-heading text-2xl font-black">2. The Look</h3>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3 rounded-3xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800">
                    <Label htmlFor="style-preset" className="text-lg font-black block mb-1 text-slate-900 dark:text-slate-50">Illustration Style</Label>
                    <Select
                      value={stylePreset}
                      onValueChange={(value) => setStylePreset(value as StylePreset)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="style-preset"
                        className="h-14 w-full rounded-2xl bg-white dark:bg-slate-800 px-4 text-base font-bold focus:ring-0 border-2 border-slate-300 dark:border-slate-600 shadow-sm focus:border-slate-900 dark:focus:border-slate-500 dark:text-slate-50"
                      >
                        <SelectValue placeholder="Select style">
                          {stylePreset ? STYLE_PRESET_LABELS[stylePreset] : "Select style"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-slate-900 shadow-lg">
                        {STYLE_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset} className="rounded-xl py-3 cursor-pointer focus:bg-slate-100 focus:font-bold">
                            <div className="flex flex-col text-left">
                              <span className="font-black text-slate-900">{STYLE_PRESET_LABELS[preset]}</span>
                              <span className="text-xs font-bold text-slate-500 mt-0.5">{STYLE_PRESET_DESCRIPTIONS[preset]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 rounded-3xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800">
                    <Label htmlFor="paper-format" className="text-lg font-black block mb-1 text-slate-900 dark:text-slate-50">Paper Format</Label>
                    <Select
                      value={paperFormat}
                      onValueChange={(value) => setPaperFormat(value as PaperFormat)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="paper-format"
                        className="h-14 w-full rounded-2xl bg-white dark:bg-slate-800 px-4 text-base font-bold focus:ring-0 border-2 border-slate-300 dark:border-slate-600 shadow-sm focus:border-slate-900 dark:focus:border-slate-500 dark:text-slate-50"
                      >
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-slate-900 shadow-lg">
                        {PAPER_FORMATS.map((format) => (
                          <SelectItem key={format} value={format} className="rounded-xl py-3 cursor-pointer focus:bg-slate-100">
                            <span className="font-black text-slate-900">{format}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Length Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full border-2 border-slate-900 dark:border-slate-600">
                    <Layers className="size-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-heading text-2xl font-black">3. The Size</h3>
                </div>
                
                <div className="space-y-6 rounded-3xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 sm:p-8 shadow-none hover:border-slate-400 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="page-count" className="text-lg font-black block text-slate-900 dark:text-slate-50">Interior Pages</Label>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                        + Front and back cover automatically added
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 px-4 py-2 border-2 border-slate-300 dark:border-slate-600 shadow-sm">
                       <Input
                         id="page-count"
                         type="number"
                         min={MIN_PAGE_COUNT}
                         max={MAX_PAGE_COUNT}
                         value={pageCount}
                         onChange={(event) => {
                           const parsed = Number.parseInt(event.target.value, 10);
                           if (Number.isNaN(parsed)) {
                             setPageCount(DEFAULT_PAGE_COUNT);
                             return;
                           }
                           setPageCount(clampPageCount(parsed));
                         }}
                         disabled={isGenerating || isSubmitting}
                         className="w-16 h-10 border-0 bg-transparent p-0 text-center font-black text-2xl focus-visible:ring-0 shadow-none text-slate-900 dark:text-slate-50"
                       />
                       <span className="text-sm font-extrabold text-slate-400 dark:text-slate-500">pages</span>
                    </div>
                  </div>
                  <div className="pt-2 pb-1 px-2">
                    <Slider
                      min={MIN_PAGE_COUNT}
                      max={MAX_PAGE_COUNT}
                      step={1}
                      value={[pageCount]}
                      onValueChange={([value]) => setPageCount(clampPageCount(value))}
                      disabled={isGenerating || isSubmitting}
                      className="cursor-pointer py-4"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className={cn(
                    "w-full gap-3 rounded-full py-8 text-2xl font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all border-2 border-slate-900 bg-yellow-400 text-slate-900 hover:bg-yellow-500",
                    canSubmit ? "hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[4px]" : "opacity-80 grayscale",
                    isGenerating && "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed pointer-events-none"
                  )}
                  disabled={!canSubmit || isGenerating || isSubmitting}
                >
                  {isSubmitting || isGenerating ? (
                    <>
                      <Loader2 className="size-8 animate-spin text-slate-400" />
                      {isGenerating ? "Generating Magic..." : "Starting..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-8" />
                      Generate Coloring Book
                    </>
                  )}
                </Button>
                {isGenerating && (
                  <p className="text-center text-sm font-bold text-slate-400 mt-4 animate-pulse">
                    Please keep this page open while we prepare your book.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Status */}
        <div className="lg:sticky lg:top-24 space-y-8">
          <Card className={cn(
            "rounded-[2rem] border-4 flex flex-col overflow-hidden transition-all duration-500",
            isGenerating 
              ? "border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]" 
              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-none border-dashed"
          )}>
            <CardHeader className={cn(
              "relative z-10 space-y-2 border-b-4 pb-6 transition-colors duration-500 p-8",
              isGenerating ? "bg-yellow-50 dark:bg-yellow-900/20 border-slate-900 dark:border-slate-700" : "bg-transparent border-slate-200 dark:border-slate-700"
            )}>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-3xl font-extrabold text-slate-900 dark:text-slate-50">Status</CardTitle>
                {isGenerating && (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border-2 border-slate-900"></span>
                  </span>
                )}
              </div>
              <CardDescription className="font-bold text-slate-500 dark:text-slate-400">
                Live generation progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-1 flex-col justify-center p-8">
              {meta ? (
                <div className="space-y-8 py-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          meta.status === "DONE"
                            ? "default"
                            : meta.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                        className={cn(
                          "rounded-full px-4 py-1.5 text-sm font-black shadow-sm border-2",
                          meta.status === "PROCESSING" && "bg-yellow-100 text-yellow-700 border-yellow-300",
                          meta.status === "DONE" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                          meta.status === "FAILED" && "bg-red-100 text-red-700 border-red-300"
                        )}
                      >
                        {meta.status === "PROCESSING"
                          ? "✨ Processing"
                          : meta.status === "DONE"
                            ? "✅ Ready!"
                            : "❌ Failed"}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm font-black text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border-2 border-slate-200">
                        <FileImage className="size-4 text-slate-400" />
                        {meta.completedAssets} / {meta.totalAssets}
                      </div>
                    </div>
                    
                    <div className="relative pt-2">
                      <div className="h-4 w-full bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 transition-all duration-500 ease-out border-r-2 border-slate-900"
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                      <div 
                        className="absolute right-0 top-0 -translate-y-full pb-1 text-xs font-black text-slate-900 transition-all duration-300"
                        style={{ left: `${progressValue}%`, transform: 'translateX(-50%)' }}
                      >
                        {progressValue}%
                      </div>
                    </div>
                  </div>

                  {meta.currentStep ? (
                    <div className="flex items-center justify-center gap-3 rounded-2xl bg-blue-50 p-5 border-2 border-blue-100">
                      <Loader2 className="size-5 animate-spin text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">
                        {meta.currentStep}
                      </p>
                    </div>
                  ) : null}
                  
                  {meta.error ? (
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 flex items-start gap-3 text-red-800">
                      <Icons.warning className="size-5 mt-0.5 shrink-0 text-red-600" />
                      <p className="text-sm font-bold leading-tight">{meta.error}</p>
                    </div>
                  ) : null}

                  {canOpenGeneratedBook && (
                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <Link href={`/dashboard/book-editor/${activeBookId}`}>
                        <Button className="w-full rounded-full py-8 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-emerald-400 text-slate-900 border-2 border-slate-900 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] group transition-all">
                          Open Editor <ChevronRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                  <div className="mb-6 flex size-24 items-center justify-center rounded-[2rem] bg-white dark:bg-slate-800 rotate-6 shadow-sm border-4 border-slate-300 dark:border-slate-600">
                    <BookOpenCheck className="text-slate-300 dark:text-slate-500 size-12 -rotate-6" />
                  </div>
                  <h4 className="font-heading text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">Ready to Create</h4>
                  <p className="text-sm font-bold text-slate-300 dark:text-slate-400 max-w-[200px] leading-relaxed">
                    Fill out the form to start generating your custom coloring book.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="rounded-2xl bg-purple-100 dark:bg-purple-900/30 p-4 border-2 border-slate-900 dark:border-slate-600 shrink-0">
                <BookOpen className="size-6 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-slate-50">View Previous Books</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Manage and edit your saved creations.</p>
              </div>
              <Link href="/dashboard/book-editor" className="ml-auto shrink-0">
                <Button variant="ghost" size="icon" className="rounded-full size-12 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-50">
                  <ChevronRight className="size-6" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
