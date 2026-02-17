"use client";

import React, { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

interface ReactBitsSpotlightCardProps extends React.PropsWithChildren {
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
}

export function ReactBitsSpotlightCard({
  children,
  className,
  spotlightColor = "rgba(255, 255, 255, 0.25)",
}: ReactBitsSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!cardRef.current || isFocused) return;

    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(0.55)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => {
        setIsFocused(true);
        setOpacity(0.55);
      }}
      onBlur={() => {
        setIsFocused(false);
        setOpacity(0);
      }}
      className={cn(
        "border-border/70 bg-card/95 relative overflow-hidden rounded-[30px] border p-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 78%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
