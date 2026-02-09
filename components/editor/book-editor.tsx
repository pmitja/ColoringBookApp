"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
// Custom lightweight flip viewer
import Draggable from "react-draggable";
import { toast } from "sonner";

import useLocalStorage from "@/hooks/use-local-storage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/shared/icons";

import { captureElementAsPng, exportImagesAsPdf } from "./pdf-export";
import SimpleFlipBook, { SimpleFlipBookHandle } from "./simple-flip-book";
import TextBox from "./text-box";
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

export default function BookEditor({
  assets,
  initialBookId = null,
  initialBook = null,
}: BookEditorProps) {
  const mounted = useMounted();
  const [book, setBook] = useLocalStorage<BookState>("book-editor:v1", {
    title: "My Coloring Book",
    pages: [
      { id: generateId("page"), elements: [] },
      { id: generateId("page"), elements: [] },
    ],
  });
  const [bookId, setBookId] = useLocalStorage<string | null>(
    "book-editor:book-id",
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
    "book-editor:page-format",
    "A3",
  );
  const [pageOrientation, setPageOrientation] = useLocalStorage<
    "portrait" | "landscape"
  >("book-editor:orientation", "landscape");
  const [workAreaPaddingEnabled, setWorkAreaPaddingEnabled] =
    useLocalStorage<boolean>("book-editor:work-padding", true);
  const bookRef = useRef<SimpleFlipBookHandle | null>(null);
  const isExportingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [containerWidth, setContainerWidth] = useState<number>(420);
  const [hasMeasured, setHasMeasured] = useState<boolean>(false);
  const [zoom, setZoom] = useLocalStorage<number>("book-editor:zoom", 1.0);
  const [assetQuery, setAssetQuery] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
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

  const renderZoom = useMemo(() => {
    const pageSlots = isSingleMode ? 1 : 2;
    const fit =
      pageWidth > 0
        ? (containerWidth - 32) / (pageWidth * pageSlots)
        : zoom;
    if (isZoomLocked) return Math.max(0.1, fit);
    return zoom;
  }, [isZoomLocked, containerWidth, pageWidth, zoom, isSingleMode]);

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

  const getDragBounds = useCallback(
    (elementWidth: number, elementHeight: number) => {
      const maxX = Math.max(0, contentPageWidth - elementWidth);
      const maxY = Math.max(0, contentPageHeight - elementHeight);
      return {
        left: workAreaPadding,
        top: workAreaPadding,
        right: Math.round(workAreaPadding + maxX * renderZoom),
        bottom: Math.round(workAreaPadding + maxY * renderZoom),
      };
    },
    [workAreaPadding, contentPageWidth, contentPageHeight, renderZoom],
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
      fontSize: 18,
      bold: false,
      italic: false,
      underline: false,
      fontFamily: "Inter",
      textAlign: "left",
      verticalAlign: "top",
      fontColor: "#111827",
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 8,
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
    (elementId: string, text: string) => {
      // Do not push history on every keystroke; snapshot when entering edit mode
      const newPages = book.pages.map((p) => {
        if (p.id !== selectedPage?.id) return p;
        return {
          ...p,
          elements: p.elements.map((el) =>
            el.type === "text" && el.data.id === elementId
              ? ({ type: "text", data: { ...el.data, text } } as PageElement)
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

  // Auto-open properties when an element is selected
  useEffect(() => {
    setPropertiesOpen(!!selectedElementId);
  }, [selectedElementId]);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingElementId) return; // let textarea handle its own undo
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
  ]);

  // Using react-draggable; native DnD removed

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
            className="group relative aspect-square overflow-hidden rounded border"
            onClick={onClick}
            title={asset.name || "Add image to page"}
          >
            <Image
              alt={asset.name || "asset"}
              src={asset.url}
              fill
              sizes="100px"
              className="object-cover transition group-hover:scale-105"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align="center" className="p-1">
          <div className="relative h-[40vw] max-h-[480px] w-[40vw] max-w-[480px] bg-background">
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

  return (
    <div className="grid gap-4 p-2 sm:p-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar */}
        <Card className="order-2 lg:order-1">
          <CardContent className="p-3">
            <Tabs defaultValue="assets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="pages">Pages</TabsTrigger>
              </TabsList>

              <TabsContent value="assets" className="mt-3 space-y-2">
                <Input
                  placeholder="Search assets..."
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                />
                <ScrollArea className="h-[300px] pr-2 sm:h-[400px] lg:h-[520px]">
                  <TooltipProvider>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                      {assets.length === 0 ? (
                        <p className="col-span-2 text-sm text-muted-foreground sm:col-span-3 lg:col-span-2">
                          No creations yet. Generate images first.
                        </p>
                      ) : (
                        assets
                          .filter((a) =>
                            (a.name || a.id)
                              .toLowerCase()
                              .includes(assetQuery.toLowerCase()),
                          )
                          .map((a) => (
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
              </TabsContent>

              <TabsContent value="pages" className="mt-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label>Pages</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addPage}
                      className="flex-1 sm:flex-none"
                    >
                      <Icons.add className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removePage}
                      className="flex-1 sm:flex-none"
                    >
                      <Icons.trash className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </div>
                <ScrollArea className="mt-2 h-[300px] pr-2 sm:h-[400px] lg:h-[520px]">
                  <div className="space-y-1">
                    {book.pages.map((p, idx) => (
                      <Button
                        key={p.id}
                        variant={
                          p.id === selectedPageId ? "secondary" : "ghost"
                        }
                        className="w-full justify-start text-left text-sm"
                        onClick={() => {
                          setSelectedPageId(p.id);
                          flipToIndex(idx);
                        }}
                      >
                        <span className="hidden sm:inline">Page {idx + 1}</span>
                        <span className="sm:hidden">{idx + 1}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Center area */}
        <div className="order-1 flex flex-col gap-3 lg:order-2">
          {/* Top toolbar */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-2">
              <Input
                className="w-full sm:w-[240px]"
                value={book.title}
                onChange={(e) => setBook({ ...book, title: e.target.value })}
                placeholder="Book title"
              />
              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 lg:block"
              />
              <TooltipProvider>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
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
                          variant="outline"
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
                  </div>

                  <Separator
                    orientation="vertical"
                    className="mx-1 hidden h-6 lg:block"
                  />

                  <div className="flex flex-wrap items-center gap-2">
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
                      <PopoverContent className="w-[280px] sm:w-[360px]">
                        <div className="space-y-2">
                          <Input
                            placeholder="Search assets..."
                            value={assetQuery}
                            onChange={(e) => setAssetQuery(e.target.value)}
                          />
                          <ScrollArea className="h-[200px] pr-2 sm:h-[280px]">
                            <TooltipProvider>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {assets
                                  .filter((a) =>
                                    (a.name || a.id)
                                      .toLowerCase()
                                      .includes(assetQuery.toLowerCase()),
                                  )
                                  .map((a) => (
                                    <AssetTile
                                      key={a.id}
                                      asset={a}
                                      onClick={() => addImage(a.id)}
                                      side="top"
                                    />
                                  ))}
                              </div>
                            </TooltipProvider>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="mx-1 hidden h-6 lg:block"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => bookRef.current?.flipPrev()}
                      className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                    >
                      <Icons.chevronLeft className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </Button>
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
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs">Zoom</Label>
                    <div className="w-24 sm:w-40">
                      <Slider
                        value={[Math.round(renderZoom * 100)]}
                        min={50}
                        max={120}
                        step={5}
                        onValueChange={([val]) => setZoom(val / 100)}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(renderZoom * 100)}%
                    </span>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="mx-1 hidden h-6 lg:block"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="default"
                      onClick={saveBook}
                      className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                    >
                      <Icons.check className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />{" "}
                      <span className="hidden sm:inline">
                        {bookId ? "Save" : "Save as New"}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPropertiesOpen(true)}
                      className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                    >
                      <Icons.settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Properties</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                        >
                          <Icons.ellipsis className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">More</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={loadLatest}>
                          <Icons.download className="mr-2 h-4 w-4" /> Load
                          latest
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPdf}>
                          <Icons.download className="mr-2 h-4 w-4" /> Export PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                        >
                          <Icons.settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Settings</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[90vw] max-w-md sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Document settings</DialogTitle>
                        </DialogHeader>
                        <div className="mt-2 grid gap-4">
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant={
                                  pageFormat === "A3" ? "secondary" : "outline"
                                }
                                onClick={() => setPageFormat("A3")}
                              >
                                A3
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  pageFormat === "A4" ? "secondary" : "outline"
                                }
                                onClick={() => setPageFormat("A4")}
                              >
                                A4
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  pageFormat === "A5" ? "secondary" : "outline"
                                }
                                onClick={() => setPageFormat("A5")}
                              >
                                A5
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Orientation</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant={
                                  pageOrientation === "portrait"
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => setPageOrientation("portrait")}
                              >
                                Portrait
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  pageOrientation === "landscape"
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => setPageOrientation("landscape")}
                              >
                                Landscape
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="work-padding">
                              Work area padding
                            </Label>
                            <div className="flex items-center gap-2">
                              <Switch
                                id="work-padding"
                                checked={workAreaPaddingEnabled}
                                onCheckedChange={setWorkAreaPaddingEnabled}
                              />
                              <span className="text-sm text-muted-foreground">
                                {workAreaPaddingEnabled
                                  ? "24px enabled"
                                  : "disabled"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Canvas */}
          <div
            ref={viewportRef}
            className="flex justify-center overflow-hidden"
          >
            <div className="w-full max-w-full">
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
                  // Only sync selection if current selection is not visible
                  if (selectedPageId !== leftId && selectedPageId !== rightId) {
                    if (leftId) setSelectedPageId(leftId);
                    else if (rightId) setSelectedPageId(rightId);
                  }
                }}
                className="mx-auto shadow-xl"
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
                            const id = getElementIdFromEventTarget(e as any);
                            if (id) setSelectedElementId(id);
                            setSelectedPageId(page.id);
                            setLastContextPageId(page.id);
                            const pos = getPagePosFromEvent(page.id, e as any);
                            if (pos) setLastContextPos(pos);
                          }}
                        >
                          {page.id === selectedPageId ? (
                            <div
                              className="pointer-events-none absolute inset-0 rounded-md border-2 border-dashed border-red-500"
                              style={{
                                top: workAreaPadding,
                                left: workAreaPadding,
                                right: workAreaPadding,
                                bottom: workAreaPadding,
                              }}
                              data-ignore-export="true"
                            />
                          ) : null}
                          {/* Page number badge */}
                          <div
                            className={`pointer-events-none absolute bottom-1 ${
                              (pageIndex + 1) % 2 === 0 ? "left-2" : "right-2"
                            } rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm`}
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
                            {pageIndex + 1}
                          </div>
                          {page.elements.map((el) => {
                            if (el.type === "image") {
                              const asset = assets.find(
                                (a) => a.id === el.data.assetId,
                              );
                              if (!asset) return null;
                              const rotation =
                                ((el.data as EditorImage).rotation || 0) % 360;
                              const isQuarterTurn =
                                Math.abs(rotation) % 180 !== 0;
                              const rotatedWidth = isQuarterTurn
                                ? el.data.height
                                : el.data.width;
                              const rotatedHeight = isQuarterTurn
                                ? el.data.width
                                : el.data.height;
                              const containerW = Math.floor(
                                rotatedWidth * renderZoom,
                              );
                              const containerH = Math.floor(
                                rotatedHeight * renderZoom,
                              );
                              const dragBounds = getDragBounds(
                                rotatedWidth,
                                rotatedHeight,
                              );
                              const leftPx = Math.floor(
                                workAreaPadding + el.data.x * renderZoom,
                              );
                              const topPx = Math.floor(
                                workAreaPadding + el.data.y * renderZoom,
                              );
                              return (
                                <Draggable
                                  key={el.data.id}
                                  position={{ x: leftPx, y: topPx }}
                                  bounds={dragBounds}
                                  cancel=".object-pos-handle"
                                  onStart={() => {
                                    pushHistory();
                                    setSelectedPageId(page.id);
                                    setSelectedElementId(el.data.id);
                                  }}
                                  onDrag={(e, data) => {
                                    const xPage =
                                      (data.x - workAreaPadding) / renderZoom;
                                    const yPage =
                                      (data.y - workAreaPadding) / renderZoom;
                                    updateElementPosition(
                                      el.data.id,
                                      xPage,
                                      yPage,
                                    );
                                  }}
                                >
                                  <div
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      setSelectedPageId(page.id);
                                      setSelectedElementId(el.data.id);
                                    }}
                                    style={{
                                      position: "absolute",
                                      left: 0,
                                      top: 0,
                                      width: containerW,
                                      height: containerH,
                                      cursor: "move",
                                    }}
                                    className={`group overflow-hidden rounded bg-white ${
                                      selectedElementId === el.data.id
                                        ? "ring-2 ring-primary"
                                        : ""
                                    }`}
                                  >
                                    <div className="relative h-full w-full">
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: "50%",
                                          top: "50%",
                                          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                          width: isQuarterTurn
                                            ? containerH
                                            : containerW,
                                          height: isQuarterTurn
                                            ? containerW
                                            : containerH,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <img
                                          src={asset.url}
                                          alt={asset.name || "image"}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit:
                                              (el.data as EditorImage).fit ===
                                              "cover"
                                                ? "cover"
                                                : "contain",
                                            objectPosition:
                                              (el.data as EditorImage).fit ===
                                              "cover"
                                                ? `${(el.data as EditorImage).objectPosX ?? 50}% ${(el.data as EditorImage).objectPosY ?? 50}%`
                                                : undefined,
                                          }}
                                        />
                                        {(el.data as EditorImage).fit ===
                                          "cover" &&
                                        selectedElementId === el.data.id ? (
                                          <div
                                            style={{
                                              position: "absolute",
                                              inset: 0,
                                            }}
                                          >
                                            <Draggable
                                              position={{
                                                x: Math.round(
                                                  (((el.data as EditorImage)
                                                    .objectPosX ?? 50) /
                                                    100) *
                                                    (isQuarterTurn
                                                      ? containerH
                                                      : containerW),
                                                ),
                                                y: Math.round(
                                                  (((el.data as EditorImage)
                                                    .objectPosY ?? 50) /
                                                    100) *
                                                    (isQuarterTurn
                                                      ? containerW
                                                      : containerH),
                                                ),
                                              }}
                                              bounds={{
                                                left: 0,
                                                top: 0,
                                                right: isQuarterTurn
                                                  ? containerH
                                                  : containerW,
                                                bottom: isQuarterTurn
                                                  ? containerW
                                                  : containerH,
                                              }}
                                              onStart={() => pushHistory()}
                                              onDrag={(e, data) => {
                                                const boxW = isQuarterTurn
                                                  ? containerH
                                                  : containerW;
                                                const boxH = isQuarterTurn
                                                  ? containerW
                                                  : containerH;
                                                const pctX = Math.max(
                                                  0,
                                                  Math.min(
                                                    100,
                                                    (data.x /
                                                      Math.max(1, boxW)) *
                                                      100,
                                                  ),
                                                );
                                                const pctY = Math.max(
                                                  0,
                                                  Math.min(
                                                    100,
                                                    (data.y /
                                                      Math.max(1, boxH)) *
                                                      100,
                                                  ),
                                                );
                                                updateElementData(el.data.id, {
                                                  objectPosX: pctX,
                                                  objectPosY: pctY,
                                                } as Partial<EditorImage>);
                                              }}
                                            >
                                              <div
                                                title="Drag to position image"
                                                className="object-pos-handle absolute -left-2 -top-2 h-4 w-4 cursor-grab rounded-full border border-white bg-black/60"
                                                onMouseDown={(e) =>
                                                  e.stopPropagation()
                                                }
                                                onTouchStart={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            </Draggable>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        removeElement(el.data.id);
                                      }}
                                      variant="secondary"
                                      size="icon"
                                      className="absolute right-1 top-1 hidden h-6 w-6 p-0 group-hover:flex"
                                    >
                                      <Icons.close className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </Draggable>
                              );
                            }
                            if (el.type === "text") {
                              return (
                                <TextBox
                                  key={el.data.id}
                                  zoom={renderZoom}
                                  workAreaPadding={workAreaPadding}
                                  dragBounds={getDragBounds(
                                    el.data.width,
                                    el.data.height,
                                  )}
                                  element={el.data as EditorTextBox}
                                  isSelected={selectedElementId === el.data.id}
                                  isEditing={editingElementId === el.data.id}
                                  onFocusEdit={() =>
                                    setEditingElementId(el.data.id)
                                  }
                                  onBlurEdit={() => setEditingElementId(null)}
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
                                  }}
                                  onDragTo={(x, y) =>
                                    updateElementPosition(el.data.id, x, y)
                                  }
                                  onChangeText={(text) =>
                                    updateElementData(el.data.id, { text })
                                  }
                                  onRemove={() => removeElement(el.data.id)}
                                />
                              );
                            }
                            return null;
                          })}
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
                            pasteClipboard(
                              lastContextPos ?? undefined,
                              page.id,
                            );
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
        </div>
      </div>
      {/* Bottom sheet for properties */}
      <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[50vh] w-full overflow-y-auto sm:max-h-[40vh]"
        >
          <SheetHeader>
            <SheetTitle>Properties</SheetTitle>
          </SheetHeader>
          {selectedElement ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {selectedElement.type === "text" ? (
                <div className="col-span-1 sm:col-span-2 lg:col-span-12">
                  <TextProperties
                    selectedTextBox={selectedElement.data as EditorTextBox}
                    onUpdate={(partial) =>
                      updateElementData(selectedElement.data.id, partial)
                    }
                  />
                  {/* Old inline text controls hidden: keep for quick fallback */}
                  {false && <Label htmlFor="ctrl-text">Text</Label>}
                  {false && (
                    <Input
                      id="ctrl-text"
                      value={(selectedElement.data as EditorTextBox).text}
                      onChange={(e) =>
                        updateElementData(selectedElement.data.id, {
                          text: e.target.value,
                        })
                      }
                    />
                  )}
                  {false && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                      {/* Font family and size */}
                      <div className="sm:col-span-1 lg:col-span-6">
                        <Label>Font family</Label>
                        <Select
                          value={
                            (selectedElement.data as EditorTextBox)
                              .fontFamily || "Inter"
                          }
                          onValueChange={(v) =>
                            updateElementData(selectedElement.data.id, {
                              fontFamily: v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose font" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">Inter</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Times New Roman">
                              Times New Roman
                            </SelectItem>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Courier New">
                              Courier New
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-1 lg:col-span-6">
                        <Label>Font size</Label>
                        <div className="px-1">
                          <Slider
                            value={[
                              (selectedElement.data as EditorTextBox)
                                .fontSize || 18,
                            ]}
                            min={8}
                            max={72}
                            step={1}
                            onValueChange={([v]) =>
                              updateElementData(selectedElement.data.id, {
                                fontSize: v,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Font color */}
                      <div className="sm:col-span-1 lg:col-span-6">
                        <Label>Font color</Label>
                        <div className="flex items-center gap-2 px-1">
                          <input
                            type="color"
                            value={
                              (selectedElement.data as EditorTextBox)
                                .fontColor || "#111827"
                            }
                            onChange={(e) =>
                              updateElementData(selectedElement.data.id, {
                                fontColor: e.target.value,
                              })
                            }
                            className="h-8 w-12 cursor-pointer rounded border bg-transparent"
                            aria-label="Font color"
                          />
                          <span className="text-xs text-muted-foreground">
                            {(selectedElement.data as EditorTextBox)
                              .fontColor || "#111827"}
                          </span>
                        </div>
                      </div>

                      {/* Style buttons */}
                      <div className="sm:col-span-2 lg:col-span-12">
                        <Label>Style</Label>
                        <div className="flex flex-wrap gap-2 py-1">
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox).bold
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                bold: !(
                                  (selectedElement.data as EditorTextBox)
                                    .bold || false
                                ),
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            B
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox).italic
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                italic: !(
                                  (selectedElement.data as EditorTextBox)
                                    .italic || false
                                ),
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            I
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox).underline
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                underline: !(
                                  (selectedElement.data as EditorTextBox)
                                    .underline || false
                                ),
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            U
                          </Button>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div className="sm:col-span-2 lg:col-span-12">
                        <Label>Alignment</Label>
                        <div className="flex flex-wrap gap-2 py-1">
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .textAlign === "left"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                textAlign: "left",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Left
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .textAlign === "center"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                textAlign: "center",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Center
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .textAlign === "right"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                textAlign: "right",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Right
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .textAlign === "justify"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                textAlign: "justify",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Justify
                          </Button>
                        </div>
                      </div>

                      {/* Vertical alignment */}
                      <div className="sm:col-span-2 lg:col-span-12">
                        <Label>Vertical alignment</Label>
                        <div className="flex flex-wrap gap-2 py-1">
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .verticalAlign === "top"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                verticalAlign: "top",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Top
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .verticalAlign === "middle"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                verticalAlign: "middle",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Middle
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              (selectedElement.data as EditorTextBox)
                                .verticalAlign === "bottom"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              updateElementData(selectedElement.data.id, {
                                verticalAlign: "bottom",
                              })
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Bottom
                          </Button>
                        </div>
                      </div>

                      {/* Background & Style Section */}
                      <div className="sm:col-span-2 lg:col-span-12">
                        <Label className="text-base font-medium">
                          Background & Style
                        </Label>
                        <div className="mt-3 space-y-4">
                          {/* Background Color Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Background Color
                            </Label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { name: "None", value: "transparent" },
                                  { name: "White", value: "#ffffff" },
                                  { name: "Light Gray", value: "#f3f4f6" },
                                  { name: "Yellow", value: "#fef3c7" },
                                  { name: "Blue", value: "#dbeafe" },
                                  { name: "Green", value: "#d1fae5" },
                                  { name: "Pink", value: "#fce7f3" },
                                  { name: "Purple", value: "#e9d5ff" },
                                ].map((bg) => (
                                  <Button
                                    key={bg.value}
                                    size="sm"
                                    variant={
                                      (selectedElement.data as EditorTextBox)
                                        .backgroundColor === bg.value
                                        ? "secondary"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          backgroundColor: bg.value,
                                        },
                                      )
                                    }
                                    className="h-9 px-3 text-xs"
                                  >
                                    <div
                                      className="mr-2 h-3 w-3 rounded-sm border"
                                      style={{
                                        backgroundColor:
                                          bg.value === "transparent"
                                            ? "#ffffff"
                                            : bg.value,
                                        border:
                                          bg.value === "transparent"
                                            ? "1px solid #d1d5db"
                                            : "1px solid rgba(0,0,0,0.1)",
                                      }}
                                    />
                                    {bg.name}
                                  </Button>
                                ))}
                              </div>
                              {/* Custom Background Color Picker */}
                              <div className="flex items-center gap-2 rounded-md border p-2">
                                <Label className="text-xs font-medium">
                                  Custom Color:
                                </Label>
                                <input
                                  type="color"
                                  value={
                                    (selectedElement.data as EditorTextBox)
                                      .backgroundColor === "transparent"
                                      ? "#ffffff"
                                      : (selectedElement.data as EditorTextBox)
                                          .backgroundColor || "#ffffff"
                                  }
                                  onChange={(e) =>
                                    updateElementData(selectedElement.data.id, {
                                      backgroundColor: e.target.value,
                                    })
                                  }
                                  className="h-8 w-16 cursor-pointer rounded border-0"
                                  title="Pick custom background color"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {(selectedElement.data as EditorTextBox)
                                    .backgroundColor === "transparent"
                                    ? "Transparent"
                                    : (selectedElement.data as EditorTextBox)
                                        .backgroundColor || "#ffffff"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Border Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Border
                            </Label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  {
                                    name: "None",
                                    width: 0,
                                    color: "transparent",
                                  },
                                  { name: "Thin", width: 1, color: "#d1d5db" },
                                  {
                                    name: "Medium",
                                    width: 2,
                                    color: "#d1d5db",
                                  },
                                  { name: "Thick", width: 3, color: "#6b7280" },
                                  { name: "Black", width: 2, color: "#000000" },
                                  { name: "Blue", width: 2, color: "#3b82f6" },
                                ].map((border) => (
                                  <Button
                                    key={`${border.width}-${border.color}`}
                                    size="sm"
                                    variant={
                                      (selectedElement.data as EditorTextBox)
                                        .borderWidth === border.width &&
                                      (selectedElement.data as EditorTextBox)
                                        .borderColor === border.color
                                        ? "secondary"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          borderWidth: border.width,
                                          borderColor: border.color,
                                        },
                                      )
                                    }
                                    className="h-9 px-3 text-xs"
                                  >
                                    {border.name}
                                  </Button>
                                ))}
                              </div>
                              {/* Custom Border Controls */}
                              <div className="flex flex-col gap-3 rounded-md border p-2 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs font-medium">
                                    Width:
                                  </Label>
                                  <Select
                                    value={String(
                                      (selectedElement.data as EditorTextBox)
                                        .borderWidth || 0,
                                    )}
                                    onValueChange={(value) =>
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          borderWidth: parseInt(value),
                                        },
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">None</SelectItem>
                                      <SelectItem value="1">1px</SelectItem>
                                      <SelectItem value="2">2px</SelectItem>
                                      <SelectItem value="3">3px</SelectItem>
                                      <SelectItem value="4">4px</SelectItem>
                                      <SelectItem value="5">5px</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs font-medium">
                                    Color:
                                  </Label>
                                  <input
                                    type="color"
                                    value={
                                      (selectedElement.data as EditorTextBox)
                                        .borderColor === "transparent"
                                        ? "#d1d5db"
                                        : (
                                            selectedElement.data as EditorTextBox
                                          ).borderColor || "#d1d5db"
                                    }
                                    onChange={(e) =>
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          borderColor: e.target.value,
                                          borderWidth:
                                            (
                                              selectedElement.data as EditorTextBox
                                            ).borderWidth || 2, // Auto-set width if none
                                        },
                                      )
                                    }
                                    className="h-8 w-16 cursor-pointer rounded border-0"
                                    title="Pick custom border color"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {(selectedElement.data as EditorTextBox)
                                      .borderColor === "transparent"
                                      ? "None"
                                      : (selectedElement.data as EditorTextBox)
                                          .borderColor || "#d1d5db"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Shadow Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Shadow
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { name: "None", value: "none" },
                                {
                                  name: "Small",
                                  value: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                },
                                {
                                  name: "Medium",
                                  value: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                },
                                {
                                  name: "Large",
                                  value: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                },
                                {
                                  name: "Glow",
                                  value: "0 0 15px rgba(59, 130, 246, 0.3)",
                                },
                              ].map((shadow) => (
                                <Button
                                  key={shadow.value}
                                  size="sm"
                                  variant={
                                    (selectedElement.data as EditorTextBox)
                                      .boxShadow === shadow.value
                                      ? "secondary"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateElementData(selectedElement.data.id, {
                                      boxShadow: shadow.value,
                                    })
                                  }
                                  className="h-9 px-3 text-xs"
                                >
                                  {shadow.name}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Corner Radius Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Corner Style
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { name: "Square", value: 0, preview: "⬜" },
                                { name: "Rounded", value: 8, preview: "▢" },
                                { name: "Very Round", value: 16, preview: "◯" },
                                { name: "Pill", value: 999, preview: "⬭" },
                              ].map((radius) => (
                                <Button
                                  key={radius.value}
                                  size="sm"
                                  variant={
                                    (selectedElement.data as EditorTextBox)
                                      .borderRadius === radius.value
                                      ? "secondary"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateElementData(selectedElement.data.id, {
                                      borderRadius: radius.value,
                                    })
                                  }
                                  className="h-9 px-3 text-xs"
                                >
                                  <span className="mr-1">{radius.preview}</span>
                                  {radius.name}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Padding Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Inner Spacing
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                {
                                  name: "None",
                                  value: 0,
                                  description: "No space",
                                },
                                { name: "Small", value: 4, description: "4px" },
                                {
                                  name: "Medium",
                                  value: 8,
                                  description: "8px",
                                },
                                {
                                  name: "Large",
                                  value: 16,
                                  description: "16px",
                                },
                              ].map((pad) => (
                                <Button
                                  key={pad.value}
                                  size="sm"
                                  variant={
                                    (selectedElement.data as EditorTextBox)
                                      .padding === pad.value
                                      ? "secondary"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateElementData(selectedElement.data.id, {
                                      padding: pad.value,
                                    })
                                  }
                                  className="flex h-9 flex-col items-center px-3 text-xs"
                                  title={pad.description}
                                >
                                  <span>{pad.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {pad.description}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Chat Bubble Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              Chat Bubble
                            </Label>
                            <div className="space-y-3">
                              {/* Enable/Disable Chat Bubble */}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={
                                    (selectedElement.data as EditorTextBox)
                                      .chatBubble
                                      ? "secondary"
                                      : "outline"
                                  }
                                  onClick={() => {
                                    if (
                                      (selectedElement.data as EditorTextBox)
                                        .chatBubble
                                    ) {
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          chatBubble: undefined,
                                        },
                                      );
                                    } else {
                                      updateElementData(
                                        selectedElement.data.id,
                                        {
                                          chatBubble: {
                                            trianglePosition: "bottom",
                                            triangleOffset: 50,
                                            triangleSize: 12,
                                          },
                                        },
                                      );
                                    }
                                  }}
                                  className="h-8 px-3 text-xs"
                                >
                                  {(selectedElement.data as EditorTextBox)
                                    .chatBubble
                                    ? "Remove Bubble"
                                    : "Add Bubble"}
                                </Button>
                              </div>

                              {/* Chat Bubble Controls */}
                              {(selectedElement.data as EditorTextBox)
                                .chatBubble && (
                                <>
                                  {/* Triangle Position */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium">
                                      Triangle Position
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {[
                                        { value: "top", label: "Top" },
                                        { value: "right", label: "Right" },
                                        { value: "bottom", label: "Bottom" },
                                        { value: "left", label: "Left" },
                                      ].map((pos) => (
                                        <Button
                                          key={pos.value}
                                          size="sm"
                                          variant={
                                            (
                                              selectedElement.data as EditorTextBox
                                            ).chatBubble?.trianglePosition ===
                                            pos.value
                                              ? "secondary"
                                              : "outline"
                                          }
                                          onClick={() =>
                                            updateElementData(
                                              selectedElement.data.id,
                                              {
                                                chatBubble: {
                                                  ...(
                                                    selectedElement.data as EditorTextBox
                                                  ).chatBubble!,
                                                  trianglePosition:
                                                    pos.value as any,
                                                },
                                              },
                                            )
                                          }
                                          className="h-7 px-2 text-xs"
                                        >
                                          {pos.label}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Triangle Offset */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium">
                                      Triangle Position:{" "}
                                      {Math.round(
                                        (selectedElement.data as EditorTextBox)
                                          .chatBubble?.triangleOffset || 50,
                                      )}
                                      %
                                    </Label>
                                    <Slider
                                      value={[
                                        (selectedElement.data as EditorTextBox)
                                          .chatBubble?.triangleOffset || 50,
                                      ]}
                                      min={0}
                                      max={100}
                                      step={1}
                                      onValueChange={([val]) =>
                                        updateElementData(
                                          selectedElement.data.id,
                                          {
                                            chatBubble: {
                                              ...(
                                                selectedElement.data as EditorTextBox
                                              ).chatBubble!,
                                              triangleOffset: val,
                                            },
                                          },
                                        )
                                      }
                                    />
                                  </div>

                                  {/* Triangle Size */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium">
                                      Triangle Size:{" "}
                                      {(selectedElement.data as EditorTextBox)
                                        .chatBubble?.triangleSize || 12}
                                      px
                                    </Label>
                                    <Slider
                                      value={[
                                        (selectedElement.data as EditorTextBox)
                                          .chatBubble?.triangleSize || 12,
                                      ]}
                                      min={6}
                                      max={24}
                                      step={1}
                                      onValueChange={([val]) =>
                                        updateElementData(
                                          selectedElement.data.id,
                                          {
                                            chatBubble: {
                                              ...(
                                                selectedElement.data as EditorTextBox
                                              ).chatBubble!,
                                              triangleSize: val,
                                            },
                                          },
                                        )
                                      }
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Position and Size Controls */}
              <div className="sm:col-span-1 lg:col-span-6">
                <Label>Position X</Label>
                <div className="px-1">
                  {(() => {
                    const isImg = selectedElement.type === "image";
                    const rot = isImg
                      ? ((selectedElement.data as any).rotation || 0) % 360
                      : 0;
                    const quarter = Math.abs(rot) % 180 !== 0;
                    const effWidth =
                      isImg && quarter
                        ? selectedElement.data.height
                        : selectedElement.data.width;
                    const maxX = Math.max(0, contentPageWidth - effWidth);
                    const val = Math.max(
                      -workAreaPadding / zoom,
                      Math.min(selectedElement.data.x, maxX),
                    );
                    return (
                      <Slider
                        value={[val]}
                        min={-workAreaPadding / zoom}
                        max={maxX}
                        step={1}
                        onValueChange={([v]) =>
                          updateElementData(selectedElement.data.id, {
                            x: Math.min(Math.max(v, 0), maxX),
                          })
                        }
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="sm:col-span-1 lg:col-span-6">
                <Label>Position Y</Label>
                <div className="px-1">
                  {(() => {
                    const isImg = selectedElement.type === "image";
                    const rot = isImg
                      ? ((selectedElement.data as any).rotation || 0) % 360
                      : 0;
                    const quarter = Math.abs(rot) % 180 !== 0;
                    const effHeight =
                      isImg && quarter
                        ? selectedElement.data.width
                        : selectedElement.data.height;
                    const maxY = Math.max(0, contentPageHeight - effHeight);
                    const val = Math.max(
                      -workAreaPadding / zoom,
                      Math.min(selectedElement.data.y, maxY),
                    );
                    return (
                      <Slider
                        value={[val]}
                        min={-workAreaPadding / zoom}
                        max={maxY}
                        step={1}
                        onValueChange={([v]) =>
                          updateElementData(selectedElement.data.id, {
                            y: Math.min(Math.max(v, 0), maxY),
                          })
                        }
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="sm:col-span-1 lg:col-span-6">
                <Label>Width</Label>
                <div className="px-1">
                  <Slider
                    value={[
                      Math.min(selectedElement.data.width, contentPageWidth),
                    ]}
                    max={contentPageWidth}
                    min={20}
                    step={1}
                    onValueChange={([val]) =>
                      updateElementData(selectedElement.data.id, {
                        width: Math.min(
                          Math.max(val, 20),
                          contentPageWidth -
                            Math.max(selectedElement.data.x, 0),
                        ),
                      })
                    }
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedElement.type === "image") {
                          const rotation =
                            ((selectedElement.data as EditorImage).rotation ||
                              0) % 360;
                          const quarter = Math.abs(rotation) % 180 !== 0;
                          if (quarter) {
                            updateElementData(selectedElement.data.id, {
                              // For quarter turn, rotated width equals height
                              height: contentPageWidth,
                              // Include width to allow clamping to contentPageHeight
                              width: selectedElement.data.width,
                              x: 0,
                            } as Partial<EditorImage>);
                            return;
                          }
                        }
                        updateElementData(selectedElement.data.id, {
                          // Non-quarter: rotated width equals width
                          width: contentPageWidth,
                          // Include height to allow clamping to contentPageHeight
                          height: selectedElement.data.height,
                          x: 0,
                        });
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      Full width
                    </Button>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-1 lg:col-span-6">
                <Label>Height</Label>
                <div className="px-1">
                  <Slider
                    value={[
                      Math.min(selectedElement.data.height, contentPageHeight),
                    ]}
                    max={contentPageHeight}
                    min={20}
                    step={1}
                    onValueChange={([val]) =>
                      updateElementData(selectedElement.data.id, {
                        height: Math.min(
                          Math.max(val, 20),
                          contentPageHeight -
                            Math.max(selectedElement.data.y, 0),
                        ),
                      })
                    }
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedElement.type === "image") {
                          const rotation =
                            ((selectedElement.data as EditorImage).rotation ||
                              0) % 360;
                          const quarter = Math.abs(rotation) % 180 !== 0;
                          if (quarter) {
                            updateElementData(selectedElement.data.id, {
                              // For quarter turn, rotated height equals width
                              width: contentPageHeight,
                              // Include height to allow clamping to contentPageWidth
                              height: selectedElement.data.height,
                              y: 0,
                            } as Partial<EditorImage>);
                            return;
                          }
                        }
                        updateElementData(selectedElement.data.id, {
                          // Non-quarter: rotated height equals height
                          height: contentPageHeight,
                          // Include width to allow clamping to contentPageWidth
                          width: selectedElement.data.width,
                          y: 0,
                        });
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      Full height
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image-specific controls */}
              {selectedElement.type === "image" ? (
                <div className="sm:col-span-2 lg:col-span-6">
                  <div className="space-y-1">
                    <Label>Image fit</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={
                          (selectedElement.data as EditorImage).fit ===
                          "contain"
                            ? "secondary"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          updateElementData(selectedElement.data.id, {
                            fit: "contain",
                          } as Partial<EditorImage>)
                        }
                        className="h-8 px-2 text-xs"
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
                        className="h-8 px-2 text-xs"
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
                          // swap width/height when rotating 90/270
                          const willQuarterTurn = Math.abs(nextRot % 180) !== 0;
                          const newWidth = willQuarterTurn
                            ? Math.min(
                                selectedElement.data.height,
                                contentPageWidth,
                              )
                            : Math.min(
                                selectedElement.data.width,
                                contentPageWidth,
                              );
                          const newHeight = willQuarterTurn
                            ? Math.min(
                                selectedElement.data.width,
                                contentPageHeight,
                              )
                            : Math.min(
                                selectedElement.data.height,
                                contentPageHeight,
                              );
                          // Clamp position so rotated box stays inside
                          const maxX = Math.max(0, contentPageWidth - newWidth);
                          const maxY = Math.max(
                            0,
                            contentPageHeight - newHeight,
                          );
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
                        className="h-8 px-2 text-xs"
                      >
                        Rotate 90°
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-12">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={duplicateSelected}
                      className="h-8 px-2 text-xs"
                    >
                      <Icons.copy className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={bringToFront}
                      className="h-8 px-2 text-xs"
                    >
                      <Icons.arrowUpRight className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Bring to front</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sendToBack}
                      className="h-8 px-2 text-xs"
                    >
                      <Icons.chevronRight className="mr-1 h-3 w-3 rotate-180 sm:mr-2 sm:h-4 sm:w-4" />{" "}
                      <span className="hidden sm:inline">Send to back</span>
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      selectedElement && removeElement(selectedElement.data.id)
                    }
                    className="h-8 px-3 text-xs"
                  >
                    <Icons.trash className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Delete selected</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Select an element to edit its properties
            </p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
