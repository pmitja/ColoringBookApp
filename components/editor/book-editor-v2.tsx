"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
// Custom lightweight flip viewer
import { Rnd } from "react-rnd";
import { toast } from "sonner";

import useLocalStorage from "@/hooks/use-local-storage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  const [workAreaPaddingEnabled, setWorkAreaPaddingEnabled] =
    useLocalStorage<boolean>("book-editor:v2:work-padding", true);
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
    const BASE_W =
      pageOrientation === "landscape" ? MM.A3.h : MM.A3.w;
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
    const fit =
      (containerWidth - 32) / Math.max(1, pageWidth * pageSlots);
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

  const workAreaPadding = useMemo(
    () => (workAreaPaddingEnabled ? 24 : 0),
    [workAreaPaddingEnabled],
  );

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

      exportImagesAsPdf({
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
    (assetId: string, pos?: { x: number; y: number }) => {
      if (!selectedPage) return;
      pushHistory();
      const safeWidth = contentPageWidth || 360;
      const safeHeight = contentPageHeight || 240;
      const base = Math.min(safeWidth, safeHeight);
      const size = Math.min(Math.max(180, Math.round(base * 0.6)), base);
      const centered = getCenteredPosition(size, size);
      const maxX = Math.max(0, safeWidth - size);
      const maxY = Math.max(0, safeHeight - size);
      const x = Math.min(Math.max(pos?.x ?? centered.x, 0), maxX);
      const y = Math.min(Math.max(pos?.y ?? centered.y, 0), maxY);
      const newImg: EditorImage = {
        id: generateId("img"),
        assetId,
        x,
        y,
        width: size,
        height: size,
        fit: "contain",
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
      getCenteredPosition,
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
      const rect = el.getBoundingClientRect();
      const clientX = (e?.clientX ?? e?.nativeEvent?.clientX ?? 0) as number;
      const clientY = (e?.clientY ?? e?.nativeEvent?.clientY ?? 0) as number;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const xPage = (localX - workAreaPadding) / Math.max(renderZoom, 0.0001);
      const yPage = (localY - workAreaPadding) / Math.max(renderZoom, 0.0001);
      return { x: xPage, y: yPage };
    },
    [pageRefs, workAreaPadding, renderZoom],
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
    const pages = prev.pages.map((p) => {
      const elements = p.elements.map((el) => {
        if (el.type === "text") {
          const width = Math.min(Math.max(el.data.width, 20), contentPageWidth);
          const height = Math.min(
            Math.max(el.data.height, 20),
            contentPageHeight,
          );
          const maxX = Math.max(0, contentPageWidth - width);
          const maxY = Math.max(0, contentPageHeight - height);
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
          const maxWidth = isQuarter ? contentPageHeight : contentPageWidth;
          const maxHeight = isQuarter ? contentPageWidth : contentPageHeight;
          const width = Math.min(Math.max(el.data.width, 20), maxWidth);
          const height = Math.min(Math.max(el.data.height, 20), maxHeight);
          const rotatedWidth = isQuarter ? height : width;
          const rotatedHeight = isQuarter ? width : height;
          const maxX = Math.max(0, contentPageWidth - rotatedWidth);
          const maxY = Math.max(0, contentPageHeight - rotatedHeight);
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
  }, [book, contentPageWidth, contentPageHeight, setBook, hasMeasured]);

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

  const currentPageIndex = useMemo(
    () => book.pages.findIndex((p) => p.id === selectedPage?.id) ?? 0,
    [book.pages, selectedPage],
  );

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

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((a) =>
      (a.name || a.id).toLowerCase().includes(query),
    );
  }, [assets, assetQuery]);

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
            className="group relative aspect-square overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-900/80"
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-neutral-900/10 to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />
            {asset.name ? (
              <div className="pointer-events-none absolute bottom-1 left-1 right-1 truncate text-[10px] font-medium text-white opacity-0 transition duration-200 group-hover:opacity-100">
                {asset.name}
              </div>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align="center" className="p-1">
          <div className="relative h-[40vw] max-h-[480px] w-[40vw] max-w-[480px] overflow-hidden rounded-lg border bg-background">
            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Selection
          </Label>
          <span className="text-xs text-muted-foreground">Delete / Backspace</span>
        </div>
        <Button
          variant="destructive"
          onClick={() => removeElement(selectedElement.data.id)}
          className="mt-3 h-11 w-full rounded-xl text-xs"
        >
          <Icons.trash className="mr-2 h-4 w-4" />
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
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Image
            </Label>
            <span className="text-xs text-muted-foreground">Fit & rotate</span>
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
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Actions
        </Label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="sm"
            onClick={duplicateSelected}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={bringToFront}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.arrowUpRight className="mr-2 h-4 w-4" />
            Bring to front
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={sendToBack}
            className="h-11 rounded-xl text-xs"
          >
            <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
            Send to back
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
      Select an element on the page to edit its properties.
    </div>
  );

  const documentInspectorContent = (
    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Summary
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pages</p>
            <p className="text-base font-semibold">{book.pages.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">View</p>
            <p className="text-base font-semibold">
              {isSingleMode ? "Single" : "Spread"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Format</p>
            <p className="text-base font-semibold">{pageFormat}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Orientation</p>
            <p className="text-base font-semibold capitalize">
              {pageOrientation}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-4 dark:bg-slate-900/70">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
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
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
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

      <div className="rounded-2xl border bg-white/70 p-4 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Work Area
          </Label>
          <Switch
            checked={workAreaPaddingEnabled}
            onCheckedChange={setWorkAreaPaddingEnabled}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {workAreaPaddingEnabled ? "Padding 24px enabled." : "Padding disabled."}
        </p>
      </div>
    </div>
  );

  const renderInspectorContent = (scrollAreaClassName: string) => (
    <ScrollArea className={`pr-3 ${scrollAreaClassName}`.trim()}>
      {elementInspectorContent}
    </ScrollArea>
  );

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="rounded-3xl border bg-gradient-to-br from-slate-50 via-white to-amber-50 p-4 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Studio
              </span>
              <span>Book editor</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="h-11 w-full max-w-md rounded-2xl border border-transparent bg-white/80 px-4 text-base font-semibold shadow-sm focus-visible:border-primary/40 focus-visible:ring-0 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-foreground dark:placeholder:text-muted-foreground sm:text-lg"
                value={book.title}
                onChange={(e) => setBook({ ...book, title: e.target.value })}
                placeholder="Book title"
                aria-label="Book title"
              />
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
              >
                {saveLabel}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icons.bookOpen className="h-3.5 w-3.5" />
                <span>{book.pages.length} pages</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl px-3 text-xs sm:text-sm"
                >
                  <Icons.ellipsis className="mr-1 h-3.5 w-3.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={loadLatest}>
                  <Icons.download className="mr-2 h-4 w-4" />
                  Load latest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPdf}>
                  <Icons.download className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="h-10 rounded-xl px-4 text-xs sm:text-sm"
              onClick={saveBook}
            >
              <Icons.check className="mr-1 h-3.5 w-3.5" />
              {bookId ? "Save" : "Save as New"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-white/70 p-2 backdrop-blur dark:bg-slate-900/70">
          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={!canUndo}
                    onClick={undo}
                    className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                  >
                    <Icons.undo className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Undo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Cmd/Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={!canRedo}
                    onClick={redo}
                    className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                  >
                    <Icons.undo className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Redo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
                </TooltipContent>
              </Tooltip>

              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 lg:block"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={addTextBox}
                    className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                  >
                    <Icons.post className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Add text</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a text box</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                  >
                    <Icons.media className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Add image</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] max-w-[90vw] sm:w-[360px]">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search assets..."
                      value={assetQuery}
                      onChange={(e) => setAssetQuery(e.target.value)}
                    />
                    <ScrollArea className="h-[200px] pr-2 sm:h-[280px]">
                      <TooltipProvider>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {filteredAssets.length === 0 ? (
                            <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3">
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
                className="mx-1 hidden h-6 lg:block"
              />

              <Button
                variant="outline"
                onClick={() => bookRef.current?.flipPrev()}
                className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
              >
                <Icons.chevronLeft className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <div className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                Page {currentPageIndex + 1} of {book.pages.length}
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
                className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <Icons.arrowRight className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
              </Button>

              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 lg:block"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs">Zoom</Label>
                <div className="w-24 sm:w-40">
                  <Slider
                    value={[Math.round(renderZoom * 100)]}
                    min={50}
                    max={zoomMax}
                    step={5}
                    onValueChange={([val]) => {
                      setZoom(val / 100);
                      setHasUserZoomed(true);
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(renderZoom * 100)}%
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setPropertiesOpen(true)}
                className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm 2xl:hidden"
              >
                <Icons.settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Inspector</span>
              </Button>
            </div>
          </TooltipProvider>
        </div>

        <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <Card className="order-2 min-w-0 rounded-3xl border bg-white/80 shadow-sm dark:bg-slate-900/80 lg:order-1">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Library
                  </p>
                  <p className="font-heading text-lg text-foreground">Assets</p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                >
                  {assets.length} items
                </Badge>
              </div>
              <Input
                placeholder="Search assets..."
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                className="rounded-xl bg-white/80 dark:bg-slate-900/80"
              />
              <ScrollArea className="h-[240px] pr-3 sm:h-[320px] xl:h-[400px]">
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    {filteredAssets.length === 0 ? (
                      <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3 lg:col-span-2">
                        {assets.length === 0
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

          <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
            <Card className="min-w-0 rounded-3xl border bg-white/80 shadow-sm dark:bg-slate-900/80">
              <CardContent className="space-y-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Canvas</span>
                    <Badge
                      variant="outline"
                      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
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
                  className="flex min-w-0 justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-white p-3 dark:from-slate-900 dark:to-slate-950"
                >
                  <div className="min-w-0 w-full max-w-full">
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
                      className="mx-auto shadow-2xl ring-1 ring-black/10"
                    >
                      {book.pages.map((page, pageIndex) => (
                        <div key={page.id} className="bg-white">
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div
                                ref={(el) => {
                                  pageRefs.current[page.id] = el;
                                }}
                                data-export-page-root="true"
                                className="relative overflow-hidden rounded-md border bg-white shadow-sm"
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
                                {page.id === selectedPageId ? (
                                  <div
                                    className="pointer-events-none absolute inset-0 rounded-md border-2 border-dashed border-amber-400"
                                    style={{
                                      top: workAreaPadding,
                                      left: workAreaPadding,
                                      right: workAreaPadding,
                                      bottom: workAreaPadding,
                                    }}
                                    data-ignore-export="true"
                                  />
                                ) : null}
                                <div
                                  className={`pointer-events-none absolute bottom-1 ${
                                    (pageIndex + 1) % 2 === 0
                                      ? "left-2"
                                      : "right-2"
                                  } rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm`}
                                  style={{
                                    bottom: workAreaPadding + 2,
                                    left:
                                      (pageIndex + 1) % 2 === 0
                                        ? workAreaPadding + 8
                                        : undefined,
                                    right:
                                      (pageIndex + 1) % 2 !== 0
                                        ? workAreaPadding + 8
                                        : undefined,
                                  }}
                                  data-ignore-export="true"
                                >
                                  Page {pageIndex + 1}
                                </div>

                                <div className="relative h-full w-full">
                                  <div
                                    ref={stageRef}
                                    className="absolute"
                                    style={{
                                      top: workAreaPadding,
                                      left: workAreaPadding,
                                      width: Math.max(
                                        0,
                                        Math.round(contentPageWidth * renderZoom),
                                      ),
                                      height: Math.max(
                                        0,
                                        Math.round(contentPageHeight * renderZoom),
                                      ),
                                    }}
                                  >
                                    {page.elements.map((el) => {
                                      if (el.type === "image") {
                                        const imgEl = el.data as EditorImage;
                                        const asset = assets.find(
                                          (a) => a.id === imgEl.assetId,
                                        );
                                        if (!asset?.url) return null;
                                        const rot = (imgEl.rotation || 0) % 360;
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
                                              width: Math.round(w * renderZoom),
                                              height: Math.round(h * renderZoom),
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
                                            onResize={(e, direction, ref, delta, pos) => {
                                              updateElementData(imgEl.id, {
                                                x: pos.x / renderZoom,
                                                y: pos.y / renderZoom,
                                                width: ref.offsetWidth / renderZoom,
                                                height: ref.offsetHeight / renderZoom,
                                              });
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onTouchStart={(e) => e.stopPropagation()}
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
                                              className={`group h-full w-full border ${
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
                                                className="relative h-full w-full overflow-hidden rounded border bg-white shadow-sm"
                                              >
                                                <Image
                                                  src={asset.url}
                                                  alt={asset.name || "image"}
                                                  fill
                                                  sizes="256px"
                                                  className={`pointer-events-none object-${
                                                    imgEl.fit || "contain"
                                                  }`}
                                                  style={{
                                                    objectPosition: `${imgEl.objectPosX ?? 50}% ${imgEl.objectPosY ?? 50}%`,
                                                  }}
                                                />
                                              </div>
                                              {selected ? (
                                                <div className="pointer-events-none absolute inset-0 rounded border-2 border-amber-500" />
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
                                              selectedElementId === el.data.id &&
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
                                              setSelectedElementId(el.data.id);
                                            }}
                                            onDoubleClickToEdit={() => {
                                              setSelectedPageId(page.id);
                                              setSelectedElementId(el.data.id);
                                              setEditingElementId(el.data.id);
                                            }}
                                            onDragStart={() => {
                                              pushHistory();
                                              setSelectedPageId(page.id);
                                              setSelectedElementId(el.data.id);
                                            }}
                                            onDragTo={(x, y) =>
                                              updateElementPosition(el.data.id, x, y)
                                            }
                                            onResizeTo={(x, y, width, height) =>
                                              updateElementData(el.data.id, {
                                                x,
                                                y,
                                                width,
                                                height,
                                              })
                                            }
                                            onChangeText={(text, richText) =>
                                              updateText(el.data.id, text, richText)
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
                              {selectedElement && selectedPageId === page.id ? (
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
                                  pasteClipboard(lastContextPos ?? undefined, page.id);
                                }}
                              >
                                Paste
                              </ContextMenuItem>
                              {selectedElement && selectedPageId === page.id ? (
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
                      ))}
                    </SimpleFlipBook>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-2xl border bg-white/80 p-3 shadow-sm dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Page strip
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPage}
                    className="h-8 px-2 text-xs"
                  >
                    <Icons.add className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removePage}
                    className="h-8 px-2 text-xs"
                  >
                    <Icons.trash className="mr-1 h-3 w-3" />
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
              <div className="mt-4 border-t pt-4">
                <Label className="text-sm font-medium">Document settings</Label>
                <div className="mt-3">{documentInspectorContent}</div>
              </div>
            </div>
          </div>

          <Card className="order-3 hidden rounded-3xl border bg-white/80 shadow-sm dark:bg-slate-900/80 2xl:block">
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Inspector
                  </p>
                  <p className="font-heading text-lg text-foreground">
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
              {renderInspectorContent("h-[50vh] sm:h-[420px] xl:h-[calc(100vh-420px)]")}
            </CardContent>
          </Card>
        </div>
      </div>

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
