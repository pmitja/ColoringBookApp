"use client";

import Draggable from "react-draggable";

import type { EditorTextBox } from "./types";

interface TextBoxProps {
  element: EditorTextBox;
  zoom: number;
  workAreaPadding: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDoubleClickToEdit: () => void;
  onFocusEdit: () => void;
  onBlurEdit: () => void;
  onDragTo: (x: number, y: number) => void;
  onChangeText: (text: string) => void;
  onRemove: () => void;
}

export default function TextBox(props: TextBoxProps) {
  const {
    element,
    zoom,
    workAreaPadding,
    isSelected,
    isEditing,
    onSelect,
    onDoubleClickToEdit,
    onFocusEdit,
    onBlurEdit,
    onDragTo,
    onChangeText,
    onRemove,
  } = props;

  const left = Math.floor(workAreaPadding + element.x * zoom);
  const top = Math.floor(workAreaPadding + element.y * zoom);
  const width = Math.floor(element.width * zoom);
  const height = Math.floor(element.height * zoom);

  const fontWeight = element.bold ? 700 : 400;
  const fontStyle = element.italic ? "italic" : "normal";
  const textDecoration = element.underline ? "underline" : "none";
  const fontSizePx = (element.fontSize ?? 18) * zoom;
  const textAlign = element.textAlign || "left";
  const verticalAlign = element.verticalAlign || "top";
  const alignItems =
    verticalAlign === "middle"
      ? "center"
      : verticalAlign === "bottom"
        ? "flex-end"
        : "flex-start";
  const color = element.fontColor || "#111827";
  const backgroundColor = element.backgroundColor || "transparent";
  const borderColor = element.borderColor || "transparent";
  const borderWidth = element.borderWidth || 0;
  const borderRadius = element.borderRadius || 8;
  const boxShadow = element.boxShadow || "none";
  const padding = element.padding || 8;

  return (
    <Draggable
      position={{ x: left, y: top }}
      disabled={isEditing}
      bounds="parent"
      onDrag={(e, data) => {
        const xPage = (data.x - workAreaPadding) / zoom;
        const yPage = (data.y - workAreaPadding) / zoom;
        onDragTo(xPage, yPage);
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={onSelect}
        onDoubleClick={onDoubleClickToEdit}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          cursor: isEditing ? "text" : "move",
          backgroundColor,
          border:
            borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
          borderRadius: `${borderRadius}px`,
          boxShadow: isSelected
            ? `${boxShadow === "none" ? "" : boxShadow + ", "}0 0 0 2px var(--primary)`
            : boxShadow,
          padding: `${padding}px`,
        }}
        className={`group ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
      >
        <div
          style={{
            display: "flex",
            alignItems,
            height: "100%",
            width: "100%",
          }}
        >
          {isEditing ? (
            <textarea
              id={`text-${element.id}`}
              value={element.text}
              onChange={(e) => onChangeText(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onFocus={onFocusEdit}
              onBlur={onBlurEdit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              autoFocus
              style={{
                fontWeight,
                fontStyle,
                textDecoration,
                fontFamily:
                  element.fontFamily || "Inter, system-ui, sans-serif",
                fontSize: `${fontSizePx}px`,
                lineHeight: 1.25,
                textAlign,
                color,
                width: "100%",
                height: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                direction: "ltr",
              }}
            />
          ) : (
            <div
              style={{
                fontWeight,
                fontStyle,
                textDecoration,
                fontFamily:
                  element.fontFamily || "Inter, system-ui, sans-serif",
                fontSize: `${fontSizePx}px`,
                lineHeight: 1.25,
                textAlign,
                color,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                width: "100%",
                height: "100%",
                direction: "ltr",
              }}
            >
              {element.text}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className="absolute right-1 top-1 hidden rounded bg-white/80 p-1 text-xs shadow group-hover:block"
        >
          ✕
        </button>
      </div>
    </Draggable>
  );
}
