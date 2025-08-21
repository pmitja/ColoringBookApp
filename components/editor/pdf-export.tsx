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

export async function exportBookAsPdf({
  elements,
  pageFormat,
  orientation,
  fileName,
  scale = 2,
}: ExportFromDomParams) {
  if (!elements || elements.length === 0) return;

  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: pageFormat.toLowerCase() as any,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) {
      return;
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      allowTaint: true,
      useCORS: true,
    });
    const data = canvas.toDataURL("image/png");

    if (i > 0) doc.addPage();
    doc.addImage(data, "PNG", 0, 0, pageW, pageH);
  }

  const safeName = (fileName || "book").replace(/\s+/g, "-");
  doc.save(`${safeName}.pdf`);
}
