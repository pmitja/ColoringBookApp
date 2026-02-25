"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// Custom lightweight flip viewer
import { Rnd } from "react-rnd";
import { toast } from "sonner";

import useLocalStorage from "@/hooks/use-local-storage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMounted } from "@/hooks/use-mounted";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/shared/icons";

import { captureElementAsPng, exportImagesAsPdf } from "./pdf-export";
import { plainTextToRichText } from "./rich-text";
import SimpleFlipBook, { SimpleFlipBookHandle } from "./simple-flip-book";
import TextBoxRnd from "./text-box-rnd";
import TextProperties from "./text-properties";
import type { EditorTextBox } from "./types";

interface AssetItem {
  id: string;
  url: string;
  name?: string;
}

// Types moved to ./types for reuse

interface EditorImage {
  id: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: "contain" | "cover";
  rotation?: number; // degrees, multiples of 90
  objectPosX?: number; // 0-100 percentage for cover positioning (X)
  objectPosY?: number; // 0-100 percentage for cover positioning (Y)
  coverRole?: "front" | "back";
}

type PageElement =
  | { type: "text"; data: EditorTextBox }
  | { type: "image"; data: EditorImage };

interface EditorPage {
  id: string;
  elements: PageElement[];
  background?: string;
}

interface BookState {
  title: string;
  pages: EditorPage[];
}

