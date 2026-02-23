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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/80 bg-card/95 rounded-3xl border">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Generate New Book</CardTitle>
          <CardDescription>
            Tell us your book idea and choose how many interior pages you want.
            We automatically generate a front cover, your selected number of
            interior pages, and a back cover.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="book-prompt">Book prompt</Label>
              <Textarea
                id="book-prompt"
                placeholder="Example: cute jungle animals learning letters in a playful forest classroom"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-[140px]"
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum {MIN_PROMPT_LENGTH} characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="book-title">Book title (optional)</Label>
              <Input
                id="book-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Jungle Adventures"
                maxLength={120}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="page-count">Interior pages</Label>
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
                  className="w-24"
                />
              </div>
              <Slider
                min={MIN_PAGE_COUNT}
                max={MAX_PAGE_COUNT}
                step={1}
                value={[pageCount]}
                onValueChange={([value]) => setPageCount(clampPageCount(value))}
              />
              <p className="text-xs text-muted-foreground">
                Default {DEFAULT_PAGE_COUNT}. Maximum {MAX_PAGE_COUNT}.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-full sm:w-auto"
              disabled={!canSubmit}
            >
              {isSubmitting || isGenerating ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                <Icons.bookOpen className="size-4" />
              )}
              {isGenerating ? "Generating..." : "Generate AI Color Book"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/95 rounded-3xl border">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Generation Status</CardTitle>
          <CardDescription>
            When generation finishes, the editor opens automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meta ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={
                    meta.status === "DONE"
                      ? "secondary"
                      : meta.status === "FAILED"
                        ? "destructive"
                        : "outline"
                  }
                  className="rounded-full"
                >
                  {meta.status === "PROCESSING"
                    ? "Processing"
                    : meta.status === "DONE"
                      ? "Done"
                      : "Failed"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {meta.completedAssets} / {meta.totalAssets} assets
                </p>
              </div>
              <Progress value={progressValue} className="h-2.5 rounded-full" />
              {meta.currentStep ? (
                <p className="text-sm text-muted-foreground">
                  {meta.currentStep}
                </p>
              ) : null}
              {meta.error ? (
                <p className="text-sm text-destructive">{meta.error}</p>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              No active generation. Start a new AI color book to see progress.
            </div>
          )}

          {canOpenGeneratedBook ? (
            <Link href={`/dashboard/book-editor/${activeBookId}`}>
              <Button variant="outline" className="w-full rounded-full">
                Open Book Editor
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/book-editor">
              <Button variant="outline" className="w-full rounded-full">
                Open My Books
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
