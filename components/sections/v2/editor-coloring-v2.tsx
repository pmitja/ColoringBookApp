"use client";

import { motion } from "framer-motion";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { Icons } from "@/components/shared/icons";

export function EditorAndColoringV2() {
  return (
    <section className="relative overflow-hidden bg-[#f8fbff] py-20 dark:bg-slate-900 lg:py-32">
      
      {/* Decorative Blob */}
      <div className="absolute left-0 top-1/4 size-80 -translate-x-1/2 rounded-full bg-blue-200 opacity-40 blur-3xl dark:bg-blue-900/30 dark:opacity-30" />
      <div className="absolute bottom-0 right-0 size-96 translate-x-1/3 translate-y-1/3 rounded-full bg-pink-100 opacity-40 blur-3xl dark:bg-pink-900/20 dark:opacity-30" />

      <MaxWidthWrapper className="relative z-10">
        {/* Book Editor Section */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-blue-200 bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
               <Icons.laptop className="size-4" /> Powerful Book Editor
            </div>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              Combine Results into <br/> Print-Ready Books
            </h2>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              Don&apos;t just stop at one page. Use our visual editor to arrange your generated images, add custom titles, create covers, and download a ready-to-print PDF file.
            </p>
            <ul className="mt-2 space-y-4">
               {["Drag and drop visual builder", "Combine photos and text-generated pages", "Download high-quality print-ready PDFs"].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 text-base font-bold text-slate-800 dark:text-slate-200">
                   <div className="flex size-8 items-center justify-center rounded-full border-2 border-slate-900 bg-yellow-400 text-yellow-900 shadow-sm dark:border-slate-600 dark:bg-primary dark:text-primary-foreground">
                     <Icons.check className="size-4" />
                   </div>
                   {item}
                 </li>
               ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative flex aspect-square w-full flex-col justify-between rounded-[2.5rem] border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] md:aspect-video lg:aspect-square"
          >
             {/* Simulated Editor UI */}
             <div className="mb-4 flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-slate-50 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">My Awesome Book</span>
                <div className="flex gap-2">
                   <div className="rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:border-slate-600 dark:bg-slate-800">Cover</div>
                   <div className="rounded-xl border-2 border-slate-900 bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-primary dark:text-primary-foreground">Export PDF</div>
                </div>
             </div>

             <div className="flex flex-1 flex-wrap content-start items-start gap-4 overflow-hidden rounded-2xl border-4 border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-900">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    className="flex aspect-[3/4] w-[calc(33.333%-11px)] cursor-grab flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:cursor-grabbing dark:border-slate-600 dark:bg-slate-800 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                  >
                     <Icons.page className="size-10 text-slate-300" />
                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Page {i}</span>
                  </motion.div>
                ))}
                
                <motion.div 
                   animate={{ scale: [1, 1.05, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="flex aspect-[3/4] w-[calc(33.333%-11px)] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-pink-400 bg-pink-50 text-pink-500 transition-colors hover:bg-pink-100 dark:border-pink-600 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50"
                >
                   <Icons.add className="size-8" />
                </motion.div>
             </div>
          </motion.div>
        </div>

        {/* Online Coloring Section */}
        <div className="mt-32 grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative order-2 flex aspect-square w-full items-center justify-center rounded-[2.5rem] border-4 border-slate-900 bg-purple-50 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-purple-900/20 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] md:aspect-video lg:order-1 lg:aspect-square"
          >
             <div className="absolute inset-0 rounded-[2rem] bg-purple-200/30 dark:bg-purple-900/20" />
             
             {/* Simulated Coloring UI */}
             <div className="relative z-10 flex aspect-[3/4] w-3/4 flex-col items-center justify-center overflow-hidden rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                 <Icons.palette className="absolute left-6 top-6 size-8 text-purple-300 dark:text-purple-500" />
                 <motion.svg
                   viewBox="0 0 100 100"
                   className="size-full"
                 >
                   <motion.path
                     d="M 50 10 C 20 10 10 30 10 50 C 10 70 30 90 50 90 C 70 90 90 70 90 50 C 90 30 80 10 50 10"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="3"
                     className="text-slate-200 dark:text-slate-600"
                   />
                   <motion.path
                     initial={{ pathLength: 0, fill: "transparent" }}
                     whileInView={{ 
                       pathLength: 1, 
                       fill: ["transparent", "#f472b6"] 
                     }}
                     viewport={{ once: true }}
                     transition={{ duration: 3, ease: "easeInOut" }}
                     d="M 50 10 C 20 10 10 30 10 50 C 10 70 30 90 50 90 C 70 90 90 70 90 50 C 90 30 80 10 50 10"
                     stroke="#334155"
                     strokeWidth="3"
                   />
                 </motion.svg>
                 
                 {/* Color Picker palette */}
                 <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border-4 border-slate-900 bg-white px-4 py-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                    <div className="size-6 rounded-full border-2 border-slate-900 bg-red-400" />
                    <div className="size-6 rounded-full border-2 border-slate-900 bg-pink-400 ring-4 ring-pink-200" />
                    <div className="size-6 rounded-full border-2 border-slate-900 bg-blue-400" />
                    <div className="size-6 rounded-full border-2 border-slate-900 bg-emerald-400" />
                 </div>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-col gap-6 lg:order-2"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-purple-200 bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-600 dark:border-purple-800 dark:bg-purple-900/50 dark:text-purple-400">
               <Icons.palette className="size-4" /> Digital Palette
            </div>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              Color Online Instantly
            </h2>
            <p className="text-lg font-medium text-slate-600">
              No printer? No problem. Use our interactive digital coloring tool to bring your generated pages to life right in your browser.
            </p>
            <ul className="mt-2 space-y-4">
               {["Smart fill stays perfectly inside the lines", "Works seamlessly on desktop, tablet, and mobile", "Save your masterpieces and share with friends"].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 text-base font-bold text-slate-800 dark:text-slate-200">
                   <div className="flex size-8 items-center justify-center rounded-full border-2 border-slate-900 bg-pink-400 text-white shadow-sm dark:border-slate-600 dark:bg-pink-500">
                     <Icons.check className="size-4" />
                   </div>
                   {item}
                 </li>
               ))}
            </ul>
          </motion.div>
        </div>

      </MaxWidthWrapper>
    </section>
  );
}
