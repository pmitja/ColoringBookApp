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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";

const MIN_PROMPT_LENGTH = 12;
const DEFAULT_PAGE_COUNT = 10;
const MIN_PAGE_COUNT = 1;
const MAX_PAGE_COUNT = 40;

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
    [pageCount, prompt, title],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="playful-card overflow-hidden">
        <CardHeader className="relative z-10 space-y-3 pb-6">
          <CardTitle className="font-heading text-3xl">Generate New Book</CardTitle>
          <CardDescription className="text-base">
            Tell us your book idea and choose how many interior pages you want.
            We automatically generate a front cover, your selected number of
            interior pages, and a back cover.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="book-prompt" className="text-base font-bold">Book prompt</Label>
              <Textarea
                id="book-prompt"
                placeholder="Example: cute jungle animals learning letters in a playful forest classroom"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="bg-muted/50 focus-visible:ring-primary/50 min-h-[160px] resize-none rounded-2xl p-4 text-base"
                maxLength={2000}
                required
              />
              <p className="text-sm font-medium text-muted-foreground">
                Minimum {MIN_PROMPT_LENGTH} characters.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="book-title" className="text-base font-bold">Book title (optional)</Label>
              <Input
                id="book-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Jungle Adventures"
                maxLength={120}
                className="bg-muted/50 focus-visible:ring-primary/50 rounded-2xl px-4 py-6 text-base"
              />
            </div>

            <div className="bg-muted/30 border-border/50 space-y-5 rounded-2xl border p-5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="page-count" className="text-base font-bold">Interior pages</Label>
                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1 shadow-sm">
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
                     className="w-16 border-0 bg-transparent p-0 text-center font-bold focus-visible:ring-0"
                   />
                   <span className="text-sm font-medium text-muted-foreground">pages</span>
                </div>
              </div>
              <Slider
                min={MIN_PAGE_COUNT}
                max={MAX_PAGE_COUNT}
                step={1}
                value={[pageCount]}
                onValueChange={([value]) => setPageCount(clampPageCount(value))}
                className="py-4"
              />
              <p className="text-sm font-medium text-muted-foreground">
                Default {DEFAULT_PAGE_COUNT}. Maximum {MAX_PAGE_COUNT}.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-full py-6 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:px-8"
              disabled={!canSubmit}
            >
              {isSubmitting || isGenerating ? (
                <Icons.spinner className="size-5 animate-spin" />
              ) : (
                <Icons.bookOpen className="size-5" />
              )}
              {isGenerating ? "Generating Magic..." : "Generate AI Color Book"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="playful-card flex flex-col overflow-hidden">
        <CardHeader className="bg-muted/30 border-border/50 relative z-10 space-y-2 border-b pb-5">
          <CardTitle className="font-heading text-2xl">Generation Status</CardTitle>
          <CardDescription>
            When generation finishes, the editor opens automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 flex flex-1 flex-col justify-center space-y-6 p-6">
          {meta ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={
                    meta.status === "DONE"
                      ? "secondary"
                      : meta.status === "FAILED"
                        ? "destructive"
                        : "default"
                  }
                  className="rounded-full px-3 py-1 text-sm font-bold"
                >
                  {meta.status === "PROCESSING"
                    ? "✨ Processing"
                    : meta.status === "DONE"
                      ? "✅ Ready"
                      : "❌ Failed"}
                </Badge>
                <p className="text-sm font-bold text-muted-foreground">
                  {meta.completedAssets} / {meta.totalAssets} assets
                </p>
              </div>
              <Progress value={progressValue} className="h-4 rounded-full shadow-inner" />
              {meta.currentStep ? (
                <p className="animate-pulse text-center text-sm font-medium text-muted-foreground">
                  {meta.currentStep}
                </p>
              ) : null}
              {meta.error ? (
                <p className="bg-destructive/10 rounded-xl p-3 text-center text-sm font-bold text-destructive">{meta.error}</p>
              ) : null}
            </div>
          ) : (
            <div className="border-border/50 bg-muted/20 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-background shadow-sm">
                <Icons.bookOpen className="text-muted-foreground/50 size-8" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                No active generation.<br/> Start a new AI color book to see progress.
              </p>
            </div>
          )}

          <div className="mt-auto pt-4">
             {canOpenGeneratedBook ? (
               <Link href={`/dashboard/book-editor/${activeBookId}`}>
                 <Button variant="outline" className="w-full rounded-full py-6 text-base font-bold shadow-sm">
                   Open Book Editor <Icons.arrowRight className="ml-2 size-4" />
                 </Button>
               </Link>
             ) : (
               <Link href="/dashboard/book-editor">
                 <Button variant="outline" className="border-border/50 bg-background/50 w-full rounded-full py-6 text-base font-bold shadow-sm">
                   Open My Books <Icons.arrowRight className="ml-2 size-4" />
                 </Button>
               </Link>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
