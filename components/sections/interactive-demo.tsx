"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function InteractiveDemo() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  return (
    <section className="bg-background py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-10 max-w-[800px] text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            See the Magic
          </h2>
          <p className="mt-4 font-sans text-lg text-muted-foreground">
            Slide to see how we turn your colorful photos into perfect coloring
            pages!
          </p>
        </div>

        <div className="mx-auto max-w-[800px]">
          <div
            ref={containerRef}
            className="relative aspect-video w-full cursor-ew-resize overflow-hidden rounded-3xl border-8 border-white bg-muted shadow-xl"
            onMouseDown={(e) => {
              setIsDragging(true);
              handleMove(e.clientX);
            }}
            onTouchStart={(e) => {
              setIsDragging(true);
              handleMove(e.touches[0].clientX);
            }}
          >
            {/* Base Image (After - Lineart) */}
            <div className="pointer-events-none absolute inset-0 size-full select-none">
              <Image
                src="/illustrations/lineart-sample.svg"
                alt="Coloring page lineart"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-indigo-900 shadow-sm backdrop-blur-sm">
                Line Art
              </div>
            </div>

            {/* Overlay Image (Before - Photo) */}
            <div
              className="pointer-events-none absolute inset-0 size-full select-none border-r-4 border-orange-500"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
              }}
            >
              <Image
                src="/illustrations/color-sample.svg"
                alt="Original photo"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 rounded-full bg-orange-500/90 px-4 py-2 text-sm font-bold text-white shadow-sm backdrop-blur-sm">
                Original
              </div>
            </div>

            {/* Slider Handle */}
            <div
              className="pointer-events-none absolute inset-y-0 flex w-1 items-center justify-center bg-orange-500"
              style={{ left: `calc(${sliderPosition}% - 2px)` }}
            >
              <div className="-ml-5 flex size-10 items-center justify-center rounded-full border-4 border-orange-500 bg-white shadow-lg">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-orange-500"
                >
                  <path d="M18 8L22 12L18 16" />
                  <path d="M6 8L2 12L6 16" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
