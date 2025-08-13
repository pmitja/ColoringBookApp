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
        }}
        className={`group rounded bg-white/80 p-2 ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
      >
        <div
          style={{
            display: "flex",
            alignItems,
            height: "100%",
            width: "100%",
          }}
        >
          <div
            id={`text-${element.id}`}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={(e) =>
              onChangeText((e.target as HTMLDivElement).innerText)
            }
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onFocus={onFocusEdit}
            onBlur={onBlurEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                (e.target as HTMLDivElement).blur();
              }
            }}
            // autofocus works on div in React
            autoFocus={isEditing as any}
            style={{
              fontWeight,
              fontStyle,
              textDecoration,
              fontFamily: element.fontFamily || "Inter, system-ui, sans-serif",
              fontSize: `${fontSizePx}px`,
              lineHeight: 1.25,
              textAlign,
              color,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              width: "100%",
            }}
            className="bg-transparent text-sm outline-none"
          >
            {element.text}
          </div>
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
