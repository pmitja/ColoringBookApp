"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
// Custom lightweight flip viewer
import Draggable from "react-draggable";
import { toast } from "sonner";

import useLocalStorage from "@/hooks/use-local-storage";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";

import { exportBookAsPdf } from "./pdf-export";
import SimpleFlipBook, { SimpleFlipBookHandle } from "./simple-flip-book";
import TextBox from "./text-box";
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

  React.useEffect(() => {
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(420);
  const [hasMeasured, setHasMeasured] = useState<boolean>(false);
  const [zoom, setZoom] = useLocalStorage<number>("book-editor:zoom", 1.0);

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

  const { pageWidth, pageHeight } = useMemo(() => {
    const MM: Record<"A3" | "A4" | "A5", { w: number; h: number }> = {
      A3: { w: 297, h: 420 },
      A4: { w: 210, h: 297 },
      A5: { w: 148, h: 210 },
    };
    const base = MM[pageFormat];
    const mm =
      pageOrientation === "landscape" ? { w: base.h, h: base.w } : base;
    // Scale width relative to A3 so formats differ in size (A4<A3)
    const BASE_W = MM.A3.w; // 297mm (portrait width baseline)
    const baseWidth = Math.max(280, Math.min(containerWidth, 1200));
    const width = baseWidth * (mm.w / BASE_W);
    const height = width * (mm.h / mm.w);
    return { pageWidth: Math.round(width), pageHeight: Math.round(height) };
  }, [pageFormat, pageOrientation, containerWidth]);

  React.useEffect(() => {
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

  const displayWidth = useMemo(
    () => Math.round(pageWidth * zoom),
    [pageWidth, zoom],
  );
  const displayHeight = useMemo(
    () => Math.round(pageHeight * zoom),
    [pageHeight, zoom],
  );

  const workAreaPadding = useMemo(
    () => (workAreaPaddingEnabled ? 24 : 0),
    [workAreaPaddingEnabled],
  );

  // Work area sizes in logical page units (independent of zoom)
  // Convert fixed pixel padding into page units based on zoom
  const padUnits = useMemo(
    () => workAreaPadding / Math.max(zoom, 0.0001),
    [workAreaPadding, zoom],
  );
  const contentPageWidth = useMemo(
    () => Math.max(0, pageWidth - 2 * padUnits),
    [pageWidth, padUnits],
  );
  const contentPageHeight = useMemo(
    () => Math.max(0, pageHeight - 2 * padUnits),
    [pageHeight, padUnits],
  );

  const exportToPdf = useCallback(async () => {
    try {
      toast.info("Generating PDF...");
      await exportBookAsPdf({
        book,
        assets,
        pageFormat,
        orientation: pageOrientation,
        contentPageWidth,
        contentPageHeight,
        fileName: book.title,
      });
      toast.success("PDF saved");
    } catch (e) {
      toast.error("Failed to export PDF");
    }
  }, [
    assets,
    book,
    contentPageHeight,
    contentPageWidth,
    pageFormat,
    pageOrientation,
  ]);

  const addPage = useCallback(() => {
    setBook({
      ...book,
      pages: [...book.pages, { id: generateId("page"), elements: [] }],
    });
    setSelectedElementId(null);
  }, [book, setBook]);

  const removePage = useCallback(() => {
    if (book.pages.length <= 1) return;
    const idx = book.pages.findIndex((p) => p.id === selectedPage?.id);
    const newPages = book.pages.filter((p) => p.id !== selectedPage?.id);
    setBook({ ...book, pages: newPages });
    const nextIdx = Math.max(0, idx - 1);
    setSelectedPageId(newPages[nextIdx]?.id);
  }, [book, selectedPage, setBook]);

  const addTextBox = useCallback(() => {
    if (!selectedPage) return;
    const newText: EditorTextBox = {
      id: generateId("text"),
      x: 40,
      y: 40,
      width: 200,
      height: 80,
      text: "Double-click to edit text",
      fontSize: 18,
      bold: false,
      italic: false,
      underline: false,
      fontFamily: "Inter",
      textAlign: "left",
      verticalAlign: "top",
      fontColor: "#111827",
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
  }, [book, selectedPage, setBook]);

  const addImage = useCallback(
    (assetId: string) => {
      if (!selectedPage) return;
      const newImg: EditorImage = {
        id: generateId("img"),
        assetId,
        x: 30,
        y: 30,
        width: 260,
        height: 260,
        fit: "contain",
        rotation: 0,
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
    [book, selectedPage, setBook],
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

  // Re-clamp all elements when content area changes (zoom, padding, format)
  React.useEffect(() => {
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
    [book, selectedPage, setBook, selectedElementId],
  );

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
    <div className="grid gap-4">
      <div>
        <Card>
          <CardContent className="space-y-4 p-4">
            <Tabs defaultValue="settings">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
                <TabsTrigger value="pages">Pages</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="book-title">Book title</Label>
                  <Input
                    id="book-title"
                    value={book.title}
                    onChange={(e) =>
                      setBook({ ...book, title: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          "/api/books" + (bookId ? `/${bookId}` : ""),
                          {
                            method: bookId ? "PUT" : "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: book.title,
                              data: book,
                            }),
                          },
                        );
                        if (!res.ok) throw new Error("Failed to save");
                        const json = await res.json();
                        if (!bookId && json?.id) setBookId(json.id);
                        toast.success(bookId ? "Book saved" : "Book created");
                      } catch (e) {
                        toast.error("Failed to save book");
                      }
                    }}
                  >
                    {bookId ? "Save" : "Save as New"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/books", {
                          method: "GET",
                        });
                        if (!res.ok) throw new Error("Failed to load");
                        const list: Array<{ id: string; title: string }> =
                          await res.json();
                        if (list.length === 0) return;
                        const first = list[0];
                        const res2 = await fetch(`/api/books/${first.id}`);
                        if (!res2.ok) throw new Error("Failed to load book");
                        const full = await res2.json();
                        if (full?.data) {
                          setBook(full.data);
                          setBookId(first.id);
                        }
                      } catch {}
                    }}
                  >
                    Load Latest
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={addTextBox}>
                    <Icons.post className="mr-2 h-4 w-4" /> Add text box
                  </Button>
                  <Button variant="outline" onClick={addPage}>
                    <Icons.add className="mr-2 h-4 w-4" /> Add page
                  </Button>
                  <Button variant="outline" onClick={exportToPdf}>
                    <Icons.download className="mr-2 h-4 w-4" /> Export PDF
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-2">
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
                  </div>
                  <div className="mt-2 space-y-1">
                    <Label>Orientation</Label>
                    <div className="flex gap-2">
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

                  <div className="mt-2 space-y-1">
                    <Label htmlFor="work-padding">Work area padding</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="work-padding"
                        checked={workAreaPaddingEnabled}
                        onCheckedChange={setWorkAreaPaddingEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {workAreaPaddingEnabled ? "24px enabled" : "disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="assets">
                <ScrollArea className="h-[320px] pr-2">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {assets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No creations yet. Generate images first.
                      </p>
                    ) : (
                      assets.map((a) => (
                        <button
                          key={a.id}
                          className="group relative aspect-square overflow-hidden rounded border"
                          onClick={() => addImage(a.id)}
                          title={a.name || "Add image to page"}
                        >
                          <img
                            alt={a.name || "asset"}
                            src={a.url}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pages">
                <ScrollArea className="h-[320px] pr-2">
                  <div className="space-y-2">
                    {book.pages.map((p, idx) => (
                      <button
                        key={p.id}
                        className={`w-full rounded border p-2 text-left text-sm transition ${
                          p.id === selectedPageId
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedPageId(p.id);
                          flipToIndex(idx);
                        }}
                      >
                        Page {idx + 1}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <div className="pt-2">
                  <Button variant="destructive" onClick={removePage}>
                    <Icons.trash className="mr-2 h-4 w-4" /> Remove page
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div>
        <div ref={viewportRef} className="flex justify-center">
          <SimpleFlipBook
            ref={bookRef as any}
            width={displayWidth}
            height={displayHeight}
            disableFlipByClick
            mode="spread"
            cover
            onPageChange={(idx) => {
              const leftId = book.pages[idx]?.id;
              const rightId = book.pages[idx + 1]?.id;
              // Only sync selection if current selection is not visible
              if (selectedPageId !== leftId && selectedPageId !== rightId) {
                if (leftId) setSelectedPageId(leftId);
                else if (rightId) setSelectedPageId(rightId);
              }
            }}
            className="shadow-xl"
          >
            {book.pages.map((page, pageIndex) => (
              <div key={page.id} className="bg-white">
                <div
                  ref={stageRef}
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
                      const isQuarterTurn = Math.abs(rotation) % 180 !== 0;
                      const containerW = Math.floor(
                        (isQuarterTurn ? el.data.height : el.data.width) * zoom,
                      );
                      const containerH = Math.floor(
                        (isQuarterTurn ? el.data.width : el.data.height) * zoom,
                      );
                      const leftPx = Math.floor(
                        workAreaPadding + el.data.x * zoom,
                      );
                      const topPx = Math.floor(
                        workAreaPadding + el.data.y * zoom,
                      );
                      return (
                        <Draggable
                          key={el.data.id}
                          position={{ x: leftPx, y: topPx }}
                          bounds="parent"
                          onStart={() => {
                            setSelectedPageId(page.id);
                            setSelectedElementId(el.data.id);
                          }}
                          onDrag={(e, data) => {
                            const xPage = (data.x - workAreaPadding) / zoom;
                            const yPage = (data.y - workAreaPadding) / zoom;
                            updateElementPosition(el.data.id, xPage, yPage);
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
                                }}
                              >
                                <img
                                  src={asset.url}
                                  alt={asset.name || "image"}
                                  className={
                                    (el.data as EditorImage).fit === "cover"
                                      ? "h-full w-full object-cover"
                                      : "h-full w-full object-contain"
                                  }
                                />
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeElement(el.data.id);
                              }}
                              className="absolute right-1 top-1 hidden rounded bg-white/80 p-1 text-xs shadow group-hover:block"
                            >
                              ✕
                            </button>
                          </div>
                        </Draggable>
                      );
                    }
                    if (el.type === "text") {
                      return (
                        <TextBox
                          key={el.data.id}
                          zoom={zoom}
                          workAreaPadding={workAreaPadding}
                          element={el.data as EditorTextBox}
                          isSelected={selectedElementId === el.data.id}
                          isEditing={editingElementId === el.data.id}
                          onFocusEdit={() => setEditingElementId(el.data.id)}
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
              </div>
            ))}
          </SimpleFlipBook>
        </div>
        {/* Controls */}
        <div className="mt-4 grid gap-6">
          <div className="flex flex-wrap items-end justify-center gap-2">
            <div className="flex items-center gap-3">
              <Label className="mr-1">Preview</Label>
              <div className="w-48">
                <Slider
                  value={[Math.round(zoom * 100)]}
                  min={50}
                  max={120}
                  step={5}
                  onValueChange={([val]) => setZoom(val / 100)}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                bookRef.current?.flipPrev();
              }}
            >
              <Icons.chevronLeft className="mr-2 h-4 w-4" /> Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const current = bookRef.current?.getCurrentPage() ?? 0;
                let delta = 1;
                // Mirror SimpleFlipBook's spread + cover logic
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
            >
              Next <Icons.arrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mx-auto w-full rounded border bg-background p-3">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                {selectedElement ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-12">
                    {selectedElement.type === "text" ? (
                      <div className="col-span-2 sm:col-span-12">
                        <Label htmlFor="ctrl-text">Text</Label>
                        <Input
                          id="ctrl-text"
                          value={(selectedElement.data as EditorTextBox).text}
                          onChange={(e) =>
                            updateElementData(selectedElement.data.id, {
                              text: e.target.value,
                            })
                          }
                        />
                        <div className="mt-3 grid gap-3 sm:grid-cols-12">
                          <div className="sm:col-span-6">
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
                          <div className="sm:col-span-6">
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
                          <div className="sm:col-span-6">
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
                          <div className="sm:col-span-12">
                            <Label>Style</Label>
                            <div className="flex gap-2 py-1">
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
                              >
                                I
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  (selectedElement.data as EditorTextBox)
                                    .underline
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
                              >
                                U
                              </Button>
                            </div>
                          </div>
                          <div className="sm:col-span-12">
                            <Label>Alignment</Label>
                            <div className="flex gap-2 py-1">
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
                              >
                                Justify
                              </Button>
                            </div>
                          </div>
                          <div className="sm:col-span-12">
                            <Label>Vertical alignment</Label>
                            <div className="flex gap-2 py-1">
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
                              >
                                Bottom
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="sm:col-span-6">
                      <Label>Position X</Label>
                      <div className="px-1">
                        {(() => {
                          const isImg = selectedElement.type === "image";
                          const rot = isImg
                            ? ((selectedElement.data as any).rotation || 0) %
                              360
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
                    <div className="sm:col-span-6">
                      <Label>Position Y</Label>
                      <div className="px-1">
                        {(() => {
                          const isImg = selectedElement.type === "image";
                          const rot = isImg
                            ? ((selectedElement.data as any).rotation || 0) %
                              360
                            : 0;
                          const quarter = Math.abs(rot) % 180 !== 0;
                          const effHeight =
                            isImg && quarter
                              ? selectedElement.data.width
                              : selectedElement.data.height;
                          const maxY = Math.max(
                            0,
                            contentPageHeight - effHeight,
                          );
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
                    <div className="sm:col-span-6">
                      <Label>Width</Label>
                      <div className="px-1">
                        <Slider
                          value={[
                            Math.min(
                              selectedElement.data.width,
                              contentPageWidth,
                            ),
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
                                  ((selectedElement.data as EditorImage)
                                    .rotation || 0) % 360;
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
                          >
                            Full width
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="sm:col-span-6">
                      <Label>Height</Label>
                      <div className="px-1">
                        <Slider
                          value={[
                            Math.min(
                              selectedElement.data.height,
                              contentPageHeight,
                            ),
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
                                  ((selectedElement.data as EditorImage)
                                    .rotation || 0) % 360;
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
                          >
                            Full height
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="sm:col-span-6">
                      {selectedElement.type === "image" ? (
                        <div className="space-y-1">
                          <Label>Image fit</Label>
                          <div className="flex gap-2">
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
                            >
                              Contain
                            </Button>
                            <Button
                              variant={
                                (selectedElement.data as EditorImage).fit ===
                                "cover"
                                  ? "secondary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateElementData(selectedElement.data.id, {
                                  fit: "cover",
                                } as Partial<EditorImage>)
                              }
                            >
                              Cover
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentRot =
                                  (selectedElement.data as EditorImage)
                                    .rotation || 0;
                                const nextRot = (currentRot + 90) % 360;
                                // swap width/height when rotating 90/270
                                const willQuarterTurn =
                                  Math.abs(nextRot % 180) !== 0;
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
                                const maxX = Math.max(
                                  0,
                                  contentPageWidth - newWidth,
                                );
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
                            >
                              Rotate 90°
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-2 flex items-end justify-end">
                      <Button
                        variant="destructive"
                        onClick={() =>
                          selectedElement &&
                          removeElement(selectedElement.data.id)
                        }
                      >
                        <Icons.trash className="mr-2 h-4 w-4" /> Delete selected
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Select an element on the page to edit its properties here.
                  </p>
                )}
              </div>
              <div className="md:col-span-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
