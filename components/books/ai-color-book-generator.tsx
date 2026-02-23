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
        <Card className="playful-card overflow-hidden border-2 shadow-xl shadow-primary/5">
          <CardHeader className="relative z-10 space-y-4 border-b border-border/50 bg-muted/20 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20">
                <Wand2 className="size-6" />
              </div>
              <div>
                <CardTitle className="font-heading text-3xl">Book Studio</CardTitle>
                <CardDescription className="text-base font-medium mt-1">
                  Describe your idea, we'll draw the entire book.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-6 sm:p-8">
            <form onSubmit={submit} className="space-y-8">
              {/* Concept Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground/80">
                  <BookOpen className="size-5" />
                  <h3 className="font-heading text-xl">1. The Concept</h3>
                </div>
                
                <div className="grid gap-5 rounded-2xl border-2 border-border/50 bg-background/50 p-5 shadow-sm transition-all focus-within:border-primary/30 focus-within:bg-background focus-within:shadow-md">
                  <div className="space-y-2">
                    <Label htmlFor="book-title" className="text-base font-bold flex items-center gap-2">
                      Book Title <span className="text-muted-foreground font-medium text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="book-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Magical Forest Adventures"
                      maxLength={120}
                      className="h-12 rounded-xl bg-muted/40 px-4 text-base focus-visible:ring-primary/50"
                      disabled={isGenerating || isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="book-prompt" className="text-base font-bold flex justify-between">
                      <span>Book Prompt</span>
                      <span className={cn("text-xs font-medium", prompt.length < MIN_PROMPT_LENGTH ? "text-destructive" : "text-muted-foreground")}>
                        {prompt.length} / 2000
                      </span>
                    </Label>
                    <Textarea
                      id="book-prompt"
                      placeholder="e.g. Cute woodland animals learning letters in a playful forest classroom. Friendly and educational."
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[140px] resize-none rounded-xl bg-muted/40 p-4 text-base leading-relaxed focus-visible:ring-primary/50"
                      maxLength={2000}
                      disabled={isGenerating || isSubmitting}
                      required
                    />
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                      Be descriptive! This will be used to generate the cover and all interior pages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Style Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Paintbrush className="size-5" />
                  <h3 className="font-heading text-xl">2. The Look</h3>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2 rounded-2xl border-2 border-border/50 bg-background/50 p-4 shadow-sm hover:border-border/80 transition-colors">
                    <Label htmlFor="style-preset" className="text-base font-bold block mb-1">Illustration Style</Label>
                    <Select
                      value={stylePreset}
                      onValueChange={(value) => setStylePreset(value as StylePreset)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="style-preset"
                        className="h-12 w-full rounded-xl bg-muted/40 px-4 text-base focus:ring-primary/50 border-0 shadow-sm ring-1 ring-inset ring-border/50 [&>span]:line-clamp-1 [&>span]:text-left text-left"
                      >
                        <SelectValue placeholder="Select style">
                          {stylePreset ? STYLE_PRESET_LABELS[stylePreset] : "Select style"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {STYLE_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset} className="rounded-lg py-3 cursor-pointer">
                            <div className="flex flex-col text-left">
                              <span className="font-bold">{STYLE_PRESET_LABELS[preset]}</span>
                              <span className="text-xs text-muted-foreground mt-0.5">{STYLE_PRESET_DESCRIPTIONS[preset]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 rounded-2xl border-2 border-border/50 bg-background/50 p-4 shadow-sm hover:border-border/80 transition-colors">
                    <Label htmlFor="paper-format" className="text-base font-bold block mb-1">Paper Format</Label>
                    <Select
                      value={paperFormat}
                      onValueChange={(value) => setPaperFormat(value as PaperFormat)}
                      disabled={isGenerating || isSubmitting}
                    >
                      <SelectTrigger
                        id="paper-format"
                        className="h-12 w-full rounded-xl bg-muted/40 px-4 text-base focus:ring-primary/50 border-0 shadow-sm ring-1 ring-inset ring-border/50"
                      >
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {PAPER_FORMATS.map((format) => (
                          <SelectItem key={format} value={format} className="rounded-lg py-2 cursor-pointer">
                            <span className="font-bold">{format}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Length Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Layers className="size-5" />
                  <h3 className="font-heading text-xl">3. The Size</h3>
                </div>
                
                <div className="space-y-6 rounded-2xl border-2 border-border/50 bg-background/50 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="page-count" className="text-base font-bold block">Interior Pages</Label>
                      <span className="text-sm font-medium text-muted-foreground mt-0.5 block">
                        + Front and back cover automatically added
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 px-3 py-1.5 ring-1 ring-inset ring-border/50">
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
                         className="w-12 h-8 border-0 bg-transparent p-0 text-center font-bold text-lg focus-visible:ring-0 shadow-none"
                       />
                       <span className="text-sm font-bold text-muted-foreground/70 pr-1">pages</span>
                    </div>
                  </div>
                  <div className="pt-2 pb-1 px-1">
                    <Slider
                      min={MIN_PAGE_COUNT}
                      max={MAX_PAGE_COUNT}
                      step={1}
                      value={[pageCount]}
                      onValueChange={([value]) => setPageCount(clampPageCount(value))}
                      disabled={isGenerating || isSubmitting}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className={cn(
                    "w-full gap-2 rounded-2xl py-7 text-xl font-bold shadow-xl transition-all",
                    canSubmit ? "hover:scale-[1.01] hover:shadow-primary/25 active:scale-[0.99]" : "opacity-80",
                    isGenerating && "bg-primary/90 cursor-not-allowed pointer-events-none"
                  )}
                  disabled={!canSubmit || isGenerating || isSubmitting}
                >
                  {isSubmitting || isGenerating ? (
                    <>
                      <Loader2 className="size-6 animate-spin" />
                      {isGenerating ? "Generating Magic..." : "Starting..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-6" />
                      Generate Coloring Book
                    </>
                  )}
                </Button>
                {isGenerating && (
                  <p className="text-center text-sm font-medium text-muted-foreground mt-4 animate-pulse">
                    Please keep this page open while we prepare your book.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Status */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <Card className={cn(
            "playful-card flex flex-col overflow-hidden transition-all duration-500",
            isGenerating ? "border-primary/50 shadow-lg shadow-primary/10 ring-4 ring-primary/10" : "border-2 border-border/50 shadow-sm"
          )}>
            <CardHeader className={cn(
              "relative z-10 space-y-2 border-b pb-5 transition-colors duration-500",
              isGenerating ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/50"
            )}>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-2xl">Status</CardTitle>
                {isGenerating && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>
              <CardDescription>
                Live generation progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-1 flex-col justify-center p-6">
              {meta ? (
                <div className="space-y-8 py-2">
                  <div className="space-y-3">
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
                          "rounded-full px-4 py-1.5 text-sm font-bold shadow-sm",
                          meta.status === "PROCESSING" && "bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/20 border-0"
                        )}
                      >
                        {meta.status === "PROCESSING"
                          ? "✨ Processing"
                          : meta.status === "DONE"
                            ? "✅ Ready!"
                            : "❌ Failed"}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        <FileImage className="size-4" />
                        {meta.completedAssets} / {meta.totalAssets}
                      </div>
                    </div>
                    
                    <div className="relative pt-2">
                      <Progress 
                        value={progressValue} 
                        className={cn(
                          "h-3 rounded-full shadow-inner bg-muted",
                          meta.status === "PROCESSING" && "animate-pulse"
                        )} 
                      />
                      <div 
                        className="absolute right-0 top-0 -translate-y-full pb-1 text-xs font-bold text-primary transition-all duration-300"
                        style={{ left: `${progressValue}%`, transform: 'translateX(-50%)' }}
                      >
                        {progressValue}%
                      </div>
                    </div>
                  </div>

                  {meta.currentStep ? (
                    <div className="flex items-center justify-center gap-3 rounded-xl bg-primary/5 p-4 border border-primary/10">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <p className="text-sm font-bold text-primary">
                        {meta.currentStep}
                      </p>
                    </div>
                  ) : null}
                  
                  {meta.error ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
                      <Icons.warning className="size-5 mt-0.5 shrink-0" />
                      <p className="text-sm font-bold leading-tight">{meta.error}</p>
                    </div>
                  ) : null}

                  {canOpenGeneratedBook && (
                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <Link href={`/dashboard/book-editor/${activeBookId}`}>
                        <Button className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 group">
                          Open Editor <ChevronRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-70">
                  <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-muted/40 rotate-3 shadow-sm border border-border/50">
                    <BookOpenCheck className="text-muted-foreground/60 size-10 -rotate-3" />
                  </div>
                  <h4 className="font-heading text-lg mb-2">Ready to Create</h4>
                  <p className="text-sm font-medium text-muted-foreground max-w-[200px] leading-relaxed">
                    Fill out the form to start generating your custom coloring book.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="playful-card overflow-hidden border-2 shadow-sm bg-muted/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/50 shrink-0">
                <BookOpen className="size-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm">View Previous Books</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Manage and edit your saved creations.</p>
              </div>
              <Link href="/dashboard/book-editor" className="ml-auto shrink-0">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-background shadow-sm ring-1 ring-border/50 bg-background/50">
                  <ChevronRight className="size-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
