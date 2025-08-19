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
  onDragStart: () => void;
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
    onDragStart,
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
    textAlign === "center"
      ? "center"
      : textAlign === "right"
        ? "flex-end"
        : "flex-start";
  const justifyContent =
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
      onStart={() => {
        onDragStart();
      }}
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
        {/* Chat bubble triangle - positioned outside the inner container */}
        {element.chatBubble && (
          <>
            {/* Main triangle with background color */}
            <div
              style={{
                position: "absolute",
                width: 0,
                height: 0,
                borderStyle: "solid",
                ...(element.chatBubble.trianglePosition === "top" && {
                  top: -element.chatBubble.triangleSize,
                  left: `${element.chatBubble.triangleOffset}%`,
                  transform: "translateX(-50%)",
                  borderWidth: `0 ${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px`,
                  borderColor: `transparent transparent ${backgroundColor} transparent`,
                }),
                ...(element.chatBubble.trianglePosition === "right" && {
                  right: -element.chatBubble.triangleSize,
                  top: `${element.chatBubble.triangleOffset}%`,
                  transform: "translateY(-50%)",
                  borderWidth: `${element.chatBubble.triangleSize}px 0 ${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px`,
                  borderColor: `transparent transparent transparent ${backgroundColor}`,
                }),
                ...(element.chatBubble.trianglePosition === "bottom" && {
                  bottom: -element.chatBubble.triangleSize,
                  left: `${element.chatBubble.triangleOffset}%`,
                  transform: "translateX(-50%)",
                  borderWidth: `${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px 0 ${element.chatBubble.triangleSize}px`,
                  borderColor: `${backgroundColor} transparent transparent transparent`,
                }),
                ...(element.chatBubble.trianglePosition === "left" && {
                  left: -element.chatBubble.triangleSize,
                  top: `${element.chatBubble.triangleOffset}%`,
                  transform: "translateY(-50%)",
                  borderWidth: `${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px ${element.chatBubble.triangleSize}px 0`,
                  borderColor: `transparent ${backgroundColor} transparent transparent`,
                }),
                zIndex: 0,
              }}
            />

            {/* Border triangle - slightly larger to create border effect */}
            {borderWidth > 0 && (
              <div
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  ...(element.chatBubble.trianglePosition === "top" && {
                    top: -(element.chatBubble.triangleSize + borderWidth),
                    left: `${element.chatBubble.triangleOffset}%`,
                    transform: "translateX(-50%)",
                    borderWidth: `0 ${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px`,
                    borderColor: `transparent transparent ${borderColor} transparent`,
                  }),
                  ...(element.chatBubble.trianglePosition === "right" && {
                    right: -(element.chatBubble.triangleSize + borderWidth),
                    top: `${element.chatBubble.triangleOffset}%`,
                    transform: "translateY(-50%)",
                    borderWidth: `${element.chatBubble.triangleSize + borderWidth}px 0 ${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px`,
                    borderColor: `transparent transparent transparent ${borderColor}`,
                  }),
                  ...(element.chatBubble.trianglePosition === "bottom" && {
                    bottom: -(element.chatBubble.triangleSize + borderWidth),
                    left: `${element.chatBubble.triangleOffset}%`,
                    transform: "translateX(-50%)",
                    borderWidth: `${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px 0 ${element.chatBubble.triangleSize + borderWidth}px`,
                    borderColor: `${borderColor} transparent transparent transparent`,
                  }),
                  ...(element.chatBubble.trianglePosition === "left" && {
                    left: -(element.chatBubble.triangleSize + borderWidth),
                    top: `${element.chatBubble.triangleOffset}%`,
                    transform: "translateY(-50%)",
                    borderWidth: `${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px ${element.chatBubble.triangleSize + borderWidth}px 0`,
                    borderColor: `transparent ${borderColor} transparent transparent`,
                  }),
                  zIndex: -1,
                }}
              />
            )}
          </>
        )}

        {/* Text content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems,
            justifyContent,
            height: "100%",
            width: "100%",
            position: "relative",
            zIndex: 1,
            backgroundColor,
            borderRadius: `${borderRadius}px`,
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
                height: "auto",
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
                height: "auto",
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
          className="absolute right-1 top-1 z-50 hidden rounded bg-white/80 p-1 text-xs shadow group-hover:block"
        >
          ✕
        </button>
      </div>
    </Draggable>
  );
}
