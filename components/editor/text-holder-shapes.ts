import type { EditorTextBox } from "./types";

export type TextHolderShape = NonNullable<EditorTextBox["holderShape"]>;

export const textHolderShapes: Array<{
  label: string;
  value: TextHolderShape;
}> = [
  { label: "Classic", value: "none" },
  { label: "Rounded", value: "rounded" },
  { label: "Pill", value: "pill" },
  { label: "Blob Soft", value: "blob-soft" },
  { label: "Blob Playful", value: "blob-playful" },
  { label: "Blob Organic", value: "blob-organic" },
];

export function resolveTextHolderBorderRadius(
  holderShape: EditorTextBox["holderShape"],
  fallbackRadius = 8,
) {
  switch (holderShape) {
    case "rounded":
      return "16px";
    case "pill":
      return "999px";
    case "blob-soft":
      return "58% 42% 48% 52% / 44% 56% 42% 58%";
    case "blob-playful":
      return "44% 56% 35% 65% / 58% 41% 59% 42%";
    case "blob-organic":
      return "64% 36% 55% 45% / 43% 62% 38% 57%";
    case "none":
    default:
      return `${fallbackRadius}px`;
  }
}
