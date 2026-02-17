"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { richTextExtensions, resolveRichTextContent } from "./rich-text";
import { textHolderShapes } from "./text-holder-shapes";
import type { EditorTextBox } from "./types";

interface TextPropertiesProps {
  selectedTextBox: EditorTextBox;
  onUpdate: (partial: Partial<EditorTextBox>) => void;
}

const fontOptions = [
  { label: "Baloo 2 (Kids)", value: "Baloo 2" },
  { label: "Nunito (Kids)", value: "Nunito" },
  { label: "Geist (Adult)", value: "Geist" },
  { label: "Urbanist (Adult)", value: "Urbanist" },
  { label: "Inter (Clean)", value: "Inter" },
  { label: "Cal Sans (Display)", value: "Cal Sans" },
];

const backgroundOptions = [
  { label: "None", value: "transparent" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111827" },
];

const radiusOptions = [
  { label: "Square", value: 0 },
  { label: "Rounded", value: 12 },
  { label: "Pill", value: 999 },
];

const paddingOptions = [
  { label: "None", value: 0 },
  { label: "S", value: 6 },
  { label: "M", value: 10 },
  { label: "L", value: 16 },
];

function normalizeFontValue(value?: string) {
  if (!value) return "Geist";
  const raw = value.toLowerCase();
  if (raw.includes("var(--font-playful-heading)") || raw.includes("baloo")) {
    return "Baloo 2";
  }
  if (raw.includes("var(--font-playful-body)") || raw.includes("nunito")) {
    return "Nunito";
  }
  if (raw.includes("var(--font-geist)") || raw.includes("geist")) return "Geist";
  if (raw.includes("var(--font-urban)") || raw.includes("urbanist")) {
    return "Urbanist";
  }
  if (raw.includes("var(--font-heading)") || raw.includes("cal")) {
    return "Cal Sans";
  }
  if (raw.includes("var(--font-sans)") || raw.includes("inter")) return "Inter";
  return value;
}

export default function TextProperties({
  selectedTextBox,
  onUpdate,
}: TextPropertiesProps) {
  const fontValue = normalizeFontValue(selectedTextBox.fontFamily);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const richTextContent = resolveRichTextContent(
    selectedTextBox.text,
    selectedTextBox.richText,
  );
  const pickerBackgroundValue =
    selectedTextBox.backgroundColor &&
    selectedTextBox.backgroundColor !== "transparent"
      ? selectedTextBox.backgroundColor
      : "#111827";

  const editor = useEditor(
    {
      extensions: richTextExtensions,
      content: richTextContent,
      immediatelyRender: false,
      onUpdate: ({ editor: nextEditor }) => {
        onUpdateRef.current({
          text: nextEditor.getText(),
          richText: nextEditor.getHTML(),
        });
      },
      editorProps: {
        attributes: {
          class:
            "min-h-[120px] w-full rounded-xl border bg-white/80 p-3 text-sm shadow-inner focus:outline-none dark:bg-slate-950/60",
        },
      },
    },
    [selectedTextBox.id],
  );

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== richTextContent) {
      editor.commands.setContent(richTextContent, { emitUpdate: false });
    }
  }, [editor, richTextContent]);

  const applyPreset = (partial: Partial<EditorTextBox>) => {
    onUpdate(partial);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Text
          </Label>
          <span className="text-xs text-muted-foreground">
            Cmd/Ctrl + B I U
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            variant={editor?.isActive("bold") ? "secondary" : "outline"}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="h-8 rounded-lg px-3 text-xs"
          >
            Bold
          </Button>
          <Button
            size="sm"
            type="button"
            variant={editor?.isActive("italic") ? "secondary" : "outline"}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="h-8 rounded-lg px-3 text-xs"
          >
            Italic
          </Button>
          <Button
            size="sm"
            type="button"
            variant={editor?.isActive("underline") ? "secondary" : "outline"}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className="h-8 rounded-lg px-3 text-xs"
          >
            Underline
          </Button>
          <Button
            size="sm"
            type="button"
            variant={editor?.isActive("bulletList") ? "secondary" : "outline"}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="h-8 rounded-lg px-3 text-xs"
          >
            Bullets
          </Button>
          <Button
            size="sm"
            type="button"
            variant={editor?.isActive("orderedList") ? "secondary" : "outline"}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className="h-8 rounded-lg px-3 text-xs"
          >
            Numbered
          </Button>
          <Button
            size="sm"
            type="button"
            variant={
              editor?.isActive("heading", { level: 2 }) ? "secondary" : "outline"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className="h-8 rounded-lg px-3 text-xs"
          >
            H2
          </Button>
        </div>
        <div className="mt-2 [&_.ProseMirror_h1]:m-0 [&_.ProseMirror_h2]:m-0 [&_.ProseMirror_h3]:m-0 [&_.ProseMirror_ol]:m-0 [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:m-0 [&_.ProseMirror_ul]:m-0 [&_.ProseMirror_ul]:pl-5">
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Quick Styles
          </Label>
          <span className="text-xs text-muted-foreground">
            Kid + adult presets
          </span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() =>
              applyPreset({
                fontFamily: "Cal Sans",
                fontSize: 34,
                bold: true,
                backgroundColor: "transparent",
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 0,
                holderShape: "none",
                boxShadow: "none",
                padding: 0,
                chatBubble: undefined,
              })
            }
          >
            Title
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() =>
              applyPreset({
                fontFamily: "Geist",
                fontSize: 18,
                bold: false,
                backgroundColor: "transparent",
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 0,
                holderShape: "none",
                boxShadow: "none",
                padding: 0,
                chatBubble: undefined,
              })
            }
          >
            Body
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() =>
              applyPreset({
                fontFamily: "Urbanist",
                fontSize: 16,
                backgroundColor: "#fef3c7",
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 12,
                holderShape: "blob-soft",
                boxShadow: "none",
                padding: 12,
                chatBubble: undefined,
              })
            }
          >
            Note
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() =>
              applyPreset({
                fontFamily: "Baloo 2",
                fontSize: 28,
                bold: true,
                backgroundColor: "#fef3c7",
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 18,
                holderShape: "blob-playful",
                boxShadow: "none",
                padding: 14,
                chatBubble: undefined,
              })
            }
          >
            Kids Title
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() =>
              applyPreset({
                fontFamily: "Nunito",
                fontSize: 19,
                bold: false,
                backgroundColor: "#ffffff",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                borderRadius: 14,
                holderShape: "rounded",
                boxShadow: "none",
                padding: 12,
                chatBubble: undefined,
              })
            }
          >
            Workbook
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Typography
        </Label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Font</Label>
            <Select
              value={fontValue}
              onValueChange={(v) => onUpdate({ fontFamily: v })}
            >
              <SelectTrigger className="mt-1 h-10 rounded-xl">
                <SelectValue placeholder="Choose font" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <span className="text-xs text-muted-foreground">
                {selectedTextBox.fontSize || 18}px
              </span>
            </div>
            <Slider
              value={[selectedTextBox.fontSize || 18]}
              min={10}
              max={64}
              step={1}
              onValueChange={([v]) => onUpdate({ fontSize: v })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={selectedTextBox.bold ? "secondary" : "outline"}
              onClick={() =>
                onUpdate({ bold: !(selectedTextBox.bold || false) })
              }
              className="h-9 w-10 rounded-xl text-xs"
            >
              B
            </Button>
            <Button
              size="sm"
              variant={selectedTextBox.italic ? "secondary" : "outline"}
              onClick={() =>
                onUpdate({ italic: !(selectedTextBox.italic || false) })
              }
              className="h-9 w-10 rounded-xl text-xs"
            >
              I
            </Button>
            <Button
              size="sm"
              variant={selectedTextBox.underline ? "secondary" : "outline"}
              onClick={() =>
                onUpdate({
                  underline: !(selectedTextBox.underline || false),
                })
              }
              className="h-9 w-10 rounded-xl text-xs"
            >
              U
            </Button>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs">
              <input
                type="color"
                value={selectedTextBox.fontColor || "#111827"}
                onChange={(e) => onUpdate({ fontColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border bg-transparent"
                aria-label="Font color"
              />
              <span className="text-muted-foreground">
                {selectedTextBox.fontColor || "#111827"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Alignment
        </Label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Horizontal</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["left", "center", "right"].map((align) => (
                <Button
                  key={align}
                  size="sm"
                  variant={
                    selectedTextBox.textAlign === align ? "secondary" : "outline"
                  }
                  onClick={() =>
                    onUpdate({ textAlign: align as EditorTextBox["textAlign"] })
                  }
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Vertical</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: "Top", value: "top" },
                { label: "Middle", value: "middle" },
                { label: "Bottom", value: "bottom" },
              ].map((align) => (
                <Button
                  key={align.value}
                  size="sm"
                  variant={
                    selectedTextBox.verticalAlign === align.value
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() =>
                    onUpdate({
                      verticalAlign: align.value as EditorTextBox["verticalAlign"],
                    })
                  }
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  {align.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Appearance
        </Label>
        <div className="mt-3 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Background</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {backgroundOptions.map((bg) => (
                <Button
                  key={bg.value}
                  size="sm"
                  variant={
                    (selectedTextBox.backgroundColor || "transparent") === bg.value
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() => onUpdate({ backgroundColor: bg.value })}
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  <span
                    className="mr-2 h-3 w-3 rounded-sm border"
                    style={{
                      backgroundColor:
                        bg.value === "transparent" ? "#ffffff" : bg.value,
                    }}
                  />
                  {bg.label}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs">
              <input
                type="color"
                value={pickerBackgroundValue}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border bg-transparent"
                aria-label="Background color"
              />
              <span className="text-muted-foreground">
                {selectedTextBox.backgroundColor || "transparent"}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Text Holder</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {textHolderShapes.map((shape) => (
                <Button
                  key={shape.value}
                  size="sm"
                  variant={
                    (selectedTextBox.holderShape || "none") === shape.value
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() =>
                    onUpdate({
                      holderShape: shape.value,
                      chatBubble: undefined,
                    })
                  }
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  {shape.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Corners</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {radiusOptions.map((radius) => (
                <Button
                  key={radius.value}
                  size="sm"
                  variant={
                    (selectedTextBox.borderRadius || 0) === radius.value
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() =>
                    onUpdate({
                      borderRadius: radius.value,
                      holderShape: "none",
                    })
                  }
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  {radius.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Padding</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {paddingOptions.map((pad) => (
                <Button
                  key={pad.value}
                  size="sm"
                  variant={
                    (selectedTextBox.padding || 0) === pad.value
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() => onUpdate({ padding: pad.value })}
                  className="h-9 rounded-xl px-3 text-xs"
                >
                  {pad.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
