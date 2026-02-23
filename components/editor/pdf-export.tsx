"use client";

import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export type PageFormat = "A3" | "A4" | "A5";
export type Orientation = "portrait" | "landscape";

interface ExportFromDomParams {
  elements: HTMLElement[];
  pageFormat: PageFormat;
  orientation: Orientation;
  fileName?: string;
  scale?: number;
}

interface ExportFromImagesParams {
  images: string[];
  pageFormat: PageFormat;
  orientation: Orientation;
  fileName?: string;
  compress?: boolean;
  imageQuality?: number;
  maxImageLongEdgePx?: number;
}

const DEFAULT_PDF_IMAGE_QUALITY = 0.9;
const DEFAULT_PDF_MAX_LONG_EDGE_PX = 2800;
const IMAGE_READY_TIMEOUT_MS = 2500;

async function waitForImageReady(
  img: HTMLImageElement,
  timeoutMs = IMAGE_READY_TIMEOUT_MS,
): Promise<void> {
  const isLoaded = () => img.complete && img.naturalWidth > 0;

  if (isLoaded()) {
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // decode() can reject for already-renderable images; ignore.
      }
    }
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      window.clearTimeout(timer);
      resolve();
    };
    const onLoad = () => void done();
    const onError = () => void done();
    const timer = window.setTimeout(done, timeoutMs);

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });

    // In case the image finished between checks and listener registration.
    if (isLoaded()) {
      void done();
    }
  });

  if (isLoaded() && typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      // Non-fatal for export capture.
    }
  }
}

async function waitForElementImagesReady(element: HTMLElement): Promise<void> {
  const imgs = Array.from(element.querySelectorAll("img"));
  if (imgs.length === 0) return;
  await Promise.all(imgs.map((img) => waitForImageReady(img)));
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for PDF export"));
    img.src = src;
  });
}

async function optimizeImageForPdf(
  sourceDataUrl: string,
  {
    quality = DEFAULT_PDF_IMAGE_QUALITY,
    maxLongEdgePx = DEFAULT_PDF_MAX_LONG_EDGE_PX,
  }: {
    quality?: number;
    maxLongEdgePx?: number;
  } = {},
): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const sourceW = img.naturalWidth || img.width;
  const sourceH = img.naturalHeight || img.height;

  if (!sourceW || !sourceH) {
    return sourceDataUrl;
  }

  const longestSide = Math.max(sourceW, sourceH);
  const scale =
    maxLongEdgePx > 0 && longestSide > maxLongEdgePx
      ? maxLongEdgePx / longestSide
      : 1;

  const targetW = Math.max(1, Math.round(sourceW * scale));
  const targetH = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return sourceDataUrl;
  }

  // JPEG removes transparency, so force a white page background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function captureElementAsPng(
  element: HTMLElement,
  scale = 2,
): Promise<string> {
  await waitForElementImagesReady(element);

  // Give layout a frame after late image decodes before snapshotting.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const canvas = await html2canvas(element, {
    scale,
    allowTaint: true,
    useCORS: true,
    ignoreElements: (node) => {
      return (
        node instanceof HTMLElement &&
        node.dataset.ignoreExport === "true"
      );
    },
    onclone: (doc) => {
      doc.querySelectorAll('[data-export-page-root="true"]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.style.border = "none";
        node.style.boxShadow = "none";
        node.style.borderRadius = "0";
      });
      doc.querySelectorAll('[data-export-clean-frame="true"]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.style.border = "none";
        node.style.boxShadow = "none";
      });
      doc.querySelectorAll("img").forEach((node) => {
        if (!(node instanceof HTMLImageElement)) return;
        node.loading = "eager";
        node.decoding = "sync";
      });
    },
  });

  return canvas.toDataURL("image/png");
}

export async function exportImagesAsPdf({
  images,
  pageFormat,
  orientation,
  fileName,
  compress = true,
  imageQuality = DEFAULT_PDF_IMAGE_QUALITY,
  maxImageLongEdgePx = DEFAULT_PDF_MAX_LONG_EDGE_PX,
}: ExportFromImagesParams) {
  if (!images || images.length === 0) return;

  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: pageFormat.toLowerCase() as any,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    const data = images[i];
    if (!data) continue;
    if (i > 0) doc.addPage();

    let pdfImageData = data;
    let pdfImageFormat: "JPEG" | "PNG" = "PNG";

    if (compress) {
      try {
        pdfImageData = await optimizeImageForPdf(data, {
          quality: imageQuality,
          maxLongEdgePx: maxImageLongEdgePx,
        });
        pdfImageFormat = "JPEG";
      } catch (error) {
        console.warn("Failed to compress PDF page image, using original", error);
      }
    }

    doc.addImage(
      pdfImageData,
      pdfImageFormat,
      0,
      0,
      pageW,
      pageH,
      undefined,
      compress && pdfImageFormat === "JPEG" ? "MEDIUM" : "NONE",
    );
  }

  const safeName = (fileName || "book").replace(/\s+/g, "-");
  doc.save(`${safeName}.pdf`);
}

export async function exportBookAsPdf({
  elements,
  pageFormat,
  orientation,
  fileName,
  scale = 2,
}: ExportFromDomParams) {
  if (!elements || elements.length === 0) return;

  const images: string[] = [];

  for (const el of elements) {
    if (!el) continue;
    images.push(await captureElementAsPng(el, scale));
  }

  await exportImagesAsPdf({
    images,
    pageFormat,
    orientation,
    fileName,
  });
}