interface BookEditorProps {
  assets: AssetItem[];
  initialBookId?: string | null;
  initialBook?: BookState | null;
  isPaidUser?: boolean;
}

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function deepCloneBook<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function BookEditorV2({
  assets,
  initialBookId = null,
  initialBook = null,
  isPaidUser = false,
}: BookEditorProps) {
  const mounted = useMounted();
  const [book, setBook] = useLocalStorage<BookState>("book-editor:v2", {
    title: "My Coloring Book",
    pages: [
      { id: generateId("page"), elements: [] },
      { id: generateId("page"), elements: [] },
    ],
  });
  const [bookId, setBookId] = useLocalStorage<string | null>(
    "book-editor:v2:book-id",
    null,
  );
  const aiLayoutNormalizedBookIdsRef = useRef<Set<string>>(new Set());

  const createDefaultBook = useCallback(
    (): BookState => ({
      title: "My Coloring Book",
      pages: [
        { id: generateId("page"), elements: [] },
        { id: generateId("page"), elements: [] },
      ],
    }),
    [],
  );

  useEffect(() => {
    if (!mounted) return;
    if (initialBookId && initialBook) {
      if (bookId !== initialBookId) {
        setBook(initialBook);
        setBookId(initialBookId);
        if (initialBook.pages[0]?.id) {
          setSelectedPageId(initialBook.pages[0].id);
        }
      }
    } else if (initialBookId === null && initialBook === null) {
      const fresh = createDefaultBook();
      setBook(fresh);
      setBookId(null);
      setSelectedPageId(fresh.pages[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, initialBookId, initialBook]);

  const [selectedPageId, setSelectedPageId] = useState(book.pages[0]?.id);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState<boolean>(false);

  const [pageFormat, setPageFormat] = useLocalStorage<"A3" | "A4" | "A5">(
    "book-editor:v2:page-format",
    "A3",
  );
  const [pageOrientation, setPageOrientation] = useLocalStorage<
    "portrait" | "landscape"
  >("book-editor:v2:orientation", "landscape");
  const workAreaPaddingEnabled = true;
  const bookRef = useRef<SimpleFlipBookHandle | null>(null);
  const isExportingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [containerWidth, setContainerWidth] = useState<number>(420);
  const [hasMeasured, setHasMeasured] = useState<boolean>(false);
  const [zoom, setZoom] = useLocalStorage<number>("book-editor:v2:zoom", 1.0);
  const [hasUserZoomed, setHasUserZoomed] = useLocalStorage<boolean>(
    "book-editor:v2:zoom-user",
    false,
  );
  const [assetQuery, setAssetQuery] = useState<string>("");
  const [editorAssets, setEditorAssets] = useState<AssetItem[]>(assets);
  const [coverDialogOpen, setCoverDialogOpen] = useState<boolean>(false);
  const [coverTarget, setCoverTarget] = useState<"front" | "back">("front");
  const [coverPrompt, setCoverPrompt] = useState<string>("");
  const [coverTitleText, setCoverTitleText] = useState<string>("");
  const [coverMainCharacter, setCoverMainCharacter] = useState<string>("");
  const [coverSetting, setCoverSetting] = useState<string>("");
  const [coverMood, setCoverMood] = useState<string>("");
  const [coverExtraDetails, setCoverExtraDetails] = useState<string>("");
  const [coverWizardView, setCoverWizardView] = useState<
    "form" | "loading" | "results"
  >("form");
  const [coverOptions, setCoverOptions] = useState<AssetItem[]>([]);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isGeneratingCovers, setIsGeneratingCovers] = useState<boolean>(false);
  const [savingCoverOptionId, setSavingCoverOptionId] = useState<string | null>(
    null,
  );
  const coverPromptExamples = useMemo(
    () => [
      {
        title: "Cozy Halloween",
        prompt:
          "cute friendly ghosts by a warm fireplace, sleeping cat, candles and pumpkins, cozy autumn mood, children’s book style",
      },
      {
        title: "Forest Adventure",
        prompt:
          "happy kids and woodland animals on a forest path, big mushrooms and trees, sunny magical atmosphere, wholesome and playful",
      },
      {
        title: "Space Friends",
        prompt:
          "cute astronauts and smiling planets in space, stars and nebula clouds, colorful dreamy scene, not scary, rounded shapes",
      },
      {
        title: "Princess Garden",
        prompt:
          "kind princess and animal friends in a flower garden with a castle in background, spring colors, gentle fairy-tale mood",
      },
    ],
    [],
  );
  const guidedCoverPrompt = useMemo(() => {
    const mainCharacter = coverMainCharacter.trim();
    const setting = coverSetting.trim();
    const mood = coverMood.trim();
    const details = coverExtraDetails.trim();
    const promptParts = [
      mainCharacter ? `Main characters: ${mainCharacter}.` : "",
      setting ? `Scene: ${setting}.` : "",
      mood ? `Mood/style: ${mood}.` : "",
      details ? `Extra details: ${details}.` : "",
      "Children's coloring-book cover composition, cute and wholesome, rounded shapes, clean outlines, centered layout, no logos, no watermarks.",
    ].filter(Boolean);
    return promptParts.join(" ");
  }, [coverExtraDetails, coverMainCharacter, coverMood, coverSetting]);
  const effectiveCoverPrompt = useMemo(() => {
    const typedPrompt = coverPrompt.trim();
    return typedPrompt.length >= 12 ? typedPrompt : guidedCoverPrompt.trim();
  }, [coverPrompt, guidedCoverPrompt]);
  const canGenerateCoverOptions = effectiveCoverPrompt.length >= 12;
  const clipboardRef = useRef<PageElement | null>(null);
  const [lastContextPos, setLastContextPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [lastContextPageId, setLastContextPageId] = useState<string | null>(
    null,
  );

  const [historyPast, setHistoryPast] = useState<BookState[]>([]);
  const [historyFuture, setHistoryFuture] = useState<BookState[]>([]);
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const pushHistory = useCallback(() => {
    setHistoryPast((prev) => [...prev, deepCloneBook(book)]);
    setHistoryFuture([]);
  }, [book]);

  const undo = useCallback(() => {
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHistoryFuture((f) => [deepCloneBook(book), ...f]);
      setBook(last);
      return prev.slice(0, -1);
    });
  }, [book, setBook]);

  const redo = useCallback(() => {
    setHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setHistoryPast((p) => [...p, deepCloneBook(book)]);
      setBook(next);
      return rest;
    });
  }, [book, setBook]);

  const selectedPage = useMemo(
    () => book.pages.find((p) => p.id === selectedPageId) ?? book.pages[0],
    [book.pages, selectedPageId],
  );
  const selectedPageIndex = useMemo(
    () => book.pages.findIndex((p) => p.id === selectedPageId),
    [book.pages, selectedPageId],
  );

  const selectedElement: PageElement | undefined = useMemo(() => {
    if (!selectedPage || !selectedElementId) return undefined;
    return selectedPage.elements.find((el) =>
      el.type === "text"
        ? el.data.id === selectedElementId
        : (el as any).data.id === selectedElementId,
    );
  }, [selectedPage, selectedElementId]);

  // Responsive: single page on small/medium screens and auto-fit zoom on very small screens
  const { width: windowWidth } = useMediaQuery();
  const isSingleMode = useMemo(() => containerWidth < 1100, [containerWidth]);
  const isZoomLocked = useMemo(
    () => (windowWidth ?? Number.POSITIVE_INFINITY) < 768,
    [windowWidth],
  );
  const isLargeScreen = useMemo(
    () => (windowWidth ?? 0) >= 1024,
    [windowWidth],
  );

  const { pageWidth, pageHeight } = useMemo(() => {
    const MM: Record<"A3" | "A4" | "A5", { w: number; h: number }> = {
      A3: { w: 297, h: 420 },
      A4: { w: 210, h: 297 },
      A5: { w: 148, h: 210 },
    };
    const base = MM[pageFormat];
    const mm =
      pageOrientation === "landscape" ? { w: base.h, h: base.w } : base;
    // Scale width relative to A3 for the active orientation
    const BASE_W = pageOrientation === "landscape" ? MM.A3.h : MM.A3.w;
    const pageSlots = isSingleMode ? 1 : 2;
    const spreadGutter = isSingleMode ? 0 : 24;
    const availableWidth = Math.max(0, containerWidth - spreadGutter);
    const slotWidth = availableWidth / pageSlots;
    const baseWidth = Math.max(260, Math.min(slotWidth, 1200));
    const width = baseWidth * (mm.w / BASE_W);
    const height = width * (mm.h / mm.w);
    return { pageWidth: Math.round(width), pageHeight: Math.round(height) };
  }, [pageFormat, pageOrientation, containerWidth, isSingleMode]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const resize = () => {
      setContainerWidth(el.clientWidth);
      setHasMeasured(true);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitZoom = useMemo(() => {
    const pageSlots = isSingleMode ? 1 : 2;
    if (pageWidth <= 0 || containerWidth <= 0) return 1;
    const fit = (containerWidth - 32) / Math.max(1, pageWidth * pageSlots);
    return Math.max(0.1, fit);
  }, [containerWidth, pageWidth, isSingleMode]);

  const renderZoom = useMemo(() => {
    if (isZoomLocked) return fitZoom;
    return Math.max(0.1, zoom);
  }, [isZoomLocked, zoom, fitZoom]);

  const zoomMax = useMemo(
    () => Math.max(200, Math.ceil(fitZoom * 100)),
    [fitZoom],
  );

  useEffect(() => {
    if (!hasMeasured || hasUserZoomed) return;
    if (!Number.isFinite(fitZoom) || fitZoom <= 0) return;
    if (!isLargeScreen) return;
    setZoom(fitZoom);
  }, [fitZoom, hasMeasured, hasUserZoomed, isLargeScreen, setZoom]);

  const displayWidth = useMemo(
    () => Math.round(pageWidth * renderZoom),
    [pageWidth, renderZoom],
  );
  const displayHeight = useMemo(
    () => Math.round(pageHeight * renderZoom),
    [pageHeight, renderZoom],
  );

  const getPagePaddingByIndex = useCallback(
    (pageIndex: number) => {
      if (!workAreaPaddingEnabled) return 0;
      const isEdgePage = pageIndex === 0 || pageIndex === book.pages.length - 1;
      return isEdgePage ? 0 : 24;
    },
    [book.pages.length, workAreaPaddingEnabled],
  );
  const workAreaPadding = useMemo(
    () => getPagePaddingByIndex(selectedPageIndex >= 0 ? selectedPageIndex : 0),
    [getPagePaddingByIndex, selectedPageIndex],
  );
  const getPagePaddingById = useCallback(
    (pageId: string) => {
      const pageIndex = book.pages.findIndex((page) => page.id === pageId);
      if (pageIndex < 0) return 0;
      return getPagePaddingByIndex(pageIndex);
    },
    [book.pages, getPagePaddingByIndex],
  );

  // Normalize AI-generated books once on load so interior pages open with the
  // same "contain" fit users currently set manually page-by-page.
  useEffect(() => {
    if (!hasMeasured || !bookId) return;

    const aiMeta = (book as any)?.meta?.aiColorBook;
    const hasAiMeta = Boolean(aiMeta && typeof aiMeta === "object");
    const hasSuspiciousOversizedImages = book.pages.some((page) =>
      page.elements.some(
        (el) =>
          el.type === "image" &&
          (el.data.width >= 2000 || el.data.height >= 2000),
      ),
    );
    if (!hasAiMeta && !hasSuspiciousOversizedImages) return;
    if (aiLayoutNormalizedBookIdsRef.current.has(bookId)) return;

    let changed = false;
    const lastPageIndex = Math.max(0, book.pages.length - 1);

    const normalizedPages = book.pages.map((page, pageIndex) => {
      const pagePadding = getPagePaddingByIndex(pageIndex);
      const pagePadUnits = pagePadding / Math.max(renderZoom, 0.0001);
      const pageContentWidth = Math.max(0, pageWidth - 2 * pagePadUnits);
      const pageContentHeight = Math.max(0, pageHeight - 2 * pagePadUnits);
      const isEdgePage = pageIndex === 0 || pageIndex === lastPageIndex;

      const nextElements = page.elements.map((el) => {
        if (el.type !== "image") return el;

        const isCoverImage =
          el.data.coverRole === "front" ||
          el.data.coverRole === "back" ||
          (isEdgePage && !el.data.coverRole);
        const desiredFit = isCoverImage ? "cover" : "contain";

        const nextData = {
          ...el.data,
          fit: desiredFit,
          x: 0,
          y: 0,
          width: Math.max(20, Math.round(pageContentWidth)),
          height: Math.max(20, Math.round(pageContentHeight)),
          objectPosX: el.data.objectPosX ?? 50,
          objectPosY: el.data.objectPosY ?? 50,
        };

        if (
          nextData.fit !== el.data.fit ||
          nextData.x !== el.data.x ||
          nextData.y !== el.data.y ||
          nextData.width !== el.data.width ||
          nextData.height !== el.data.height ||
          nextData.objectPosX !== el.data.objectPosX ||
          nextData.objectPosY !== el.data.objectPosY
        ) {
          changed = true;
          return { ...el, data: nextData } as PageElement;
        }

        return el;
      });

      const pageChanged = nextElements.some((el, index) => el !== page.elements[index]);
      return pageChanged ? { ...page, elements: nextElements } : page;
    });

    aiLayoutNormalizedBookIdsRef.current.add(bookId);

    if (changed) {
      setBook({ ...book, pages: normalizedPages });
    }
  }, [
    book,
    bookId,
    getPagePaddingByIndex,
    hasMeasured,
    pageHeight,
    pageWidth,
    renderZoom,
    setBook,
  ]);

  // Work area sizes in logical page units (independent of zoom)
  // Convert fixed pixel padding into page units based on zoom
  const padUnits = useMemo(
    () => workAreaPadding / Math.max(renderZoom, 0.0001),
    [workAreaPadding, renderZoom],
  );
  const contentPageWidth = useMemo(
    () => Math.max(0, pageWidth - 2 * padUnits),
    [pageWidth, padUnits],
  );
  const contentPageHeight = useMemo(
    () => Math.max(0, pageHeight - 2 * padUnits),
    [pageHeight, padUnits],
  );
  const coverAspectRatio = useMemo<"3:4" | "4:3">(
    () => (pageOrientation === "portrait" ? "3:4" : "4:3"),
    [pageOrientation],
  );

  useEffect(() => {
    setEditorAssets((prev) => {
      const map = new Map(prev.map((asset) => [asset.id, asset]));
      assets.forEach((asset) => map.set(asset.id, asset));
      return Array.from(map.values());
    });
  }, [assets]);

  useEffect(() => {
    setCoverOptions([]);
    setCoverError(null);
    setCoverWizardView("form");
  }, [coverTarget, coverAspectRatio]);

  const getCenteredPosition = useCallback(
    (width: number, height: number) => {
      const safeWidth = contentPageWidth || width;
      const safeHeight = contentPageHeight || height;
      const x = Math.max(0, Math.round((safeWidth - width) / 2));
      const y = Math.max(0, Math.round((safeHeight - height) / 2));
      return { x, y };
    },
    [contentPageWidth, contentPageHeight],
  );

  const exportToPdf = useCallback(async () => {
    const waitForPaint = async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    };

    const prevSelectedEl = selectedElementId;
    const prevSelectedPage = selectedPageId;
    const prevFlipIndex = bookRef.current?.getCurrentPage() ?? 0;

    try {
      toast.info("Generating PDF...");
      isExportingRef.current = true;
      setSelectedElementId(null);
      setSelectedPageId(undefined as any);
      await waitForPaint();

      const images: string[] = [];
      for (let i = 0; i < book.pages.length; i++) {
        bookRef.current?.turnToPage(i);
        await waitForPaint();
        const pageId = book.pages[i]?.id;
        if (!pageId) continue;
        const pageEl = pageRefs.current[pageId];
        if (!pageEl) continue;
        const imageData = await captureElementAsPng(pageEl, 2);
        images.push(imageData);
      }

      if (images.length === 0) {
        throw new Error("No pages available for export");
      }

      await exportImagesAsPdf({
        images,
        pageFormat,
        orientation: pageOrientation,
        fileName: book.title,
      });

      toast.success("PDF saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    } finally {
      isExportingRef.current = false;
      bookRef.current?.turnToPage(prevFlipIndex);
      setSelectedElementId(prevSelectedEl);
      setSelectedPageId(prevSelectedPage);
    }
  }, [
    book.pages,
    book.title,
    pageFormat,
    pageOrientation,
    selectedElementId,
    selectedPageId,
  ]);

  const saveBook = useCallback(async () => {
    try {
      const res = await fetch("/api/books" + (bookId ? `/${bookId}` : ""), {
        method: bookId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: book.title, data: book }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const json = await res.json();
      if (!bookId && json?.id) setBookId(json.id);
      toast.success(bookId ? "Book saved" : "Book created");
    } catch (e) {
      toast.error("Failed to save book");
    }
  }, [book, bookId, setBookId]);

  const loadLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/books", { method: "GET" });
      if (!res.ok) throw new Error("Failed to load");
      const list: Array<{ id: string; title: string }> = await res.json();
      if (list.length === 0) return;
      const first = list[0];
      const res2 = await fetch(`/api/books/${first.id}`);
      if (!res2.ok) throw new Error("Failed to load book");
      const full = await res2.json();
      if (full?.data) {
        setBook(full.data);
        setBookId(first.id);
      }
      toast.success("Loaded latest book");
    } catch {
      toast.error("Failed to load book");
    }
  }, [setBook, setBookId]);

  const addPage = useCallback(() => {
    pushHistory();
    setBook({
      ...book,
      pages: [...book.pages, { id: generateId("page"), elements: [] }],
    });
    setSelectedElementId(null);
  }, [book, setBook, pushHistory]);

  const removePage = useCallback(() => {
    if (book.pages.length <= 1) return;
    pushHistory();
    const idx = book.pages.findIndex((p) => p.id === selectedPage?.id);
    const newPages = book.pages.filter((p) => p.id !== selectedPage?.id);
    setBook({ ...book, pages: newPages });
    const nextIdx = Math.max(0, idx - 1);
    setSelectedPageId(newPages[nextIdx]?.id);
  }, [book, selectedPage, setBook, pushHistory]);

  const addTextBox = useCallback(() => {
    if (!selectedPage) return;
    pushHistory();
    const safeWidth = contentPageWidth || 360;
    const safeHeight = contentPageHeight || 240;
    const width = Math.min(
      Math.max(160, Math.round(safeWidth * 0.6)),
      safeWidth,
    );
    const height = Math.min(
      Math.max(80, Math.round(safeHeight * 0.25)),
      safeHeight,
    );
    const { x, y } = getCenteredPosition(width, height);
    const newText: EditorTextBox = {
      id: generateId("text"),
      x,
      y,
      width,
      height,
      text: "Double-click to edit text",
      richText: plainTextToRichText("Double-click to edit text"),
      fontSize: 18,
      bold: false,
      italic: false,
      underline: false,
      fontFamily: "Geist",
      textAlign: "left",
      verticalAlign: "top",
      fontColor: "#111827",
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 8,
      holderShape: "none",
      boxShadow: "none",
      padding: 8,
      chatBubble: undefined, // No chat bubble by default
    };
    const newPages = book.pages.map((p) =>
      p.id === selectedPage.id
        ? {
            ...p,
            elements: [
              ...p.elements,
              { type: "text", data: newText } as PageElement,
            ],
          }
        : p,
    );
    setBook({ ...book, pages: newPages });
    setSelectedElementId(newText.id);
  }, [
    book,
    selectedPage,
    setBook,
    pushHistory,
    contentPageWidth,
    contentPageHeight,
    getCenteredPosition,
  ]);

  const addImage = useCallback(
    (assetId: string) => {
      if (!selectedPage) return;
      pushHistory();
      const safeWidth = contentPageWidth || 360;
      const safeHeight = contentPageHeight || 240;
      const isCoverPage =
        selectedPageIndex === 0 || selectedPageIndex === book.pages.length - 1;
      const newImg: EditorImage = {
        id: generateId("img"),
        assetId,
        x: 0,
        y: 0,
        width: safeWidth,
        height: safeHeight,
        fit: isCoverPage ? "cover" : "contain",
        rotation: 0,
        objectPosX: 50,
        objectPosY: 50,
      };
      const newPages = book.pages.map((p) =>
        p.id === selectedPage.id
          ? {
              ...p,
              elements: [
                ...p.elements,
                { type: "image", data: newImg } as PageElement,
              ],
            }
          : p,
      );
      setBook({ ...book, pages: newPages });
      setSelectedElementId(newImg.id);
    },
    [
      book,
      selectedPage,
      setBook,
      pushHistory,
      contentPageWidth,
      contentPageHeight,
      selectedPageIndex,
    ],
  );

  const updateElementPosition = useCallback(
    (elementId: string, x: number, y: number) => {
      const newPages = book.pages.map((p) => {
        if (p.id !== selectedPage?.id) return p;
        return {
          ...p,
          elements: p.elements.map((el) => {
            if (el.type === "text" && el.data.id === elementId) {
              const width = el.data.width;
              const height = el.data.height;
              const clampedX = Math.min(
                Math.max(0, x),
                Math.max(0, contentPageWidth - width),
              );
              const clampedY = Math.min(
                Math.max(0, y),
                Math.max(0, contentPageHeight - height),
              );
              return {
                type: "text",
                data: { ...el.data, x: clampedX, y: clampedY },
              } as PageElement;
            }
            if (el.type === "image" && el.data.id === elementId) {
              const width = el.data.width;
              const height = el.data.height;
              const rotation = (el.data.rotation || 0) % 360;
              const rotatedWidth = rotation % 180 === 0 ? width : height;
              const rotatedHeight = rotation % 180 === 0 ? height : width;
              const clampedX = Math.min(
                Math.max(0, x),
                Math.max(0, contentPageWidth - rotatedWidth),
              );
              const clampedY = Math.min(
                Math.max(0, y),
                Math.max(0, contentPageHeight - rotatedHeight),
              );
              return {
                type: "image",
                data: { ...el.data, x: clampedX, y: clampedY },
              } as PageElement;
            }
            return el;
          }),
        };
      });
      setBook({ ...book, pages: newPages });
    },
    [book, selectedPage, setBook, contentPageWidth, contentPageHeight],
  );

  const updateText = useCallback(
    (elementId: string, text: string, richText?: string) => {
      // Do not push history on every keystroke; snapshot when entering edit mode
      const newPages = book.pages.map((p) => {
        if (p.id !== selectedPage?.id) return p;
        return {
          ...p,
          elements: p.elements.map((el) =>
            el.type === "text" && el.data.id === elementId
              ? ({
                  type: "text",
                  data: {
                    ...el.data,
                    text,
                    ...(typeof richText === "string" ? { richText } : {}),
                  },
                } as PageElement)
              : el,
          ),
        };
      });
      setBook({ ...book, pages: newPages });
    },
    [book, selectedPage, setBook],
  );

  const updateElementData = useCallback(
    (
      elementId: string,
      partial: Partial<EditorTextBox> | Partial<EditorImage>,
    ) => {
      // For property changes triggered by buttons/sliders, snapshot once per interaction elsewhere when possible
      const newPages = book.pages.map((p) => {
        if (p.id !== selectedPage?.id) return p;
        return {
          ...p,
          elements: p.elements.map((el) => {
            if (el.type === "text" && el.data.id === elementId) {
              const merged = { ...el.data, ...partial } as EditorTextBox;
              const width = Math.min(
                Math.max(merged.width, 20),
                contentPageWidth,
              );
              const height = Math.min(
                Math.max(merged.height, 20),
                contentPageHeight,
              );
              const maxX = Math.max(0, contentPageWidth - width);
              const maxY = Math.max(0, contentPageHeight - height);
              const x = Math.min(Math.max(merged.x, 0), maxX);
              const y = Math.min(Math.max(merged.y, 0), maxY);
              return {
                type: "text",
                data: { ...merged, x, y, width, height },
              } as PageElement;
            }
            if (el.type === "image" && el.data.id === elementId) {
              const merged = { ...el.data, ...partial } as EditorImage;
              const rotation = (merged.rotation || 0) % 360;
              const isQuarter = Math.abs(rotation) % 180 !== 0;
              const maxWidth = isQuarter ? contentPageHeight : contentPageWidth;
              const maxHeight = isQuarter
                ? contentPageWidth
                : contentPageHeight;
              const width = Math.min(Math.max(merged.width, 20), maxWidth);
              const height = Math.min(Math.max(merged.height, 20), maxHeight);
              const rotatedWidth = isQuarter ? height : width;
              const rotatedHeight = isQuarter ? width : height;
              const maxX = Math.max(0, contentPageWidth - rotatedWidth);
              const maxY = Math.max(0, contentPageHeight - rotatedHeight);
              const x = Math.min(Math.max(merged.x, 0), maxX);
              const y = Math.min(Math.max(merged.y, 0), maxY);
              return {
                type: "image",
                data: { ...merged, x, y, width, height },
              } as PageElement;
            }
            return el;
          }),
        };
      });
      setBook({ ...book, pages: newPages });
    },
    [book, selectedPage, setBook, contentPageWidth, contentPageHeight],
  );

  const getPagePosFromEvent = useCallback(
    (pageId: string, e: any) => {
      const el = pageRefs.current[pageId];
      if (!el) return null as { x: number; y: number } | null;
      const pagePadding = getPagePaddingById(pageId);
      const rect = el.getBoundingClientRect();
      const clientX = (e?.clientX ?? e?.nativeEvent?.clientX ?? 0) as number;
      const clientY = (e?.clientY ?? e?.nativeEvent?.clientY ?? 0) as number;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const xPage = (localX - pagePadding) / Math.max(renderZoom, 0.0001);
      const yPage = (localY - pagePadding) / Math.max(renderZoom, 0.0001);
      return { x: xPage, y: yPage };
    },
    [getPagePaddingById, pageRefs, renderZoom],
  );

  const getElementIdFromEventTarget = useCallback((e: any) => {
    const t = (e?.target || e?.currentTarget) as HTMLElement | null;
    if (!t || !t.closest) return null as string | null;
    const host = t.closest("[data-element-id]") as HTMLElement | null;
    return host?.getAttribute("data-element-id") || null;
  }, []);

  const copyElement = useCallback(
    (element?: PageElement | null) => {
      const target = element ?? selectedElement ?? null;
      if (!target) return;
      clipboardRef.current = JSON.parse(JSON.stringify(target)) as PageElement;
      toast.success("Copied");
    },
    [selectedElement],
  );

  const pasteClipboard = useCallback(
    (pos?: { x: number; y: number }, pageId?: string | null) => {
      const clip = clipboardRef.current;
      if (!clip) return;
      const targetPageId = pageId ?? lastContextPageId ?? selectedPage?.id;
      if (!targetPageId) return;
      const page = book.pages.find((p) => p.id === targetPageId);
      if (!page) return;
      const base = JSON.parse(JSON.stringify(clip)) as PageElement;
      const newId =
        base.type === "text" ? generateId("text") : generateId("img");
      const width = base.data.width;
      const height = base.data.height;
      let newX: number;
      let newY: number;
      if (pos) {
        newX = pos.x;
        newY = pos.y;
      } else if (selectedElement) {
        newX = selectedElement.data.x + 12;
        newY = selectedElement.data.y + 12;
      } else {
        newX = 40;
        newY = 40;
      }
      // Clamp position to content area
      const rotation =
        base.type === "image" ? ((base.data as any).rotation || 0) % 360 : 0;
      const isQuarter = Math.abs(rotation) % 180 !== 0;
      const rotatedWidth = base.type === "image" && isQuarter ? height : width;
      const rotatedHeight = base.type === "image" && isQuarter ? width : height;
      const maxX = Math.max(0, contentPageWidth - rotatedWidth);
      const maxY = Math.max(0, contentPageHeight - rotatedHeight);
      newX = Math.min(Math.max(newX, 0), maxX);
      newY = Math.min(Math.max(newY, 0), maxY);

      const newEl: PageElement = {
        type: base.type,
        data: {
          ...(base.data as any),
          id: newId,
          x: newX,
          y: newY,
        },
      } as PageElement;
      pushHistory();
      const newPages = book.pages.map((p) =>
        p.id === targetPageId ? { ...p, elements: [...p.elements, newEl] } : p,
      );
      setBook({ ...book, pages: newPages });
      setSelectedPageId(targetPageId);
      setSelectedElementId(newId);
      toast.success("Pasted");
    },
    [
      book,
      contentPageWidth,
      contentPageHeight,
      lastContextPageId,
      selectedElement,
      selectedPage,
      setBook,
      setSelectedElementId,
      setSelectedPageId,
      pushHistory,
    ],
  );

  // Re-clamp all elements when content area changes (zoom, padding, format)
  useEffect(() => {
    if (!hasMeasured) return;
    const prev = book;
    let changed = false;
    const pages = prev.pages.map((p, pageIndex) => {
      const pagePadding = getPagePaddingByIndex(pageIndex);
      const pagePadUnits = pagePadding / Math.max(renderZoom, 0.0001);
      const pageContentWidth = Math.max(0, pageWidth - 2 * pagePadUnits);
      const pageContentHeight = Math.max(0, pageHeight - 2 * pagePadUnits);
      const elements = p.elements.map((el) => {
        if (el.type === "text") {
          const width = Math.min(Math.max(el.data.width, 20), pageContentWidth);
          const height = Math.min(
            Math.max(el.data.height, 20),
            pageContentHeight,
          );
          const maxX = Math.max(0, pageContentWidth - width);
          const maxY = Math.max(0, pageContentHeight - height);
          const x = Math.min(Math.max(el.data.x, 0), maxX);
          const y = Math.min(Math.max(el.data.y, 0), maxY);
          if (
            width !== el.data.width ||
            height !== el.data.height ||
            x !== el.data.x ||
            y !== el.data.y
          ) {
            changed = true;
            return {
              type: "text",
              data: { ...el.data, x, y, width, height },
            } as PageElement;
          }
          return el;
        }
        if (el.type === "image") {
          const rotation = (el.data.rotation || 0) % 360;
          const isQuarter = Math.abs(rotation) % 180 !== 0;
          const maxWidth = isQuarter ? pageContentHeight : pageContentWidth;
          const maxHeight = isQuarter ? pageContentWidth : pageContentHeight;
          const width = Math.min(Math.max(el.data.width, 20), maxWidth);
          const height = Math.min(Math.max(el.data.height, 20), maxHeight);
          const rotatedWidth = isQuarter ? height : width;
          const rotatedHeight = isQuarter ? width : height;
          const maxX = Math.max(0, pageContentWidth - rotatedWidth);
          const maxY = Math.max(0, pageContentHeight - rotatedHeight);
          const x = Math.min(Math.max(el.data.x, 0), maxX);
          const y = Math.min(Math.max(el.data.y, 0), maxY);
          if (
            width !== el.data.width ||
            height !== el.data.height ||
            x !== el.data.x ||
            y !== el.data.y
          ) {
            changed = true;
            return {
              type: "image",
              data: { ...el.data, x, y, width, height },
            } as PageElement;
          }
          return el;
        }
        return el;
      });
      return { ...p, elements };
    });
    if (changed) {
      setBook({ ...prev, pages });
    }
  }, [
    book,
    getPagePaddingByIndex,
    hasMeasured,
    pageHeight,
    pageWidth,
    renderZoom,
    setBook,
  ]);

  const removeElement = useCallback(
    (elementId: string) => {
      pushHistory();
      const newPages = book.pages.map((p) => {
        if (p.id !== selectedPage?.id) return p;
        return {
          ...p,
          elements: p.elements.filter((el) =>
            el.type === "text"
              ? el.data.id !== elementId
              : (el as any).data.id !== elementId,
          ),
        };
      });
      setBook({ ...book, pages: newPages });
      if (selectedElementId === elementId) setSelectedElementId(null);
    },
    [book, selectedPage, setBook, selectedElementId, pushHistory],
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedPage || !selectedElement) return;
    pushHistory();
    const newId = generateId("dup");
    const cloned = {
      ...selectedElement,
      data: {
        ...selectedElement.data,
        id: newId,
        x: Math.min(selectedElement.data.x + 10, contentPageWidth - 20),
        y: Math.min(selectedElement.data.y + 10, contentPageHeight - 20),
      },
    } as PageElement;
    const newPages = book.pages.map((p) =>
      p.id === selectedPage.id
        ? { ...p, elements: [...p.elements, cloned] }
        : p,
    );
    setBook({ ...book, pages: newPages });
    setSelectedElementId(newId);
  }, [
    book,
    selectedElement,
    selectedPage,
    setBook,
    contentPageWidth,
    contentPageHeight,
    pushHistory,
  ]);

  const bringToFront = useCallback(() => {
    if (!selectedPage || !selectedElementId) return;
    pushHistory();
    const newPages = book.pages.map((p) => {
      if (p.id !== selectedPage.id) return p;
      const idx = p.elements.findIndex((el) =>
        el.type === "text"
          ? el.data.id === selectedElementId
          : (el as any).data.id === selectedElementId,
      );
      if (idx === -1) return p;
      const copy = [...p.elements];
      const [el] = copy.splice(idx, 1);
      copy.push(el);
      return { ...p, elements: copy };
    });
    setBook({ ...book, pages: newPages });
  }, [book, selectedPage, selectedElementId, setBook, pushHistory]);

  const sendToBack = useCallback(() => {
    if (!selectedPage || !selectedElementId) return;
    pushHistory();
    const newPages = book.pages.map((p) => {
      if (p.id !== selectedPage.id) return p;
      const idx = p.elements.findIndex((el) =>
        el.type === "text"
          ? el.data.id === selectedElementId
          : (el as any).data.id === selectedElementId,
      );
      if (idx === -1) return p;
      const copy = [...p.elements];
      const [el] = copy.splice(idx, 1);
      copy.unshift(el);
      return { ...p, elements: copy };
    });
    setBook({ ...book, pages: newPages });
  }, [book, selectedPage, selectedElementId, setBook, pushHistory]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName;
      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (editingElementId) return; // let textarea handle its own undo
      if (isTypingTarget(e.target)) return;

      const isMeta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (isMeta && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }
      if (isMeta && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }
      if (isMeta && key === "c") {
        if (selectedElement) {
          e.preventDefault();
          copyElement(selectedElement);
        }
        return;
      }
      if (isMeta && key === "v") {
        if (clipboardRef.current) {
          e.preventDefault();
          pasteClipboard();
        }
        return;
      }
      if (!isMeta && (key === "delete" || key === "backspace")) {
        if (selectedElement) {
          e.preventDefault();
          removeElement(selectedElement.data.id);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    editingElementId,
    selectedElement,
    copyElement,
    pasteClipboard,
    removeElement,
  ]);

  // Using react-rnd for drag/resize interactions

  const currentPageIndex = selectedPageIndex >= 0 ? selectedPageIndex : 0;

  const flipToSelected = useCallback(() => {
    bookRef.current?.turnToPage(currentPageIndex);
  }, [currentPageIndex]);

  const flipToIndex = useCallback(
    (index: number) => {
      bookRef.current?.turnToPage(index);
      const target = book.pages[index]?.id;
      if (target) setSelectedPageId(target);
    },
    [book.pages],
  );

  const openCoverWizard = useCallback(() => {
    setCoverError(null);
    setCoverWizardView(coverOptions.length > 0 ? "results" : "form");
    setCoverDialogOpen(true);
  }, [coverOptions.length]);

  const onCoverDialogChange = useCallback(
    (open: boolean) => {
      setCoverDialogOpen(open);
      if (open) {
        setCoverWizardView(coverOptions.length > 0 ? "results" : "form");
      }
    },
    [coverOptions.length],
  );

  const generateCoverOptions = useCallback(async () => {
    if (!isPaidUser) {
      setCoverError("Cover generation is available on paid plans only.");
      setCoverWizardView("form");
      toast.error("Upgrade required for cover generation");
      return;
    }

    if (!canGenerateCoverOptions) {
      setCoverError(
        "Add a prompt, or fill the guided fields so we can build your cover prompt.",
      );
      setCoverWizardView("form");
      return;
    }

    setIsGeneratingCovers(true);
    setCoverError(null);
    setCoverWizardView("loading");

    try {
      const response = await fetch("/api/books/cover-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: coverTarget,
          prompt: effectiveCoverPrompt,
          titleText: coverTitleText.trim(),
          aspectRatio: coverAspectRatio,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        options?: Array<{ id: string; url: string; name?: string }>;
      } | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to generate cover options. Please try again.",
        );
      }

      const normalized = (payload?.options || [])
        .filter(
          (option) =>
            typeof option?.id === "string" && typeof option?.url === "string",
        )
        .map((option, index) => ({
          id: option.id,
          url: option.url,
          name:
            option.name ||
            `${coverTarget === "front" ? "Front" : "Back"} cover option ${index + 1}`,
        }));

      if (normalized.length === 0) {
        throw new Error("No cover options were returned.");
      }

      setCoverOptions(normalized);
      setCoverWizardView("results");

      toast.success("Cover options generated");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate cover options.";
      setCoverError(message);
      setCoverWizardView("form");
      toast.error(message);
    } finally {
      setIsGeneratingCovers(false);
    }
  }, [
    coverAspectRatio,
    coverPrompt,
    coverTarget,
    coverTitleText,
    canGenerateCoverOptions,
    effectiveCoverPrompt,
    isPaidUser,
  ]);

  const applyCoverOption = useCallback(
    async (asset: AssetItem) => {
      setCoverError(null);
      setSavingCoverOptionId(asset.id);

      let persistedAsset: AssetItem = asset;
      try {
        if (asset.id.startsWith("temp-cover-option-")) {
          const response = await fetch("/api/books/cover-assets/select", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: asset.url,
              target: coverTarget,
            }),
          });

          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            asset?: { id: string; url: string; name?: string };
          } | null;

          if (!response.ok || !payload?.asset?.id || !payload.asset.url) {
            throw new Error(
              payload?.error || "Failed to save selected cover option.",
            );
          }

          persistedAsset = {
            id: payload.asset.id,
            url: payload.asset.url,
            name: payload.asset.name || asset.name,
          };

          setEditorAssets((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            map.set(persistedAsset.id, persistedAsset);
            return Array.from(map.values());
          });
          setCoverOptions((prev) =>
            prev.map((option) =>
              option.id === asset.id ? persistedAsset : option,
            ),
          );
        }

        const targetIsBack = coverTarget === "back";
        const nextPages = book.pages.map((page) => ({
          ...page,
          elements: [...page.elements],
        }));

        if (nextPages.length === 0) {
          nextPages.push({ id: generateId("page"), elements: [] });
        }
        let pageIndex = 0;
        if (targetIsBack) {
          if (nextPages.length === 1) {
            nextPages.push({ id: generateId("page"), elements: [] });
          }
          pageIndex = nextPages.length - 1;
        } else {
          const firstPage = nextPages[0];
          const hasFrontCoverOnFirstPage = firstPage?.elements.some(
            (el) => el.type === "image" && el.data.coverRole === "front",
          );
          if (!hasFrontCoverOnFirstPage) {
            nextPages.unshift({ id: generateId("page"), elements: [] });
          }
          pageIndex = 0;
        }

        const targetPage = nextPages[pageIndex];
        if (!targetPage) return;
        const targetPagePadding = getPagePaddingByIndex(pageIndex);
        const targetPadUnits = targetPagePadding / Math.max(renderZoom, 0.0001);
        const targetContentPageWidth = Math.max(
          0,
          pageWidth - 2 * targetPadUnits,
        );
        const targetContentPageHeight = Math.max(
          0,
          pageHeight - 2 * targetPadUnits,
        );

        const coverTitlePrefix = `cover_title_${coverTarget}_`;
        const nextElements = targetPage.elements.filter(
          (el) =>
            !(
              (el.type === "image" && el.data.coverRole === coverTarget) ||
              (el.type === "text" && el.data.id.startsWith(coverTitlePrefix))
            ),
        );

        const imageId = generateId("img");
        const coverImage: EditorImage = {
          id: imageId,
          assetId: persistedAsset.id,
          x: 0,
          y: 0,
          width: Math.max(20, Math.round(targetContentPageWidth)),
          height: Math.max(20, Math.round(targetContentPageHeight)),
          fit: "cover",
          rotation: 0,
          objectPosX: 50,
          objectPosY: 50,
          coverRole: coverTarget,
        };

        const titleText = coverTitleText.trim();
        if (titleText) {
          const titleWidth = Math.max(
            200,
            Math.round(targetContentPageWidth * 0.9),
          );
          const titleHeight = Math.max(
            54,
            Math.round(targetContentPageHeight * 0.16),
          );
          const titleX = Math.max(
            0,
            Math.round((targetContentPageWidth - titleWidth) / 2),
          );
          const titleY = Math.max(
            0,
            Math.round(targetContentPageHeight * 0.04),
          );
          const titleBox: EditorTextBox = {
            id: `${coverTitlePrefix}${generateId("txt")}`,
            x: titleX,
            y: titleY,
            width: titleWidth,
            height: titleHeight,
            text: titleText,
            richText: plainTextToRichText(titleText),
            fontSize: Math.max(24, Math.round(targetContentPageWidth * 0.06)),
            bold: true,
            italic: false,
            underline: false,
            fontFamily: "Geist",
            textAlign: "center",
            verticalAlign: "middle",
            fontColor: "#111827",
            backgroundColor: "rgba(255,255,255,0.7)",
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 10,
            holderShape: "none",
            boxShadow: "none",
            padding: 8,
            chatBubble: undefined,
          };
          nextElements.push({ type: "text", data: titleBox });
        }

        nextPages[pageIndex] = {
          ...targetPage,
          elements: [{ type: "image", data: coverImage }, ...nextElements],
        };

        pushHistory();
        setBook({
          ...book,
          pages: nextPages,
        });

        setSelectedPageId(targetPage.id);
        setSelectedElementId(imageId);
        setEditingElementId(null);
        setCoverDialogOpen(false);

        requestAnimationFrame(() => {
          bookRef.current?.turnToPage(pageIndex);
        });

        toast.success(
          `${targetIsBack ? "Back cover" : "Front cover"} applied to the book.`,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to apply selected cover option.";
        setCoverError(message);
        toast.error(message);
      } finally {
        setSavingCoverOptionId(null);
      }
    },
    [
      book,
      coverTarget,
      getPagePaddingByIndex,
      pageHeight,
      pageWidth,
      pushHistory,
      renderZoom,
      setBook,
      coverTitleText,
      setCoverOptions,
      setCoverDialogOpen,
      setEditorAssets,
    ],
  );

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return editorAssets;
    return editorAssets.filter((a) =>
      (a.name || a.id).toLowerCase().includes(query),
    );
  }, [editorAssets, assetQuery]);

  // Asset thumbnail with big preview tooltip and loading spinner
  function AssetTile({
    asset,
    onClick,
    side = "right",
  }: {
    asset: AssetItem;
    onClick: () => void;
    side?: "top" | "right" | "bottom" | "left";
  }) {
    const [loaded, setLoaded] = useState(false);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="focus-visible:ring-primary/40 group relative aspect-square overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900/80"
            onClick={onClick}
            title={asset.name || "Add image to page"}
          >
            <Image
              alt={asset.name || "asset"}
              src={asset.url}
              fill
              sizes="100px"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/20 opacity-0 transition duration-200 group-hover:opacity-100" />
            {asset.name ? (
              <div className="pointer-events-none absolute inset-x-1 bottom-1 truncate text-[10px] font-medium text-white opacity-0 transition duration-200 group-hover:opacity-100">
                {asset.name}
              </div>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align="center" className="p-1">
          <div className="relative size-[40vw] max-h-[480px] max-w-[480px] overflow-hidden rounded-lg border bg-background">
            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icons.spinner className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            <Image
              alt={asset.name || "asset preview"}
              src={asset.url}
              fill
              sizes="(max-width: 768px) 60vw, 40vw"
              className="rounded object-contain"
              onLoadingComplete={() => setLoaded(true)}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!mounted) {
    return (
      <div className="grid gap-4">
        <div>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
        <div className="h-[60vh] w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const saveLabel = bookId ? "Saved" : "Draft";
  const inspectorCardClass =
    "rounded-2xl border bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40";

  const elementInspectorContent = selectedElement ? (
    <div className="space-y-4">
      <div className={inspectorCardClass}>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-400">
            Selection
          </Label>
          <span className="text-xs text-muted-foreground dark:text-slate-500">
            Delete / Backspace
          </span>
        </div>
        <Button
          variant="destructive"
          onClick={() => removeElement(selectedElement.data.id)}
          className="mt-3 h-11 w-full rounded-xl text-xs"
        >
          <Icons.trash className="mr-2 size-4" />
          Delete selected
        </Button>
      </div>

      {selectedElement.type === "text" ? (
        <div className={inspectorCardClass}>
          <TextProperties
            selectedTextBox={selectedElement.data as EditorTextBox}
            onUpdate={(partial) =>
              updateElementData(selectedElement.data.id, partial)
            }
          />
        </div>
      ) : null}

      {selectedElement.type === "image" ? (
        <div className={inspectorCardClass}>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-400">
              Image
            </Label>
            <span className="text-xs text-muted-foreground dark:text-slate-500">Fit & rotate</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              variant={
                (selectedElement.data as EditorImage).fit === "contain"
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                updateElementData(selectedElement.data.id, {
                  fit: "contain",
                } as Partial<EditorImage>)
              }
              className="h-10 rounded-xl text-xs"
            >
              Contain
            </Button>
            <Button
              variant={
                (selectedElement.data as EditorImage).fit === "cover"
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                updateElementData(selectedElement.data.id, {
                  fit: "cover",
                } as Partial<EditorImage>)
              }
              className="h-10 rounded-xl text-xs"
            >
              Cover
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentRot =
                  (selectedElement.data as EditorImage).rotation || 0;
                const nextRot = (currentRot + 90) % 360;
                const willQuarterTurn = Math.abs(nextRot % 180) !== 0;
                const newWidth = willQuarterTurn
                  ? Math.min(selectedElement.data.height, contentPageWidth)
                  : Math.min(selectedElement.data.width, contentPageWidth);
                const newHeight = willQuarterTurn
                  ? Math.min(selectedElement.data.width, contentPageHeight)
                  : Math.min(selectedElement.data.height, contentPageHeight);
                const maxX = Math.max(0, contentPageWidth - newWidth);
                const maxY = Math.max(0, contentPageHeight - newHeight);
                const newX = Math.min(
                  Math.max(selectedElement.data.x, 0),
                  maxX,
                );
                const newY = Math.min(
                  Math.max(selectedElement.data.y, 0),
                  maxY,
                );
                updateElementData(selectedElement.data.id, {
                  rotation: nextRot,
                  width: newWidth,
                  height: newHeight,
                  x: newX,
                  y: newY,
                } as Partial<EditorImage>);
              }}
              className="h-10 rounded-xl text-xs sm:col-span-2"
            >
              Rotate 90°
            </Button>
          </div>
        </div>
      ) : null}

      <div className={inspectorCardClass}>
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-400">
          Actions
        </Label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="sm"
            onClick={duplicateSelected}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.copy className="mr-2 size-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={bringToFront}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.arrowUpRight className="mr-2 size-4" />
            Bring to front
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={sendToBack}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.chevronRight className="mr-2 size-4 rotate-180" />
            Send to back
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed dark:border-slate-700 p-4 text-sm text-muted-foreground dark:text-slate-400">
      Select an element on the page to edit its properties.
    </div>
  );

  const documentInspectorContent = (
    <div className="space-y-4 text-sm">
      <div className="bg-muted/20 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-500">
          Summary
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground dark:text-slate-500">Pages</p>
            <p className="text-base font-semibold dark:text-slate-50">{book.pages.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground dark:text-slate-500">View</p>
            <p className="text-base font-semibold dark:text-slate-50">
              {isSingleMode ? "Single" : "Spread"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground dark:text-slate-500">Format</p>
            <p className="text-base font-semibold dark:text-slate-50">{pageFormat}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground dark:text-slate-500">Orientation</p>
            <p className="text-base font-semibold dark:text-slate-50 capitalize">
              {pageOrientation}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-4 dark:bg-slate-900/70">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-400">
          Format
        </Label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant={pageFormat === "A3" ? "secondary" : "outline"}
            onClick={() => setPageFormat("A3")}
          >
            A3
          </Button>
          <Button
            size="sm"
            variant={pageFormat === "A4" ? "secondary" : "outline"}
            onClick={() => setPageFormat("A4")}
          >
            A4
          </Button>
          <Button
            size="sm"
            variant={pageFormat === "A5" ? "secondary" : "outline"}
            onClick={() => setPageFormat("A5")}
          >
            A5
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-4 dark:bg-slate-900/70">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-400">
          Orientation
        </Label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={pageOrientation === "portrait" ? "secondary" : "outline"}
            onClick={() => setPageOrientation("portrait")}
          >
            Portrait
          </Button>
          <Button
            size="sm"
            variant={pageOrientation === "landscape" ? "secondary" : "outline"}
            onClick={() => setPageOrientation("landscape")}
          >
            Landscape
          </Button>
        </div>
      </div>
    </div>
  );

  const renderInspectorContent = (scrollAreaClassName: string) => (
    <ScrollArea className={`pr-3 ${scrollAreaClassName}`.trim()}>
      {elementInspectorContent}
    </ScrollArea>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#f8fbff] dark:bg-slate-950 min-h-screen">
      {/* Top Bar */}
      <div className="rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-[240px] flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span className="rounded-xl bg-purple-100 dark:bg-purple-900/40 px-3 py-1 text-xs font-black text-purple-700 dark:text-purple-300 border-2 border-slate-900 dark:border-slate-600">
                Studio
              </span>
              <span className="dark:text-slate-400">Book editor</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                className="h-14 w-full max-w-md rounded-2xl border-4 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-5 text-xl font-black text-slate-900 dark:text-slate-50 shadow-none focus-visible:ring-0 focus-visible:border-slate-900 dark:focus-visible:border-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-700 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
                value={book.title}
                onChange={(e) => setBook({ ...book, title: e.target.value })}
                placeholder="Book title"
                aria-label="Book title"
              />
              <div className="flex items-center gap-2 text-sm font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border-2 border-slate-200 dark:border-slate-600">
                <Icons.bookOpen className="size-5" />
                <span>{book.pages.length} pages</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
             {/* Cover Wizard Button */}
            <Button
              variant={isPaidUser ? "secondary" : "outline"}
              className="h-14 rounded-2xl px-6 text-base font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all dark:text-slate-50"
              onClick={openCoverWizard}
              disabled={Boolean(savingCoverOptionId)}
            >
              <Icons.bookOpen className="mr-2 size-5 text-purple-600 dark:text-purple-400" />
              Cover Wizard
            </Button>
            
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 rounded-2xl px-4 text-base font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all dark:text-slate-50"
                >
                  <Icons.ellipsis className="mr-2 size-5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-4 border-slate-900 dark:border-slate-700 dark:bg-slate-900 p-2 font-bold shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                <DropdownMenuItem onClick={loadLatest} className="rounded-xl py-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 focus:font-black text-slate-900 dark:text-slate-50 text-base">
                  <Icons.download className="mr-2 size-5" />
                  Load latest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPdf} className="rounded-xl py-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 focus:font-black text-slate-900 dark:text-slate-50 text-base">
                  <Icons.download className="mr-2 size-5" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save Button */}
            <Button
              className="h-14 rounded-2xl px-8 text-lg font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] border-2 border-slate-900 dark:border-slate-600 bg-yellow-400 dark:bg-yellow-500 text-slate-900 hover:bg-yellow-500 dark:hover:bg-yellow-600 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all active:translate-y-[4px] active:shadow-none"
              onClick={saveBook}
            >
              <Icons.check className="mr-2 size-6" />
              {bookId ? "Save Changes" : "Save as New"}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[1.5rem] border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 shadow-none">
          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-3">
              {/* Undo/Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={!canUndo}
                    onClick={undo}
                    className="h-12 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 hover:shadow-sm hover:border-2 hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Icons.undo className="mr-1 size-5" />
                    <span className="hidden sm:inline">Undo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="font-bold border-2 border-slate-900 rounded-xl">Undo (Cmd/Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={!canRedo}
                    onClick={redo}
                    className="h-12 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 hover:shadow-sm hover:border-2 hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Icons.undo className="mr-1 size-5 rotate-180" />
                    <span className="hidden sm:inline">Redo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="font-bold border-2 border-slate-900 rounded-xl">
                  Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
                </TooltipContent>
              </Tooltip>

              <Separator
                orientation="vertical"
                className="mx-2 hidden h-8 w-1 bg-slate-200 dark:bg-slate-700 lg:block rounded-full"
              />

              {/* Add Content Buttons */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={addTextBox}
                    className="h-12 px-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:translate-y-[1px] hover:shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Icons.post className="mr-2 size-5 text-blue-600 dark:text-blue-400" />
                    <span className="hidden sm:inline">Add text</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="font-bold border-2 border-slate-900 rounded-xl">Add a text box</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 px-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:translate-y-[1px] hover:shadow-sm hover:bg-pink-50 dark:hover:bg-pink-900/20"
                  >
                    <Icons.media className="mr-2 size-5 text-pink-600 dark:text-pink-400" />
                    <span className="hidden sm:inline">Add image</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] max-w-[90vw] rounded-2xl border-4 border-slate-900 dark:border-slate-700 dark:bg-slate-900 p-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                  <div className="space-y-4">
                    <Input
                      placeholder="Search assets..."
                      value={assetQuery}
                      onChange={(e) => setAssetQuery(e.target.value)}
                      className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 font-bold focus:border-slate-900 dark:focus:border-slate-500"
                    />
                    <ScrollArea className="h-[200px] pr-2 sm:h-[280px]">
                      <TooltipProvider>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {filteredAssets.length === 0 ? (
                            <p className="col-span-2 text-sm font-bold text-slate-400 sm:col-span-3 text-center py-8">
                              No matching assets.
                            </p>
                          ) : (
                            filteredAssets.map((a) => (
                              <AssetTile
                                key={a.id}
                                asset={a}
                                onClick={() => addImage(a.id)}
                                side="top"
                              />
                            ))
                          )}
                        </div>
                      </TooltipProvider>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Separator
                orientation="vertical"
                className="mx-2 hidden h-8 w-1 bg-slate-200 dark:bg-slate-700 lg:block rounded-full"
              />

              {/* Navigation */}
              <Button
                variant="outline"
                onClick={() => bookRef.current?.flipPrev()}
                className="h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400 hover:border-slate-900 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
              >
                <Icons.chevronLeft className="mr-1 size-5" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <div className="bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-black text-slate-600 dark:text-slate-400">
                Page {currentPageIndex + 1} / {book.pages.length}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const current = bookRef.current?.getCurrentPage() ?? 0;
                  let delta = 1;
                  delta = current === 0 ? 1 : 2;
                  const next = current + delta;
                  const lastIndex = book.pages.length - 1;
                  if (next > lastIndex) {
                    const newId = generateId("page");
                    setBook({
                      ...book,
                      pages: [...book.pages, { id: newId, elements: [] }],
                    });
                    setSelectedPageId(newId);
                    setTimeout(() => bookRef.current?.flipNext(), 0);
                  } else {
                    bookRef.current?.flipNext();
                  }
                }}
                className="h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400 hover:border-slate-900 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
              >
                <span className="hidden sm:inline">Next</span>
                <Icons.arrowRight className="ml-1 size-5" />
              </Button>

              <Separator
                orientation="vertical"
                className="mx-2 hidden h-8 w-1 bg-slate-200 dark:bg-slate-700 lg:block rounded-full"
              />

              {/* Zoom */}
              <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Zoom</Label>
                <div className="w-24 sm:w-32">
                  <Slider
                    value={[Math.round(renderZoom * 100)]}
                    min={50}
                    max={zoomMax}
                    step={5}
                    onValueChange={([val]) => {
                      setZoom(val / 100);
                      setHasUserZoomed(true);
                    }}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-sm font-black text-slate-600 dark:text-slate-400 min-w-[3ch]">
                  {Math.round(renderZoom * 100)}%
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setPropertiesOpen(true)}
                className="h-12 px-4 ml-auto rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-200 2xl:hidden"
              >
                <Icons.settings className="mr-2 size-5" />
                <span className="hidden sm:inline">Inspector</span>
              </Button>
            </div>
          </TooltipProvider>
        </div>

        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <Card className="order-2 min-w-0 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] lg:order-1 overflow-hidden">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Library
                  </p>
                  <p className="font-heading text-2xl font-black text-slate-900 dark:text-slate-50">Assets</p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-xl border-2 border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                >
                  {editorAssets.length} items
                </Badge>
              </div>
              <Input
                placeholder="Search assets..."
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                className="h-12 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold focus:border-slate-900 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
              />
              <ScrollArea className="h-[240px] pr-3 sm:h-[320px] xl:h-[400px]">
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    {filteredAssets.length === 0 ? (
                      <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3 lg:col-span-2">
                        {editorAssets.length === 0
                          ? "No creations yet. Generate images first."
                          : "No matching assets."}
                      </p>
                    ) : (
                      filteredAssets.map((a) => (
                        <AssetTile
                          key={a.id}
                          asset={a}
                          onClick={() => addImage(a.id)}
                          side="right"
                        />
                      ))
                    )}
                  </div>
                </TooltipProvider>
              </ScrollArea>
              <div className="rounded-2xl border border-dashed bg-white/50 p-3 text-xs text-muted-foreground dark:bg-slate-900/60">
                Tip: Double-click text to edit. Drag corners to resize.
              </div>
            </CardContent>
          </Card>

          <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
            <Card className="min-w-0 rounded-[2rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 dark:text-slate-50 text-lg">
                      Canvas
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-xl border-2 border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-bold dark:text-slate-400"
                    >
                      {isSingleMode ? "Single" : "Spread"}
                    </Badge>
                  </div>
                  <span>
                    Page {currentPageIndex + 1} of {book.pages.length}
                  </span>
                </div>
                <div
                  ref={viewportRef}
                  className="flex min-w-0 justify-center overflow-hidden rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 shadow-inner"
                >
                  <div className="w-full min-w-0 max-w-full">
                    <SimpleFlipBook
                      ref={bookRef as any}
                      width={displayWidth}
                      height={displayHeight}
                      disableFlipByClick
                      mode={isSingleMode ? "single" : "spread"}
                      cover
                      onPageChange={(idx) => {
                        if (isExportingRef.current) return;
                        const leftId = book.pages[idx]?.id;
                        const rightId = book.pages[idx + 1]?.id;
                        if (
                          selectedPageId !== leftId &&
                          selectedPageId !== rightId
                        ) {
                          if (leftId) setSelectedPageId(leftId);
                          else if (rightId) setSelectedPageId(rightId);
                        }
                      }}
                      className="mx-auto shadow-[12px_12px_0px_0px_rgba(15,23,42,0.1)] border-4 border-slate-900"
                    >
                      {book.pages.map((page, pageIndex) => {
                        const pagePadding = getPagePaddingByIndex(pageIndex);
                        const pagePadUnits =
                          pagePadding / Math.max(renderZoom, 0.0001);
                        const pageContentWidth = Math.max(
                          0,
                          pageWidth - 2 * pagePadUnits,
                        );
                        const pageContentHeight = Math.max(
                          0,
                          pageHeight - 2 * pagePadUnits,
                        );

                        return (
                          <div key={page.id} className="bg-white">
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div
                                  ref={(el) => {
                                    pageRefs.current[page.id] = el;
                                  }}
                                  data-export-page-root="true"
                                  className="relative overflow-hidden bg-white"
                                  style={{
                                    height: displayHeight,
                                    width: displayWidth,
                                    padding: 0,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPageId(page.id);
                                  }}
                                  onContextMenu={(e) => {
                                    const id = getElementIdFromEventTarget(
                                      e as any,
                                    );
                                    if (id) setSelectedElementId(id);
                                    setSelectedPageId(page.id);
                                    setLastContextPageId(page.id);
                                    const pos = getPagePosFromEvent(
                                      page.id,
                                      e as any,
                                    );
                                    if (pos) setLastContextPos(pos);
                                  }}
                                >
                                  <div className="relative size-full">
                                    <div
                                      ref={stageRef}
                                      className="absolute"
                                      style={{
                                        top: pagePadding,
                                        left: pagePadding,
                                        width: Math.max(
                                          0,
                                          Math.round(
                                            pageContentWidth * renderZoom,
                                          ),
                                        ),
                                        height: Math.max(
                                          0,
                                          Math.round(
                                            pageContentHeight * renderZoom,
                                          ),
                                        ),
                                      }}
                                    >
                                      {page.elements.map((el) => {
                                        if (el.type === "image") {
                                          const imgEl = el.data as EditorImage;
                                          const asset = editorAssets.find(
                                            (a) => a.id === imgEl.assetId,
                                          );
                                          if (!asset?.url) return null;
                                          const rot =
                                            (imgEl.rotation || 0) % 360;
                                          const w = imgEl.width;
                                          const h = imgEl.height;
                                          const x = imgEl.x;
                                          const y = imgEl.y;
                                          const selected =
                                            selectedElementId === imgEl.id &&
                                            selectedPageId === page.id;

                                          return (
                                            <Rnd
                                              key={imgEl.id}
                                              position={{
                                                x: Math.round(x * renderZoom),
                                                y: Math.round(y * renderZoom),
                                              }}
                                              size={{
                                                width: Math.round(
                                                  w * renderZoom,
                                                ),
                                                height: Math.round(
                                                  h * renderZoom,
                                                ),
                                              }}
                                              bounds="parent"
                                              enableResizing={selected}
                                              minWidth={20 * renderZoom}
                                              minHeight={20 * renderZoom}
                                              onDragStart={() => {
                                                pushHistory();
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(imgEl.id);
                                              }}
                                              onDrag={(e, data) => {
                                                updateElementPosition(
                                                  imgEl.id,
                                                  data.x / renderZoom,
                                                  data.y / renderZoom,
                                                );
                                              }}
                                              onResizeStart={() => {
                                                pushHistory();
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(imgEl.id);
                                              }}
                                              onResize={(
                                                e,
                                                direction,
                                                ref,
                                                delta,
                                                pos,
                                              ) => {
                                                updateElementData(imgEl.id, {
                                                  x: pos.x / renderZoom,
                                                  y: pos.y / renderZoom,
                                                  width:
                                                    ref.offsetWidth /
                                                    renderZoom,
                                                  height:
                                                    ref.offsetHeight /
                                                    renderZoom,
                                                });
                                              }}
                                              onMouseDown={(e) =>
                                                e.stopPropagation()
                                              }
                                              onTouchStart={(e) =>
                                                e.stopPropagation()
                                              }
                                              onClick={() => {
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(imgEl.id);
                                              }}
                                              onDoubleClick={() => {
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(imgEl.id);
                                              }}
                                              data-element-id={imgEl.id}
                                            >
                                              <div
                                                className={`group size-full border ${
                                                  selected
                                                    ? "border-amber-500"
                                                    : "border-transparent"
                                                }`}
                                                style={{
                                                  transform: `rotate(${rot}deg)`,
                                                  transformOrigin: "center",
                                                }}
                                                title="Drag to position image"
                                              >
                                                <div
                                                  data-export-clean-frame="true"
                                                  className="relative size-full overflow-hidden bg-white"
                                                >
                                                  <Image
                                                    src={asset.url}
                                                    alt={asset.name || "image"}
                                                    fill
                                                    sizes="256px"
                                                    className="pointer-events-none"
                                                    style={{
                                                      objectFit:
                                                        imgEl.fit === "cover"
                                                          ? "cover"
                                                          : "contain",
                                                      objectPosition: `${imgEl.objectPosX ?? 50}% ${imgEl.objectPosY ?? 50}%`,
                                                    }}
                                                  />
                                                </div>
                                                {selected ? (
                                                  <div className="pointer-events-none absolute inset-0 border-2 border-amber-500" />
                                                ) : null}
                                              </div>
                                            </Rnd>
                                          );
                                        }
                                        if (el.type === "text") {
                                          return (
                                            <TextBoxRnd
                                              key={el.data.id}
                                              element={el.data as EditorTextBox}
                                              zoom={renderZoom}
                                              bounds="parent"
                                              isSelected={
                                                selectedElementId ===
                                                  el.data.id &&
                                                selectedPageId === page.id
                                              }
                                              isEditing={
                                                editingElementId === el.data.id
                                              }
                                              onFocusEdit={() =>
                                                setEditingElementId(el.data.id)
                                              }
                                              onBlurEdit={() =>
                                                setEditingElementId(null)
                                              }
                                              onSelect={() => {
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(
                                                  el.data.id,
                                                );
                                              }}
                                              onDoubleClickToEdit={() => {
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(
                                                  el.data.id,
                                                );
                                                setEditingElementId(el.data.id);
                                              }}
                                              onDragStart={() => {
                                                pushHistory();
                                                setSelectedPageId(page.id);
                                                setSelectedElementId(
                                                  el.data.id,
                                                );
                                              }}
                                              onDragTo={(x, y) =>
                                                updateElementPosition(
                                                  el.data.id,
                                                  x,
                                                  y,
                                                )
                                              }
                                              onResizeTo={(
                                                x,
                                                y,
                                                width,
                                                height,
                                              ) =>
                                                updateElementData(el.data.id, {
                                                  x,
                                                  y,
                                                  width,
                                                  height,
                                                })
                                              }
                                              onChangeText={(text, richText) =>
                                                updateText(
                                                  el.data.id,
                                                  text,
                                                  richText,
                                                )
                                              }
                                              onRemove={() =>
                                                removeElement(el.data.id)
                                              }
                                            />
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                {selectedElement &&
                                selectedPageId === page.id ? (
                                  <ContextMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      copyElement(selectedElement);
                                    }}
                                  >
                                    Copy
                                  </ContextMenuItem>
                                ) : null}
                                <ContextMenuItem
                                  disabled={!clipboardRef.current}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    pasteClipboard(
                                      lastContextPos ?? undefined,
                                      page.id,
                                    );
                                  }}
                                >
                                  Paste
                                </ContextMenuItem>
                                {selectedElement &&
                                selectedPageId === page.id ? (
                                  <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      onClick={(e) => {
                                        e.preventDefault();
                                        duplicateSelected();
                                      }}
                                    >
                                      Duplicate
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={(e) => {
                                        e.preventDefault();
                                        removeElement(selectedElement.data.id);
                                      }}
                                    >
                                      Delete
                                    </ContextMenuItem>
                                  </>
                                ) : null}
                              </ContextMenuContent>
                            </ContextMenu>
                          </div>
                        );
                      })}
                    </SimpleFlipBook>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-2xl border dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-500">
                  Page strip
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPage}
                    className="h-8 px-2 text-xs"
                  >
                    <Icons.add className="mr-1 size-3" />
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removePage}
                    className="h-8 px-2 text-xs"
                  >
                    <Icons.trash className="mr-1 size-3" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {book.pages.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPageId(p.id);
                      flipToIndex(idx);
                    }}
                    className={`flex min-w-[72px] flex-col items-center rounded-2xl border px-3 py-2 text-center text-xs transition ${
                      p.id === selectedPageId
                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-300 dark:bg-amber-500/15 dark:text-amber-100"
                        : "border-muted bg-white hover:border-amber-200 dark:border-slate-700 dark:bg-slate-900/80"
                    }`}
                  >
                    <span className="text-sm font-semibold">{idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Page
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 border-t dark:border-slate-700 pt-4">
                <Label className="text-sm font-medium dark:text-slate-50">Document settings</Label>
                <div className="mt-3">{documentInspectorContent}</div>
              </div>
            </div>
          </div>

          <Card className="order-3 hidden rounded-3xl border dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 shadow-sm 2xl:block">
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-slate-500">
                    Inspector
                  </p>
                  <p className="font-heading text-lg text-foreground dark:text-slate-50">
                    Properties
                  </p>
                </div>
                <Badge
                  variant={selectedElement ? "secondary" : "outline"}
                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                >
                  {selectedElement ? "Selected" : "No selection"}
                </Badge>
              </div>
              {renderInspectorContent(
                "h-[50vh] sm:h-[420px] xl:h-[calc(100vh-420px)]",
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={coverDialogOpen} onOpenChange={onCoverDialogChange}>
        <DialogContent className="dashboard-theme max-h-[76vh] w-[92vw] max-w-[92vw] overflow-hidden p-0 md:w-[66vw] md:max-w-[66vw]">
          <div className="flex max-h-[76vh] flex-col">
            <div className="bg-muted dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
              <DialogHeader>
                <DialogTitle>Cover Wizard</DialogTitle>
                <DialogDescription>
                  3 steps: choose side, describe the scene, pick one generated
                  cover.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={`rounded-full border px-2 py-1 font-medium ${
                    coverWizardView === "form"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background/90 text-muted-foreground"
                  }`}
                >
                  1. Setup
                </span>
                <span
                  className={`rounded-full border px-2 py-1 font-medium ${
                    coverWizardView === "form"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background/90 text-muted-foreground"
                  }`}
                >
                  2. Describe
                </span>
                <span
                  className={`rounded-full border px-2 py-1 font-medium ${
                    coverWizardView === "loading" ||
                    coverWizardView === "results"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background/90 text-muted-foreground"
                  }`}
                >
                  3. Pick
                </span>
              </div>
            </div>

            {coverWizardView === "loading" ? (
              <div className="flex h-[46vh] flex-col items-center justify-center gap-4 px-6 text-center sm:h-[48vh]">
                <div className="border-primary/30 bg-primary/10 rounded-full border p-4">
                  <Icons.spinner className="size-8 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    Generating cover options
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This can take a few seconds. We will show results in this
                    popup.
                  </p>
                </div>
              </div>
            ) : null}

            {coverWizardView === "form" ? (
              <>
                <ScrollArea className="h-[46vh] p-4 sm:h-[48vh]">
                  <div className="space-y-4 pb-2">
                    <section className="space-y-3 rounded-2xl border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Step 1: Setup
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Cover side
                        </p>
                        <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl border p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCoverTarget("front")}
                            disabled={
                              isGeneratingCovers || Boolean(savingCoverOptionId)
                            }
                            aria-pressed={coverTarget === "front"}
                            className={
                              coverTarget === "front"
                                ? "ring-primary/30 h-9 border border-primary bg-primary font-semibold text-primary-foreground shadow-sm ring-2 hover:bg-primary"
                                : "h-9 border border-transparent bg-transparent text-muted-foreground hover:bg-background"
                            }
                          >
                            {coverTarget === "front" ? (
                              <Icons.check className="mr-1 size-3.5" />
                            ) : null}
                            Front cover
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCoverTarget("back")}
                            disabled={
                              isGeneratingCovers || Boolean(savingCoverOptionId)
                            }
                            aria-pressed={coverTarget === "back"}
                            className={
                              coverTarget === "back"
                                ? "ring-primary/30 h-9 border border-primary bg-primary font-semibold text-primary-foreground shadow-sm ring-2 hover:bg-primary"
                                : "h-9 border border-transparent bg-transparent text-muted-foreground hover:bg-background"
                            }
                          >
                            {coverTarget === "back" ? (
                              <Icons.check className="mr-1 size-3.5" />
                            ) : null}
                            Back cover
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cover-title-text">
                          Title text (optional)
                        </Label>
                        <Input
                          id="cover-title-text"
                          value={coverTitleText}
                          onChange={(event) =>
                            setCoverTitleText(event.target.value)
                          }
                          placeholder="My Magical Coloring Book"
                          disabled={
                            isGeneratingCovers ||
                            Boolean(savingCoverOptionId) ||
                            !isPaidUser
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          We place this as editable text after you select a
                          cover.
                        </p>
                      </div>
                    </section>

                    <section className="space-y-3 rounded-2xl border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Step 2: Describe
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Quick builder for non-designers. Fill what you know.
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="cover-main-character">
                            Main characters
                          </Label>
                          <Input
                            id="cover-main-character"
                            value={coverMainCharacter}
                            onChange={(event) =>
                              setCoverMainCharacter(event.target.value)
                            }
                            placeholder="ex: two friendly ghosts and a sleeping cat"
                            disabled={
                              isGeneratingCovers ||
                              Boolean(savingCoverOptionId) ||
                              !isPaidUser
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cover-setting">Setting</Label>
                          <Input
                            id="cover-setting"
                            value={coverSetting}
                            onChange={(event) =>
                              setCoverSetting(event.target.value)
                            }
                            placeholder="ex: cozy room with fireplace"
                            disabled={
                              isGeneratingCovers ||
                              Boolean(savingCoverOptionId) ||
                              !isPaidUser
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cover-mood">Mood and style</Label>
                          <Input
                            id="cover-mood"
                            value={coverMood}
                            onChange={(event) =>
                              setCoverMood(event.target.value)
                            }
                            placeholder="ex: warm, cute, wholesome"
                            disabled={
                              isGeneratingCovers ||
                              Boolean(savingCoverOptionId) ||
                              !isPaidUser
                            }
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="cover-extra-details">
                            Extra details (optional)
                          </Label>
                          <Textarea
                            id="cover-extra-details"
                            value={coverExtraDetails}
                            onChange={(event) =>
                              setCoverExtraDetails(event.target.value)
                            }
                            placeholder="props, decorations, composition hints..."
                            className="min-h-[70px] resize-none"
                            disabled={
                              isGeneratingCovers ||
                              Boolean(savingCoverOptionId) ||
                              !isPaidUser
                            }
                          />
                        </div>
                      </div>

                      {guidedCoverPrompt.trim().length > 0 ? (
                        <div className="bg-muted/30 space-y-2 rounded-xl border p-3 text-xs">
                          <p className="font-semibold text-foreground">
                            Auto-generated prompt draft
                          </p>
                          <p className="text-muted-foreground">
                            {guidedCoverPrompt}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => setCoverPrompt(guidedCoverPrompt)}
                            disabled={
                              isGeneratingCovers ||
                              Boolean(savingCoverOptionId) ||
                              !isPaidUser
                            }
                          >
                            Copy draft to custom prompt
                          </Button>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <Label htmlFor="cover-prompt">
                          Custom prompt (optional)
                        </Label>
                        <Textarea
                          id="cover-prompt"
                          value={coverPrompt}
                          onChange={(event) =>
                            setCoverPrompt(event.target.value)
                          }
                          placeholder="Optional: paste your own full prompt."
                          className="min-h-[86px] resize-none"
                          disabled={
                            isGeneratingCovers ||
                            Boolean(savingCoverOptionId) ||
                            !isPaidUser
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Prompt examples
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {coverPromptExamples.map((example) => (
                            <button
                              key={example.title}
                              type="button"
                              className="hover:border-primary/40 hover:bg-accent/50 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition"
                              onClick={() => setCoverPrompt(example.prompt)}
                              disabled={
                                isGeneratingCovers ||
                                Boolean(savingCoverOptionId)
                              }
                            >
                              {example.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    {coverError ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                        {coverError}
                      </p>
                    ) : null}

                    {!canGenerateCoverOptions && isPaidUser ? (
                      <p className="text-xs text-muted-foreground">
                        Add a custom prompt or fill the quick-builder fields.
                      </p>
                    ) : null}
                  </div>
                </ScrollArea>

                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/75 border-t p-4 backdrop-blur">
                  {isPaidUser ? (
                    <Button
                      onClick={generateCoverOptions}
                      disabled={
                        isGeneratingCovers ||
                        Boolean(savingCoverOptionId) ||
                        !canGenerateCoverOptions
                      }
                      className="w-full"
                    >
                      Generate cover options
                    </Button>
                  ) : (
                    <Link
                      href="/dashboard/billing"
                      className={`${buttonVariants({ variant: "outline" })} w-full`}
                    >
                      Upgrade to unlock cover wizard
                    </Link>
                  )}
                </div>
              </>
            ) : null}

            {coverWizardView === "results" ? (
              <>
                <ScrollArea className="h-[46vh] p-4 sm:h-[48vh]">
                  <div className="space-y-4 pb-2">
                    <section className="space-y-3 rounded-2xl border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Step 3: Pick a cover
                      </p>
                      <div className="bg-muted/30 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                        Destination:{" "}
                        <span className="font-semibold text-foreground">
                          {coverTarget === "front"
                            ? "First page (front cover)"
                            : "Last page (back cover)"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Only the selected option is saved to your library.
                      </p>
                      {coverOptions.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          No options available yet. Go back and generate again.
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {coverOptions.map((option) => (
                            <div
                              key={option.id}
                              className="rounded-xl border bg-background p-2"
                            >
                              <div
                                className="bg-muted/30 relative w-full overflow-hidden rounded-lg border"
                                style={{
                                  aspectRatio: coverAspectRatio.replace(
                                    ":",
                                    " / ",
                                  ),
                                }}
                              >
                                <Image
                                  src={option.url}
                                  alt={option.name || "Generated cover option"}
                                  fill
                                  sizes="340px"
                                  className="object-cover"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 w-full"
                                disabled={Boolean(savingCoverOptionId)}
                                onClick={() => void applyCoverOption(option)}
                              >
                                {savingCoverOptionId === option.id ? (
                                  <>
                                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                                    Saving selected option...
                                  </>
                                ) : coverTarget === "front" ? (
                                  "Add to first page"
                                ) : (
                                  "Add to last page"
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {coverError ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                        {coverError}
                      </p>
                    ) : null}
                  </div>
                </ScrollArea>

                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/75 border-t p-4 backdrop-blur">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="w-full sm:flex-1"
                      onClick={() => setCoverWizardView("form")}
                      disabled={
                        Boolean(savingCoverOptionId) || isGeneratingCovers
                      }
                    >
                      Back to prompt
                    </Button>
                    {isPaidUser ? (
                      <Button
                        onClick={generateCoverOptions}
                        disabled={
                          isGeneratingCovers || Boolean(savingCoverOptionId)
                        }
                        className="w-full sm:flex-1"
                      >
                        {isGeneratingCovers ? (
                          <>
                            <Icons.spinner className="mr-2 size-4 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          "Generate new options"
                        )}
                      </Button>
                    ) : (
                      <Link
                        href="/dashboard/billing"
                        className={`${buttonVariants({ variant: "outline" })} w-full sm:flex-1`}
                      >
                        Upgrade to unlock cover wizard
                      </Link>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-[92vw] max-w-[460px] flex-col overflow-hidden sm:max-w-[520px] 2xl:hidden"
        >
          <SheetHeader>
            <SheetTitle>Inspector</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1">
            {renderInspectorContent("h-full")}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
