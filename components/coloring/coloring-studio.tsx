"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Palette, 
  PaintBucket, 
  Image as ImageIcon, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Download, 
  Save,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Plus
} from "lucide-react";

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
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Light Blue
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ffffff", // White
  "#94a3b8", // Gray
  "#0f172a", // Slate
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
          <Link href="/ai-color-book" className="flex-1">
            <Button variant="outline" className="w-full">
              Generate Color Book
            </Button>
          </Link>
        </div>
      </EmptyPlaceholder>
    );
  }

  if (!isPaintingView) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/creations">
              <Button variant="outline" className="gap-2 rounded-xl">
                <BookOpen className="size-4" />
                My Creations
              </Button>
            </Link>
            <Link href="/upload">
              <Button className="gap-2 rounded-xl">
                <Plus className="size-4" />
                New Page
              </Button>
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
          <CardHeader className="relative z-10 space-y-4 border-b-4 border-slate-100 bg-slate-50/50 pb-6 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border-2 border-slate-900 bg-purple-100 p-3 text-purple-600 shadow-sm dark:border-slate-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Palette className="size-6" />
              </div>
              <div>
                <CardTitle className="font-heading text-2xl font-extrabold text-slate-900 dark:text-slate-50">Choose a Page to Color</CardTitle>
                <CardDescription className="mt-1 text-base font-bold text-slate-500 dark:text-slate-400">
                  Select one of your generated pages below to start painting.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pages.map((page) => {
                const isSelected = selectedPageId === page.id;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleSelectPage(page.id)}
                    className={cn(
                      "group relative rounded-3xl border-4 p-3 text-left transition-all duration-300",
                      isSelected
                        ? "scale-[1.02] border-purple-500 bg-purple-50 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.4)] dark:bg-purple-900/20"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"
                    )}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-slate-100 bg-white shadow-inner transition-transform duration-300 group-hover:scale-[1.02] dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/download/lineart/${page.id}`}
                        alt={`Coloring page preview for ${stripFileExtension(page.inputFileName)}`}
                        className="size-full object-contain p-2"
                        loading="lazy"
                        decoding="async"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 rounded-xl bg-purple-500/10 ring-4 ring-inset ring-purple-500" />
                      )}
                      {isSelected ? (
                        <Badge className="absolute right-3 top-3 rounded-lg border-2 border-white bg-purple-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                          Selected
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-4 px-1">
                      <p className="truncate text-base font-black text-slate-900 dark:text-slate-50">
                        {stripFileExtension(page.inputFileName)}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {formatCreatedAt(page.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => {
                  if (!selectedPageId) return;
                  handleSelectPage(selectedPageId, true);
                }}
                disabled={!selectedPageId}
                className="gap-3 rounded-full border-2 border-slate-900 bg-yellow-400 px-10 py-7 text-xl font-black text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:bg-yellow-500 active:translate-y-[4px] dark:border-slate-700 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
              >
                <Palette className="size-6" />
                Start Coloring
                <ChevronRight className="ml-1 size-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => setIsPaintingView(false)}
          >
            <ChevronLeft className="size-4" />
            Back to Library
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownload}
            disabled={isLoadingCanvas || isFilling || isSaving}
            className="gap-2 rounded-xl bg-sky-500 font-bold text-white shadow-sm hover:bg-sky-600"
          >
            <Download className="size-4" />
            Download PNG
          </Button>
          <Button
            onClick={handleSaveToCreations}
            disabled={isLoadingCanvas || isFilling || isSaving}
            className="hover:bg-primary/90 shadow-primary/20 gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-md"
          >
            {isSaving ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save to Creations
          </Button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="sticky top-24 order-2 h-fit overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] lg:order-1">
          <CardHeader className="border-b-4 border-slate-100 bg-slate-50 pb-5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border-2 border-slate-900 bg-blue-100 p-2 text-blue-600 dark:border-slate-700 dark:bg-blue-900/30 dark:text-blue-400">
                <PaintBucket className="size-5" />
              </div>
              <CardTitle className="font-heading text-xl font-black text-slate-900 dark:text-slate-50">Color Palette</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="fill-color-picker" className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Color</Label>
                <Badge variant="outline" className="border-2 border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50">
                  {fillHex.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div 
                  className="size-14 shrink-0 overflow-hidden rounded-2xl border-4 border-slate-200 shadow-inner dark:border-slate-700"
                  style={{ backgroundColor: fillHex }}
                >
                  <input
                    id="fill-color-picker"
                    type="color"
                    value={fillHex}
                    onChange={(event) => setFillHex(event.target.value)}
                    className="size-full cursor-pointer opacity-0"
                    aria-label="Choose fill color"
                  />
                </div>
                <div className="flex-1 text-xs font-bold leading-snug text-slate-500 dark:text-slate-400">
                  Click the color square to pick a custom color, or choose a preset below.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Presets</Label>
              <div className="grid grid-cols-5 gap-3">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFillHex(color)}
                    className={cn(
                      "aspect-square rounded-xl border-2 shadow-sm transition-all hover:scale-110 active:scale-95",
                      fillHex.toLowerCase() === color.toLowerCase()
                        ? "z-10 scale-110 border-slate-900 ring-2 ring-slate-900/20 ring-offset-2 dark:border-slate-100 dark:ring-slate-100/20 dark:ring-offset-slate-900"
                        : "border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800" />

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleUndo}
                disabled={!canUndo || isLoadingCanvas || isFilling}
                variant="outline"
                className="h-12 gap-2 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-50"
              >
                <Undo2 className="size-4" />
                Undo
              </Button>
              <Button
                onClick={handleRedo}
                disabled={!canRedo || isLoadingCanvas || isFilling}
                variant="outline"
                className="h-12 gap-2 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-50"
              >
                <Redo2 className="size-4" />
                Redo
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoadingCanvas || isFilling}
                variant="destructive"
                className="col-span-2 h-12 gap-2 rounded-xl border-2 border-red-100 bg-red-50 font-bold text-red-600 shadow-none hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                <RotateCcw className="size-4" />
                Reset Canvas
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <Accordion
                type="single"
                collapsible
                value={galleryAccordionValue}
                onValueChange={(value) =>
                  setGalleryAccordionValue(value || undefined)
                }
                className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <AccordionItem value="pages" className="border-none">
                  <AccordionTrigger className="py-4 text-sm font-bold text-slate-700 hover:text-slate-900 hover:no-underline dark:text-slate-300 dark:hover:text-slate-50 [&[data-state=open]]:pb-2">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-slate-400" />
                      Switch Page
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="-mr-2 max-h-60 overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 gap-2">
                        {pages.map((page) => {
                          const isSelected = selectedPageId === page.id;

                          return (
                            <button
                              key={page.id}
                              type="button"
                              onClick={() => handleSelectPage(page.id)}
                              className={cn(
                                "group rounded-xl border-2 p-1.5 text-left transition-all",
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900"
                              )}
                            >
                              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm dark:border-slate-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/api/download/lineart/${page.id}`}
                                  alt={`Preview`}
                                  className="size-full object-contain transition-transform group-hover:scale-105"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {selectedPage || lastSavedJobId ? (
              <div className="space-y-3 border-t-2 border-slate-100 pt-4 dark:border-slate-800">
                {lastSavedJobId && (
                  <Link href={`/results/${lastSavedJobId}`} className="block">
                    <Button variant="outline" className="h-12 w-full gap-2 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500">
                      <ExternalLink className="size-4" />
                      View Last Saved
                    </Button>
                  </Link>
                )}
                {selectedPage && (
                  <Link href={`/results/${selectedPage.id}`} className="block">
                    <Button variant="ghost" className="h-12 w-full gap-2 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                      <ExternalLink className="size-4" />
                      Original Results
                    </Button>
                  </Link>
                )}
              </div>
            ) : null}

          </CardContent>
        </Card>

        <Card className="order-1 overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] lg:order-2">
          <CardHeader className="border-b-4 border-slate-100 bg-slate-50 pb-5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading text-xl font-black text-slate-900 dark:text-slate-50">Canvas</CardTitle>
                <CardDescription className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                  Click inside any enclosed area to fill it.
                </CardDescription>
              </div>
              {canvasSize ? (
                <Badge variant="outline" className="border-2 border-slate-200 bg-white px-3 py-1 font-mono text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {canvasSize.width} × {canvasSize.height}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative flex min-h-[500px] items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-200 bg-white bg-[url('/checkered-pattern.png')] bg-repeat shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:bg-[url('/checkered-pattern-dark.png')]">
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] dark:bg-black/50" />
              <canvas
                ref={canvasRef}
                onPointerDown={fillRegionFromPointer}
                className="relative z-10 block max-h-[75vh] w-auto max-w-full cursor-crosshair touch-none bg-white shadow-2xl shadow-slate-900/10 ring-4 ring-slate-900/5 dark:ring-slate-700"
                aria-label="Coloring page canvas"
              />
              {(isLoadingCanvas || isFilling) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-slate-950/60">
                  <div className="flex items-center gap-4 rounded-2xl border-4 border-slate-900 bg-white px-8 py-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                    <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
                       <Icons.spinner className="size-6 animate-spin text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                      {isLoadingCanvas ? "Preparing canvas..." : "Filling color..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {canvasError ? (
              <Alert className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                <Icons.warning className="size-5 text-red-600 dark:text-red-400" />
                <AlertDescription className="ml-2 text-base font-bold">
                  {canvasError}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
