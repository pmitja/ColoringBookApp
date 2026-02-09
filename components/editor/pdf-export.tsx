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
}

export async function captureElementAsPng(
  element: HTMLElement,
  scale = 2,
): Promise<string> {
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
    },
  });

  return canvas.toDataURL("image/png");
}

export function exportImagesAsPdf({
  images,
  pageFormat,
  orientation,
  fileName,
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
    doc.addImage(data, "PNG", 0, 0, pageW, pageH);
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

  exportImagesAsPdf({
    images,
    pageFormat,
    orientation,
    fileName,
  });
}
