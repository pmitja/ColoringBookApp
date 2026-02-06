"use client";

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
import { Textarea } from "@/components/ui/textarea";

import type { EditorTextBox } from "./types";

interface TextPropertiesProps {
  selectedTextBox: EditorTextBox;
  onUpdate: (partial: Partial<EditorTextBox>) => void;
}

const fontOptions = [
  { label: "Geist", value: "Geist" },
  { label: "Urbanist", value: "Urbanist" },
  { label: "Inter", value: "Inter" },
  { label: "Cal Sans", value: "Cal Sans" },
];

const backgroundOptions = [
  { label: "None", value: "transparent" },
  { label: "Paper", value: "#ffffff" },
  { label: "Lemon", value: "#fef3c7" },
  { label: "Sky", value: "#dbeafe" },
  { label: "Mint", value: "#d1fae5" },
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

  const applyPreset = (partial: Partial<EditorTextBox>) => {
    onUpdate(partial);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Text
        </Label>
        <Textarea
          value={selectedTextBox.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="mt-2 min-h-[96px] rounded-xl bg-white/80 text-sm shadow-inner dark:bg-slate-950/60"
        />
      </div>

      <div className="rounded-2xl border bg-white/70 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Quick Styles
          </Label>
          <span className="text-xs text-muted-foreground">One tap</span>
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
                boxShadow: "none",
                padding: 12,
                chatBubble: undefined,
              })
            }
          >
            Note
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
                  onClick={() => onUpdate({ borderRadius: radius.value })}
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
