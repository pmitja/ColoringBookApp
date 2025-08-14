"use client";

import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export interface SimpleFlipBookHandle {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (index: number) => void;
  getCurrentPage: () => number;
}

interface SimpleFlipBookProps {
  width: number; // single page width
  height: number; // single page height
  className?: string;
  disableFlipByClick?: boolean;
  mode?: "single" | "spread";
  // When true in spread mode, page 1 is shown alone (cover), then spreads are [2,3], [4,5], ...
  cover?: boolean;
  onPageChange?: (index: number) => void; // reports primary (left) page index
  onEndNext?: () => void; // called when next is requested beyond last page
  children: React.ReactNode;
}

export const SimpleFlipBook = React.forwardRef<
  SimpleFlipBookHandle,
  SimpleFlipBookProps
>(function SimpleFlipBook(
  {
    width,
    height,
    className,
    disableFlipByClick,
    mode = "spread",
    cover = false,
    onPageChange,
    onEndNext,
    children,
  },
  ref,
) {
  const pages = useMemo(() => React.Children.toArray(children), [children]);
  // current represents the primary visible page index
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [animDir, setAnimDir] = useState<"next" | "prev" | null>(null);

  function clamp(n: number) {
    return Math.max(0, Math.min(pages.length - 1, n));
  }

  function turnToPage(index: number) {
    const target = clamp(index);
    let aligned = target;
    if (mode === "spread") {
      if (cover) {
        // Keep 0 as-is (single cover), then align to odd indices (1,3,5,...)
        aligned = target === 0 ? 0 : target % 2 === 0 ? target - 1 : target;
      } else {
        // Align to even indices (0,2,4,...) so spreads are [1,2], [3,4], ...
        aligned = target - (target % 2);
      }
    }
    setCurrent(aligned);
    setAnimDir(null);
  }

  function flipNext() {
    setAnimDir("next");
    setCurrent((c) => {
      let delta = 1;
      if (mode === "spread") {
        if (cover) {
          // From cover (0) advance to 1, then jump by 2
          delta = c === 0 ? 1 : 2;
        } else {
          delta = 2;
        }
      }
      const next = c + delta;
      if (next > pages.length - 1) {
        onEndNext?.();
        return c;
      }
      return clamp(next);
    });
  }

  function flipPrev() {
    setAnimDir("prev");
    setCurrent((c) => {
      let delta = 1;
      if (mode === "spread") {
        if (cover) {
          // Towards cover: from 1 go to 0, otherwise jump by 2
          delta = c === 1 ? 1 : 2;
        } else {
          delta = 2;
        }
      }
      return clamp(c - delta);
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      flipNext,
      flipPrev,
      turnToPage,
      getCurrentPage: () => current,
    }),
    [current],
  );

  useEffect(() => {
    onPageChange?.(current);
  }, [current, onPageChange]);

  const leftIndex = current;
  const rightIndex = mode === "spread" ? current + 1 : -1;
  const leftPage = pages[leftIndex] ?? null;
  const rightPage = mode === "spread" ? (pages[rightIndex] ?? null) : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: mode === "spread" ? width * 2 : width,
        height,
        position: "relative",
      }}
      onClick={() => {
        if (!disableFlipByClick) flipNext();
      }}
    >
      {mode === "spread" ? (
        <div
          className="relative h-full w-full overflow-hidden rounded bg-neutral-100"
          style={{ width: width * 2, height }}
        >
          {/* Pages container */}
          <div className="flex h-full w-full">
            <div className={"relative h-full"} style={{ width }}>
              <div
                className={
                  "absolute inset-0 bg-white shadow-sm transition-transform duration-300 ease-out " +
                  (animDir === "prev" ? "translate-x-[-8px]" : "translate-x-0")
                }
              >
                {leftPage}
              </div>
            </div>
            <div className={"relative h-full"} style={{ width }}>
              <div
                className={
                  "absolute inset-0 bg-white shadow-sm transition-transform duration-300 ease-out " +
                  (animDir === "next" ? "translate-x-[8px]" : "translate-x-0")
                }
              >
                {rightPage}
              </div>
            </div>
          </div>

          {/* Gutter */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-300" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-r from-black/5 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-l from-black/5 to-transparent" />
        </div>
      ) : (
        <div
          style={{ width, height }}
          className="relative h-full w-full overflow-hidden rounded bg-white"
        >
          <div className="absolute inset-0 transition-transform duration-300 ease-in-out">
            {leftPage}
          </div>
        </div>
      )}
    </div>
  );
});

export default SimpleFlipBook;
