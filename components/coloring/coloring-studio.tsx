"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  fillRegionAtPoint,
  type FillRgb,
} from "@/lib/coloring/fill-all-white";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";

export interface ColoringPageOption {
  id: string;
  inputFileName: string;
  createdAt: string;
}

interface ColoringStudioProps {
  pages: ColoringPageOption[];
  initialPageId?: string;
}

const COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
];

const MAX_HISTORY_STEPS = 20;

function formatCreatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function hexToRgb(hex: string): FillRgb | null {
  const cleanHex = hex.trim().replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) return null;

  return {
    r: Number.parseInt(cleanHex.slice(0, 2), 16),
    g: Number.parseInt(cleanHex.slice(2, 4), 16),
    b: Number.parseInt(cleanHex.slice(4, 6), 16),
  };
}

function cloneImageData(imageData: ImageData) {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );
}

export default function ColoringStudio({
  pages,
  initialPageId,
}: ColoringStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const firstPageId = pages[0]?.id ?? "";
  const [selectedPageId, setSelectedPageId] = useState(() => {
    if (!pages.length) return "";
    if (initialPageId && pages.some((page) => page.id === initialPageId)) {
      return initialPageId;
    }
    return firstPageId;
  });
  const [fillHex, setFillHex] = useState("#ef4444");
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [isPaintingView, setIsPaintingView] = useState(() =>
    Boolean(initialPageId),
  );
  const [galleryAccordionValue, setGalleryAccordionValue] = useState<
    string | undefined
  >(undefined);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [lastFillPixels, setLastFillPixels] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedJobId, setLastSavedJobId] = useState<string | null>(null);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  const handleSelectPage = (pageId: string, openPainter = false) => {
    setSelectedPageId(pageId);
    if (openPainter) {
      setIsPaintingView(true);
    }
    setGalleryAccordionValue(undefined);
  };

  const updateHistoryFlags = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const getCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    try {
      return context.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return null;
    }
  };

  const pushUndoSnapshot = () => {
    const snapshot = getCanvasSnapshot();
    if (!snapshot) return false;

    undoStackRef.current.push(cloneImageData(snapshot));
    if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
      undoStackRef.current.shift();
    }

    redoStackRef.current = [];
    updateHistoryFlags();
    return true;
  };

  const restoreSnapshot = (snapshot: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;

    context.putImageData(snapshot, 0, 0);
    setLastFillPixels(null);
    setCanvasError(null);
    return true;
  };

  useEffect(() => {
    if (!pages.length) {
      setSelectedPageId("");
      setIsPaintingView(false);
      return;
    }

    if (selectedPageId && pages.some((page) => page.id === selectedPageId)) {
      return;
    }

    if (initialPageId && pages.some((page) => page.id === initialPageId)) {
      setSelectedPageId(initialPageId);
      return;
    }

    setSelectedPageId(pages[0].id);
  }, [pages, selectedPageId, initialPageId]);

  useEffect(() => {
    if (!isPaintingView) return;

    const canvas = canvasRef.current;
    if (!canvas || !selectedPageId) return;

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";

    setIsLoadingCanvas(true);
    setCanvasError(null);
    setLastFillPixels(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);

    image.onload = () => {
      if (cancelled) return;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        setCanvasError("Canvas is not available in this browser.");
        setIsLoadingCanvas(false);
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      try {
        originalImageDataRef.current = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } catch (error) {
        console.error("Failed to read initial canvas image data:", error);
        setCanvasError("Unable to read image pixels for fill operations.");
        setIsLoadingCanvas(false);
        return;
      }

      setCanvasSize({ width: canvas.width, height: canvas.height });
      setIsLoadingCanvas(false);
    };

    image.onerror = () => {
      if (cancelled) return;
      setCanvasError("Unable to load this page. Please pick another one.");
      setIsLoadingCanvas(false);
    };

    image.src = `/api/download/lineart/${selectedPageId}`;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [selectedPageId, isPaintingView]);

  const fillRegionFromPointer = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (isLoadingCanvas || isFilling) return;
    if (event.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rgb = hexToRgb(fillHex);
    if (!rgb) {
      setCanvasError("Choose a valid 6-digit HEX color.");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = Math.floor(
      ((event.clientX - rect.left) * canvas.width) / rect.width,
    );
    const y = Math.floor(
      ((event.clientY - rect.top) * canvas.height) / rect.height,
    );

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    setCanvasError(null);
    setIsFilling(true);
    const hasUndoSnapshot = pushUndoSnapshot();

    requestAnimationFrame(() => {
      try {
        const changedPixels = fillRegionAtPoint(canvas, { x, y }, rgb, {
          tolerance: 30,
          outlineThreshold: 108,
        });
        if (changedPixels === 0 && hasUndoSnapshot) {
          undoStackRef.current.pop();
          updateHistoryFlags();
        }
        setLastFillPixels(changedPixels);
      } catch (error) {
        console.error("Region fill failed:", error);
        setCanvasError("Region fill failed. Please try another area.");
      } finally {
        setIsFilling(false);
      }
    });
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    const originalImageData = originalImageDataRef.current;
    if (!canvas || !originalImageData) return;

    pushUndoSnapshot();
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.putImageData(originalImageData, 0, 0);
    setLastFillPixels(null);
    setCanvasError(null);
  };

  const handleUndo = () => {
    if (isLoadingCanvas || isFilling) return;

    const previousSnapshot = undoStackRef.current.pop();
    if (!previousSnapshot) return;

    const currentSnapshot = getCanvasSnapshot();
    if (!currentSnapshot) {
      undoStackRef.current.push(previousSnapshot);
      updateHistoryFlags();
      return;
    }

    redoStackRef.current.push(cloneImageData(currentSnapshot));
    if (redoStackRef.current.length > MAX_HISTORY_STEPS) {
      redoStackRef.current.shift();
    }

    restoreSnapshot(previousSnapshot);
    updateHistoryFlags();
  };

  const handleRedo = () => {
    if (isLoadingCanvas || isFilling) return;

    const nextSnapshot = redoStackRef.current.pop();
    if (!nextSnapshot) return;

    const currentSnapshot = getCanvasSnapshot();
    if (!currentSnapshot) {
      redoStackRef.current.push(nextSnapshot);
      updateHistoryFlags();
      return;
    }

    undoStackRef.current.push(cloneImageData(currentSnapshot));
    if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
      undoStackRef.current.shift();
    }

    restoreSnapshot(nextSnapshot);
    updateHistoryFlags();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPage) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const fileBaseName = stripFileExtension(selectedPage.inputFileName);
    link.href = dataUrl;
    link.download = `${fileBaseName}-colored.png`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSaveToCreations = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPage || isSaving) return;

    setIsSaving(true);
    setCanvasError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((outputBlob) => resolve(outputBlob), "image/png");
      });

      if (!blob) {
        throw new Error("Unable to prepare image for saving.");
      }

      const formData = new FormData();
      const safeName = stripFileExtension(selectedPage.inputFileName)
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "")
        .toLowerCase();
      const fileName = `${safeName || "colored-page"}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      formData.append("file", file);
      formData.append("sourceJobId", selectedPage.id);

      const response = await fetch("/api/coloring/save", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload?.error ||
          payload?.message ||
          "Failed to save colored image to your creations.";
        throw new Error(message);
      }

      setLastSavedJobId(typeof payload?.id === "string" ? payload.id : null);
      toast.success("Saved to My Creations.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save colored image to your creations.";
      setCanvasError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!pages.length) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="media" />
        <EmptyPlaceholder.Title>No Pages Ready Yet</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Generate at least one coloring page first, then color it online here.
        </EmptyPlaceholder.Description>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link href="/upload" className="flex-1">
            <Button className="w-full">Upload Photo</Button>
          </Link>
          <Link href="/ai-generator" className="flex-1">
            <Button variant="outline" className="w-full">
              Generate from Prompt
            </Button>
          </Link>
        </div>
      </EmptyPlaceholder>
    );
  }

  if (!isPaintingView) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/creations">
            <Button variant="outline" className="gap-2">
              <Icons.bookOpen className="size-4" />
              My Creations
            </Button>
          </Link>
          <Link href="/upload">
            <Button className="gap-2">
              <Icons.media className="size-4" />
              New Page
            </Button>
          </Link>
          <Button
            disabled
            className="gap-2 bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            <Icons.download className="size-4" />
            Download Colored PNG
          </Button>
          <Button
            disabled
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            <Icons.check className="size-4" />
            Save to My Creations
          </Button>
        </div>

        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Choose a Page to Color</CardTitle>
            <CardDescription>
              Preview your generated pages, select one, then open the painting
              canvas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pages.map((page) => {
                const isSelected = selectedPageId === page.id;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleSelectPage(page.id)}
                    className={cn(
                      "rounded-2xl border p-2 text-left transition",
                      isSelected
                        ? "border-foreground/40 ring-foreground/15 bg-slate-100/80 ring-2 dark:bg-slate-900/50"
                        : "border-slate-200/70 bg-white/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20",
                    )}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/download/lineart/${page.id}`}
                        alt={`Coloring page preview for ${stripFileExtension(page.inputFileName)}`}
                        className="size-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                      {isSelected ? (
                        <Badge className="absolute right-2 top-2">
                          Selected
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-foreground">
                      {stripFileExtension(page.inputFileName)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCreatedAt(page.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => {
                  if (!selectedPageId) return;
                  handleSelectPage(selectedPageId, true);
                }}
                disabled={!selectedPageId}
                className="gap-2"
              >
                <Icons.check className="size-4" />
                Start Coloring
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/creations">
          <Button variant="outline" className="gap-2">
            <Icons.bookOpen className="size-4" />
            My Creations
          </Button>
        </Link>
        <Link href="/upload">
          <Button className="gap-2">
            <Icons.media className="size-4" />
            New Page
          </Button>
        </Link>
        <Button
          onClick={handleDownload}
          disabled={isLoadingCanvas || isFilling || isSaving}
          className="gap-2 bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
        >
          <Icons.download className="size-4" />
          Download Colored PNG
        </Button>
        <Button
          onClick={handleSaveToCreations}
          disabled={isLoadingCanvas || isFilling || isSaving}
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {isSaving ? (
            <Icons.spinner className="size-4 animate-spin" />
          ) : (
            <Icons.check className="size-4" />
          )}
          Save to My Creations
        </Button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Color Controls</CardTitle>
          <CardDescription>
            Pick a color, click an enclosed area to fill, and keep image
            switching hidden unless needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Accordion
              type="single"
              collapsible
              value={galleryAccordionValue}
              onValueChange={(value) =>
                setGalleryAccordionValue(value || undefined)
              }
              className="rounded-xl border border-slate-200/70 px-3 dark:border-white/10"
            >
              <AccordionItem value="pages" className="border-none">
                <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Icons.media className="size-4" />
                    Change Page
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2">
                      {pages.map((page) => {
                        const isSelected = selectedPageId === page.id;

                        return (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => handleSelectPage(page.id)}
                            className={cn(
                              "rounded-xl border p-1.5 text-left transition",
                              isSelected
                                ? "border-foreground/40 ring-foreground/15 bg-slate-100/80 ring-2 dark:bg-slate-900/50"
                                : "border-slate-200/70 bg-white/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20",
                            )}
                          >
                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-200/70 bg-white dark:border-white/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/download/lineart/${page.id}`}
                                alt={`Coloring page preview for ${stripFileExtension(page.inputFileName)}`}
                                className="size-full object-contain"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <p className="mt-1 truncate text-xs font-medium text-foreground">
                              {stripFileExtension(page.inputFileName)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {selectedPage ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-900/40">
                <span className="truncate font-medium text-foreground">
                  {stripFileExtension(selectedPage.inputFileName)}
                </span>
                <span className="text-muted-foreground">
                  {formatCreatedAt(selectedPage.createdAt)}
                </span>
              </div>
            ) : null}

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => setIsPaintingView(false)}
            >
              <Icons.chevronLeft className="size-4" />
              Back to Page Picker
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fill-color-picker">Fill color</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {fillHex.toUpperCase()}
              </span>
            </div>
            <input
              id="fill-color-picker"
              type="color"
              value={fillHex}
              onChange={(event) => setFillHex(event.target.value)}
              className="h-10 w-full cursor-pointer rounded-xl border border-input bg-transparent p-1"
              aria-label="Choose fill color"
            />
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFillHex(color)}
                  className={cn(
                    "size-7 rounded-full border transition",
                    fillHex.toLowerCase() === color.toLowerCase()
                      ? "ring-foreground/20 border-foreground ring-2"
                      : "border-slate-200/80 dark:border-white/20",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Use color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleUndo}
              disabled={!canUndo || isLoadingCanvas || isFilling}
              variant="outline"
              className="gap-2"
            >
              <Icons.undo className="size-4" />
              Undo
            </Button>
            <Button
              onClick={handleRedo}
              disabled={!canRedo || isLoadingCanvas || isFilling}
              variant="outline"
              className="gap-2"
            >
              <Icons.redo className="size-4" />
              Redo
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoadingCanvas || isFilling}
              variant="outline"
              className="col-span-2 gap-2"
            >
              <Icons.undo className="size-4" />
              Reset
            </Button>
          </div>

          {lastSavedJobId ? (
            <Link href={`/results/${lastSavedJobId}`} className="block">
              <Button variant="ghost" className="w-full gap-2">
                <Icons.arrowUpRight className="size-4" />
                Open Last Saved Result
              </Button>
            </Link>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Click any enclosed area on the canvas to fill only that region with
            the selected color.
          </p>

          {selectedPage ? (
            <Link href={`/results/${selectedPage.id}`} className="block">
              <Button variant="ghost" className="w-full gap-2">
                <Icons.arrowUpRight className="size-4" />
                Open Original Results
              </Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Canvas Preview</CardTitle>
              <CardDescription>
                Click-to-fill stays inside line-art boundaries.
              </CardDescription>
            </div>
            {canvasSize ? (
              <Badge variant="outline">
                {canvasSize.width} × {canvasSize.height}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10">
            <canvas
              ref={canvasRef}
              onPointerDown={fillRegionFromPointer}
              className="block max-h-[68vh] w-auto max-w-full cursor-crosshair touch-none"
              aria-label="Coloring page canvas"
            />
            {(isLoadingCanvas || isFilling) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-900/60">
                <div className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900">
                  <Icons.spinner className="size-4 animate-spin" />
                  <span>
                    {isLoadingCanvas ? "Loading page..." : "Applying fill..."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {canvasError ? (
            <Alert className="border-rose-400/30 bg-rose-500/10 text-rose-800 dark:text-rose-100">
              <Icons.warning className="size-4 text-rose-500 dark:text-rose-200" />
              <AlertDescription className="text-rose-700 dark:text-rose-50">
                {canvasError}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-900/40">
            {lastFillPixels === null
              ? "Tip: click inside an enclosed object to color only that region."
              : lastFillPixels > 0
                ? `Region fill updated ${lastFillPixels.toLocaleString("en-US")} pixels.`
                : "No fillable region found at the clicked position."}
          </div>
        </CardContent>
      </Card>
      </section>
    </>
  );
}
