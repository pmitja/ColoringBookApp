import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export const richTextExtensions = [StarterKit, Underline];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function plainTextToRichText(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");
  const escaped = escapeHtml(normalized);
  const withBreaks = escaped.replace(/\n/g, "<br />");
  return `<p>${withBreaks || "<br />"}</p>`;
}

export function resolveRichTextContent(text: string, richText?: string) {
  const value = richText?.trim();
  if (!value) return plainTextToRichText(text);
  if (!/[<>]/.test(value)) return plainTextToRichText(value);
  return value;
}
