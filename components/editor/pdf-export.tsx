"use client";

import {
  Document,
  Font,
  Image,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const MM_TO_PT = 72 / 25.4;

function mmToPt(mm: number) {
  return mm * MM_TO_PT;
}

type PageFormat = "A3" | "A4" | "A5";
type Orientation = "portrait" | "landscape";

const PAGE_MM: Record<PageFormat, { w: number; h: number }> = {
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
};

export interface PdfAssetItem {
  id: string;
  url: string;
  name?: string;
}

export interface PdfTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  fontColor?: string;
}

export type PdfPageElement =
  | { type: "text"; data: PdfTextBox }
  | {
      type: "image";
      data: {
        id: string;
        assetId: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fit?: "contain" | "cover";
        rotation?: number;
      };
    };

export interface PdfBookState {
  title: string;
  pages: Array<{ id: string; elements: PdfPageElement[] }>;
}

interface ExportParams {
  book: PdfBookState;
  assets: PdfAssetItem[];
  pageFormat: PageFormat;
  orientation: Orientation;
  contentPageWidth: number;
  contentPageHeight: number;
  marginMm?: number;
  fileName?: string;
}

export async function exportBookAsPdf(params: ExportParams) {
  const {
    book,
    assets,
    pageFormat,
    orientation,
    contentPageWidth,
    contentPageHeight,
    marginMm = 10,
    fileName,
  } = params;

  const base = PAGE_MM[pageFormat];
  const mm = orientation === "landscape" ? { w: base.h, h: base.w } : base;
  const pageSize = { width: mmToPt(mm.w), height: mmToPt(mm.h) };
  const contentWmm = Math.max(0, mm.w - marginMm * 2);
  const contentHmm = Math.max(0, mm.h - marginMm * 2);
  const scaleX = contentPageWidth > 0 ? contentWmm / contentPageWidth : 1;
  const scaleY = contentPageHeight > 0 ? contentHmm / contentPageHeight : 1;

  const assetIdToUrl = new Map<string, string>();
  for (const a of assets) assetIdToUrl.set(a.id, a.url);

  const styles = StyleSheet.create({
    page: {
      position: "relative",
    },
  });

  // Register local fonts once for better parity with preview
  try {
    // Inter (served from /public/fonts)
    Font.register({
      family: "Inter",
      fonts: [
        { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
        { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
      ],
    });
  } catch {}

  function mapFontFamily(
    input?: string,
    bold?: boolean,
    italic?: boolean,
  ): string {
    const f = (input || "Inter").toLowerCase();
    if (f.includes("inter")) return "Inter";
    if (f.includes("courier")) return "Courier"; // monospace
    if (f.includes("georgia") || f.includes("times")) return "Times-Roman";
    // Inter and Arial → Helvetica fallback
    return "Helvetica";
  }

  const Doc = (
    <Document>
      {book.pages.map((p) => (
        <Page key={p.id} size={pageSize} style={styles.page}>
          <View
            style={{
              position: "absolute",
              left: mmToPt(marginMm),
              top: mmToPt(marginMm),
              width: mmToPt(contentWmm),
              height: mmToPt(contentHmm),
            }}
          >
            {p.elements.map((el) => {
              if (el.type === "image") {
                const d = el.data as any;
                const url = assetIdToUrl.get(d.assetId);
                if (!url) return null;
                const rot: number = (d.rotation || 0) % 360;
                const quarter = Math.abs(rot) % 180 !== 0;
                const wmm = d.width * scaleX;
                const hmm = d.height * scaleY;
                const wrapperWpt = mmToPt(wmm);
                const wrapperHpt = mmToPt(hmm);
                const innerWpt = quarter ? wrapperHpt : wrapperWpt;
                const innerHpt = quarter ? wrapperWpt : wrapperHpt;
                const left = mmToPt(d.x * scaleX) + (wrapperWpt - innerWpt) / 2;
                const top = mmToPt(d.y * scaleY) + (wrapperHpt - innerHpt) / 2;
                const fit = d.fit === "cover" ? "cover" : "contain";
                return (
                  <View
                    key={d.id}
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width: innerWpt,
                      height: innerHpt,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={
                        {
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: innerWpt,
                          height: innerHpt,
                          transform: [
                            { translateX: innerWpt / 2 },
                            { translateY: innerHpt / 2 },
                            { rotate: `${rot}deg` },
                            { translateX: -innerWpt / 2 },
                            { translateY: -innerHpt / 2 },
                          ] as any,
                        } as any
                      }
                    >
                      <Image
                        src={url}
                        style={
                          {
                            width: "100%",
                            height: "100%",
                            objectFit: fit,
                          } as any
                        }
                      />
                    </View>
                  </View>
                );
              }
              if (el.type === "text") {
                const d = (el as any).data as PdfTextBox;
                const left = mmToPt(d.x * scaleX);
                const top = mmToPt(d.y * scaleY);
                const wpt = mmToPt(d.width * scaleX);
                const hpt = mmToPt(d.height * scaleY);
                const weight = d.bold ? 700 : 400;
                const fontStyle = (d.italic ? "italic" : "normal") as any;
                const textDecoration = d.underline ? "underline" : "none";
                const align = d.textAlign || "left";
                const vAlign = d.verticalAlign || "top";
                const color = d.fontColor || "#111827";
                const fontSizePt = (d.fontSize || 18) * scaleX * 0.75; // scale and px -> pt
                const pdfFontFamily = mapFontFamily(
                  d.fontFamily,
                  d.bold,
                  d.italic,
                );
                const justifyContent =
                  vAlign === "middle"
                    ? "center"
                    : vAlign === "bottom"
                      ? "flex-end"
                      : "flex-start";
                const justifyH =
                  align === "left"
                    ? "flex-start"
                    : align === "center"
                      ? "center"
                      : align === "right"
                        ? "flex-end"
                        : "stretch";
                return (
                  <View
                    key={d.id}
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width: wpt,
                      height: hpt,
                      display: "flex",
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        display: "flex",
                        justifyContent: justifyContent as any,
                        alignItems: justifyH as any,
                      }}
                    >
                      <Text
                        style={{
                          color: color as any,
                          fontWeight: weight as any,
                          fontStyle,
                          textDecoration: textDecoration as any,
                          fontSize: fontSizePt,
                          textAlign: align as any,
                          fontFamily: pdfFontFamily,
                        }}
                      >
                        {(d.text || "") as any}
                      </Text>
                    </View>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </Page>
      ))}
    </Document>
  );

  const blob = await pdf(Doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(fileName || book.title || "book").replace(/\s+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
