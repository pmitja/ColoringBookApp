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
      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column - Form */}
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="relative z-10 space-y-4 border-b border-border bg-muted/50 p-8 pb-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-card p-3 text-primary shadow-sm ring-1 ring-border">
                <Wand2 className="size-8" />
              </div>
              <div>
                <CardTitle className="font-heading text-3xl font-bold text-foreground">
                  Book Studio
                </CardTitle>
                <CardDescription className="mt-1 text-lg leading-relaxed text-foreground/80">
                  Describe your idea, we&apos;ll draw the entire book.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-8 sm:p-10">
            <form onSubmit={submit} className="space-y-10">
              {/* Concept Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-base font-bold text-accent-foreground">
                    1
                  </span>
                  <h3 className="font-heading text-xl font-bold">The Concept</h3>
                </div>
                
                <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <div className="space-y-3">
                    <Label htmlFor="book-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
                      Book Title{" "}
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="book-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Magical Forest Adventures"
                      maxLength={120}
                      className="h-14 rounded-xl border-input bg-background px-5 text-base font-medium shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                      disabled={isGenerating || isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="book-prompt" className="flex justify-between text-base font-semibold text-foreground">
                      <span>Book Prompt</span>
                      <span className={cn("rounded-md border bg-muted px-2 py-1 text-xs font-semibold", prompt.length < MIN_PROMPT_LENGTH ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")}>
                        {prompt.length} / 2000
                      </span>
                    </Label>
                    <Textarea
                      id="book-prompt"
                      placeholder="e.g. Cute woodland animals learning letters in a playful forest classroom. Friendly and educational."
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[160px] resize-none rounded-xl border border-input bg-background p-5 text-base font-medium leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                      maxLength={2000}
                      disabled={isGenerating || isSubmitting}
                      required
                    />
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Icons.info className="size-4 shrink-0 text-primary" />
                      Be descriptive! This will be used to generate the cover and all interior pages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Style Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-base font-bold text-accent-foreground">
                    2
                  </span>
                  <h3 className="font-heading text-xl font-bold">The Look</h3>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/30">
                    <Label htmlFor="style-preset" className="mb-1 block text-base font-semibold text-foreground">Illustration Style</Label>
                    <Select
                      value={stylePreset}
                      onValueChange={(value) => setStylePreset(value as StylePreset)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="style-preset"
                        className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/25"
                      >
                        <SelectValue placeholder="Select style">
                          {stylePreset ? STYLE_PRESET_LABELS[stylePreset] : "Select style"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border shadow-md">
                        {STYLE_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset} className="cursor-pointer rounded-lg py-3 focus:bg-muted">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-foreground">{STYLE_PRESET_LABELS[preset]}</span>
                              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{STYLE_PRESET_DESCRIPTIONS[preset]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/30">
                    <Label htmlFor="paper-format" className="mb-1 block text-base font-semibold text-foreground">Paper Format</Label>
                    <Select
                      value={paperFormat}
                      onValueChange={(value) => setPaperFormat(value as PaperFormat)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="paper-format"
                        className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/25"
                      >
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border shadow-md">
                        {PAPER_FORMATS.map((format) => (
                          <SelectItem key={format} value={format} className="cursor-pointer rounded-lg py-3 focus:bg-muted">
                            <span className="font-semibold text-foreground">{format}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Length Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-base font-bold text-accent-foreground">
                    3
                  </span>
                  <h3 className="font-heading text-xl font-bold">The Size</h3>
                </div>
                
                <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/20 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="page-count" className="block text-base font-semibold text-foreground">Interior Pages</Label>
                      <span className="mt-1 block text-sm font-medium text-muted-foreground">
                        + Front and back cover automatically added
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2 shadow-sm">
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
                         className="h-10 w-16 border-0 bg-transparent p-0 text-center text-2xl font-bold text-foreground shadow-none focus-visible:ring-0"
                       />
                       <span className="text-sm font-semibold text-muted-foreground">pages</span>
                    </div>
                  </div>
                  <div className="px-2 pb-1 pt-2">
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
                  size="lg"
                  className={cn(
                    "w-full gap-3 rounded-full py-8 text-xl font-semibold",
                    !canSubmit && "opacity-70",
                    isGenerating && "pointer-events-none cursor-not-allowed opacity-60",
                  )}
                  disabled={!canSubmit || isGenerating || isSubmitting}
                >
                  {isSubmitting || isGenerating ? (
                    <>
                      <Loader2 className="size-8 animate-spin text-primary-foreground/90" />
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
                  <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
                    Please keep this page open while we prepare your book.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Status */}
        <div className="space-y-8 lg:sticky lg:top-24">
          <Card className={cn(
            "flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-all duration-500",
            isGenerating && "ring-1 ring-primary/20",
          )}>
            <CardHeader className={cn(
              "relative z-10 space-y-2 border-b border-border p-8 pb-6 transition-colors duration-500",
              isGenerating ? "bg-muted/50" : "bg-muted/30",
            )}>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-2xl font-bold text-foreground">Status</CardTitle>
                {isGenerating && (
                  <span className="relative flex size-4">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75"></span>
                    <span className="relative inline-flex size-4 rounded-full bg-primary"></span>
                  </span>
                )}
              </div>
              <CardDescription className="text-base font-medium text-foreground/75">
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
                          "rounded-full px-4 py-1.5 text-sm font-medium",
                          meta.status === "PROCESSING" && "bg-muted text-foreground",
                          meta.status === "DONE" && "bg-primary/15 text-primary",
                          meta.status === "FAILED" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {meta.status === "PROCESSING"
                          ? "Processing"
                          : meta.status === "DONE"
                            ? "Ready"
                            : "Failed"}
                      </Badge>
                      <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-semibold text-foreground">
                        <FileImage className="size-4 text-primary" />
                        {meta.completedAssets} / {meta.totalAssets}
                      </div>
                    </div>
                    
                    <div className="relative pt-2">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className="bg-primary h-full transition-all duration-500 ease-out"
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                      <div 
                        className="absolute right-0 top-0 -translate-y-full pb-1 text-xs font-semibold text-foreground transition-all duration-300"
                        style={{ left: `${progressValue}%`, transform: 'translateX(-50%)' }}
                      >
                        {progressValue}%
                      </div>
                    </div>
                  </div>

                  {meta.currentStep ? (
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-5">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        {meta.currentStep}
                      </p>
                    </div>
                  ) : null}
                  
                  {meta.error ? (
                    <div className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-red-800">
                      <Icons.warning className="mt-0.5 size-5 shrink-0 text-red-600" />
                      <p className="text-sm font-bold leading-tight">{meta.error}</p>
                    </div>
                  ) : null}

                  {canOpenGeneratedBook && (
                    <div className="pt-2 duration-500 animate-in fade-in slide-in-from-bottom-4">
                      <Link href={`/dashboard/book-editor/${activeBookId}`}>
                        <Button size="lg" className="group w-full rounded-full py-8 text-lg font-semibold">
                          Open Editor <ChevronRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-6 flex size-24 rotate-6 items-center justify-center rounded-2xl border border-border bg-muted/50 shadow-sm">
                    <BookOpenCheck className="size-12 -rotate-6 text-primary/70" />
                  </div>
                  <h4 className="mb-2 font-heading text-xl font-bold text-foreground">
                    Ready to Create
                  </h4>
                  <p className="max-w-[240px] text-sm font-medium leading-relaxed text-muted-foreground">
                    Fill out the form to start generating your custom coloring book.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <CardContent className="flex items-center gap-4 bg-muted/40 p-6">
              <div className="shrink-0 rounded-2xl bg-accent/60 p-4 text-primary">
                <BookOpen className="size-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">View Previous Books</h4>
                <p className="mt-1 text-sm font-medium text-foreground/75">Manage and edit your saved creations.</p>
              </div>
              <Link href="/dashboard/book-editor" className="ml-auto shrink-0">
                <Button variant="outline" size="icon" className="size-12 rounded-full">
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
