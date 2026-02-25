"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { Icons } from "@/components/shared/icons";

export function HeroV2() {
  return (
    <section className="relative overflow-hidden bg-[#f9cf38] pb-48 pt-20 lg:pt-32">
      {/* Decorative background elements */}
      <div className="absolute left-10 top-10 text-white/40">
        <Icons.sparkles className="size-16" />
      </div>
      <div className="absolute right-20 top-20 text-white/40">
        <Icons.send className="size-12 rotate-45 transform" />
      </div>
      <div className="absolute left-1/4 top-40 text-white/40">
        <Icons.star className="size-8" />
      </div>

      {/* Books on the sides (Placeholder with CSS shapes) */}
      <div className="absolute -left-12 top-1/2 z-10 flex -translate-y-1/2 transform flex-col items-center">
        <div className="z-10 h-8 w-32 -rotate-6 rounded border-2 border-slate-900 bg-red-400 shadow-md"></div>
        <div className="z-20 -mt-2 h-8 w-36 rotate-3 rounded border-2 border-slate-900 bg-blue-400 shadow-md"></div>
        <div className="w-30 z-30 -mt-2 h-8 -rotate-2 rounded border-2 border-slate-900 bg-green-400 shadow-md"></div>
      </div>

      <div className="absolute -right-12 top-1/2 z-10 flex -translate-y-1/2 transform flex-col items-center">
        <div className="z-10 h-8 w-36 rotate-6 rounded border-2 border-slate-900 bg-purple-400 shadow-md"></div>
        <div className="z-20 -mt-2 h-8 w-32 -rotate-3 rounded border-2 border-slate-900 bg-orange-400 shadow-md"></div>
        <div className="w-34 z-30 -mt-2 h-8 rotate-2 rounded border-2 border-slate-900 bg-teal-400 shadow-md"></div>
      </div>

      <div className="container relative z-20 mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-block rounded-full border-2 border-pink-200 bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-600 shadow-[4px_4px_0px_0px_rgba(244,114,182,0.3)]"
          >
            AI-Powered Book Generator
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-balance font-heading text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
          >
            Bring Your Imagination <br className="hidden sm:block" />
            to <span className="text-slate-900">Coloring Life</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-balance text-lg font-medium text-slate-800 sm:text-xl"
          >
            Turn your favorite photos into line art, generate magical scenes
            from text, or instantly create a full storybook with a cover. All in
            your browser.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border-2 border-slate-900 bg-emerald-400 px-8 py-4 font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              Start Generating <Icons.arrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>

        {/* Hero Interactive/Animated Visuals */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-20 mx-auto mt-16 max-w-5xl"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-4 border-slate-900 bg-white/90 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] backdrop-blur-sm">
            <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-3">
              {/* Photo to Lineart Animation */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden border-b-4 border-slate-900 p-6 md:border-b-0 md:border-r-4">
                <div className="absolute left-4 top-4 z-10 rounded-full border-2 border-pink-200 bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600 shadow-sm">
                  Photo to Lineart
                </div>
                <motion.div
                  className="relative size-48 overflow-hidden rounded-2xl border-2 border-slate-900 shadow-lg md:size-56"
                  animate={{ rotateY: [0, 180, 180, 0, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Image
                    src="/illustrations/color-sample.svg"
                    alt="Original Photo"
                    fill
                    className="object-cover"
                    style={{ backfaceVisibility: "hidden" }}
                  />
                  <div
                    className="absolute inset-0 bg-white"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <Image
                      src="/illustrations/lineart-sample.svg"
                      alt="Lineart Result"
                      fill
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Text to Page Animation */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden border-b-4 border-slate-900 bg-blue-50/50 p-6 md:border-b-0 md:border-r-4">
                <div className="absolute left-4 top-4 z-10 rounded-full border-2 border-blue-200 bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">
                  Text to Page
                </div>
                <div className="flex w-full flex-col items-center gap-4">
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "linear",
                    }}
                    className="flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full border-2 border-slate-900 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    <Icons.search className="size-4 shrink-0 text-slate-400" />
                    &quot;A dragon in space...&quot;
                  </motion.div>
                  <motion.div
                    className="relative flex size-40 items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Icons.page className="size-16 text-blue-300" />
                    <motion.div
                      className="absolute inset-0 bg-blue-400/20"
                      initial={{ top: "100%" }}
                      animate={{ top: "0%" }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Whole Book Animation */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden bg-yellow-50/50 p-6">
                <div className="absolute left-4 top-4 z-10 rounded-full border-2 border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700 shadow-sm">
                  Whole Book Gen
                </div>
                <motion.div
                  className="relative flex h-56 w-48 items-center justify-center"
                  animate={{ y: [-5, 5, -5] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="absolute -bottom-4 -left-4 h-44 w-32 -rotate-12 rounded-xl border-4 border-slate-900 bg-white shadow-xl" />
                  <div className="absolute -bottom-4 -right-4 h-44 w-32 rotate-12 rounded-xl border-4 border-slate-900 bg-white shadow-xl" />
                  <div className="relative flex h-48 w-36 flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
                    <div className="h-16 w-full border-b-2 border-slate-900 bg-teal-500" />
                    <div className="flex w-full flex-1 flex-col items-center justify-center bg-white p-2 text-center">
                      <div className="mb-2 h-2 w-20 rounded-full bg-slate-200" />
                      <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                    </div>
                    <div className="absolute right-2 top-2 rounded border border-slate-900 bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-slate-900">
                      COVER
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cloud separator at the bottom */}
      <div className="absolute bottom-0 left-0 z-10 w-full rotate-180 overflow-hidden leading-none">
        <svg
          className="relative block h-[100px] w-full md:h-[150px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            className="fill-white"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-50.24V0Z"
            opacity=".5"
            className="fill-white"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className="fill-white"
          ></path>
        </svg>
      </div>
    </section>
  );
}
