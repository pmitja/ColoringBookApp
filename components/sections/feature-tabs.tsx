"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { Icons } from "@/components/shared/icons";

export default function FeatureTabs() {
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
  }, [isDragging]);

  return (
    <section className="bg-background py-16 md:py-24" id="examples">
      <MaxWidthWrapper>
        <div className="mx-auto mb-10 max-w-[800px] text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            See the Magic
          </h2>
          <p className="mt-4 font-sans text-lg text-muted-foreground">
            Explore our core AI features and see how easy it is to create your perfect coloring book.
          </p>
        </div>

        <Tabs defaultValue="image" className="mx-auto w-full max-w-[900px]">
          <TabsList className="grid h-auto w-full grid-cols-2 py-2 md:grid-cols-4">
            <TabsTrigger value="image" className="flex flex-col gap-2 py-3 data-[state=active]:bg-background">
              <Icons.media className="size-5" />
              <span>Image to Lineart</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex flex-col gap-2 py-3 data-[state=active]:bg-background">
              <Icons.post className="size-5" />
              <span>Text to Page</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex flex-col gap-2 py-3 data-[state=active]:bg-background">
              <Icons.user className="size-5" />
              <span>Consistent Avatars</span>
            </TabsTrigger>
            <TabsTrigger value="book" className="flex flex-col gap-2 py-3 data-[state=active]:bg-background">
              <Icons.bookOpen className="size-5" />
              <span>Whole Book Gen</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="image">
              <div className="flex flex-col items-center">
                <p className="mb-6 text-center text-muted-foreground">
                  Slide to see how we turn your colorful photos into perfect coloring pages!
                </p>
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
            </TabsContent>

            <TabsContent value="text">
              <div className="flex flex-col items-center">
                <p className="mb-6 text-center text-muted-foreground">
                  Type a prompt like <strong>&quot;A cute dragon eating tacos&quot;</strong> and let our AI generate a unique coloring page.
                </p>
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-3xl border-8 border-white bg-muted shadow-xl">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/40 dark:to-purple-950/40" />
                   <div className="bg-background/80 z-10 flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-border p-8 text-center shadow-sm backdrop-blur-sm">
                      <div className="flex w-full items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-inner">
                        <Icons.search className="size-5 text-muted-foreground" />
                        <span className="flex-1 text-left text-sm text-muted-foreground">A cute dragon eating tacos...</span>
                        <div className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Generate</div>
                      </div>
                      <div className="mt-4 flex w-full justify-center gap-4">
                         <div className="border-border/50 flex size-32 items-center justify-center rounded-xl border bg-white shadow-sm">
                            <Icons.page className="text-primary/30 size-10" />
                         </div>
                         <div className="border-border/50 flex size-32 items-center justify-center rounded-xl border bg-white shadow-sm">
                            <Icons.page className="text-primary/30 size-10" />
                         </div>
                         <div className="border-border/50 hidden size-32 items-center justify-center rounded-xl border bg-white shadow-sm sm:flex">
                            <Icons.page className="text-primary/30 size-10" />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="avatar">
               <div className="flex flex-col items-center">
                <p className="mb-6 text-center text-muted-foreground">
                  Upload a face and watch it become a consistent character across multiple coloring adventures.
                </p>
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-3xl border-8 border-white bg-muted shadow-xl">
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40" />
                   <div className="bg-background/80 z-10 flex items-center gap-6 rounded-2xl border border-border p-6 shadow-sm backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-muted shadow-md">
                          <Icons.user className="size-10 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Reference</span>
                      </div>
                      <Icons.arrowRight className="size-8 text-emerald-500" />
                      <div className="flex gap-3">
                         <div className="border-border/50 relative flex h-28 w-20 items-center justify-center rounded-lg border bg-white shadow-sm">
                            <Icons.page className="size-8 text-emerald-500/30" />
                            <div className="absolute bottom-2 text-[10px] font-bold text-emerald-700">Astronaut</div>
                         </div>
                         <div className="border-border/50 relative flex h-28 w-20 items-center justify-center rounded-lg border bg-white shadow-sm">
                            <Icons.page className="size-8 text-emerald-500/30" />
                            <div className="absolute bottom-2 text-[10px] font-bold text-emerald-700">Knight</div>
                         </div>
                         <div className="border-border/50 relative flex h-28 w-20 items-center justify-center rounded-lg border bg-white shadow-sm">
                            <Icons.page className="size-8 text-emerald-500/30" />
                            <div className="absolute bottom-2 text-[10px] font-bold text-emerald-700">Pirate</div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="book">
               <div className="flex flex-col items-center">
                <p className="mb-6 text-center text-muted-foreground">
                  Generate a complete book with a front cover, back cover, and interior pages from a single prompt.
                </p>
                <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-8 border-white bg-muted p-6 shadow-xl">
                   <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40" />
                   
                   <Image
                      src="/illustrations/landing-book.svg"
                      alt="Preview of printable coloring book"
                      width={500}
                      height={400}
                      className="relative z-10 drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                    />
                    <div className="relative z-10 mt-6 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold shadow-sm dark:bg-black/50">
                       <Icons.check className="size-4 text-amber-500" />
                       1-Click Generation
                    </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </MaxWidthWrapper>
    </section>
  );
}
