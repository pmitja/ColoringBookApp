"use client";

import { motion } from "framer-motion";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { Icons } from "@/components/shared/icons";

export function EditorAndColoringV2() {
  return (
    <section className="overflow-hidden bg-background py-20 lg:py-32">
      <MaxWidthWrapper>
        {/* Book Editor Section */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
               <Icons.laptop className="size-3" /> Powerful Book Editor
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Combine Results into <br/> Print-Ready Books
            </h2>
            <p className="text-lg text-muted-foreground">
              Don&apos;t just stop at one page. Use our visual editor to arrange your generated images, add custom titles, create covers, and download a ready-to-print PDF file.
            </p>
            <ul className="mt-2 space-y-4">
               {["Drag and drop visual builder", "Combine photos and text-generated pages", "Download high-quality print-ready PDFs"].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 text-sm font-medium">
                   <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                     <Icons.check className="size-3" />
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
            className="relative flex aspect-square w-full flex-col justify-between rounded-3xl border border-border bg-muted p-6 md:aspect-video lg:aspect-square"
          >
             {/* Simulated Editor UI */}
             <div className="mb-4 flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                <span className="text-sm font-bold">My Awesome Book</span>
                <div className="flex gap-2">
                   <div className="rounded bg-muted px-2 py-1 text-xs font-medium">Cover</div>
                   <div className="bg-primary/10 rounded px-2 py-1 text-xs font-medium text-primary">Export PDF</div>
                </div>
             </div>

             <div className="bg-background/50 flex flex-1 flex-wrap content-start items-start gap-4 overflow-hidden rounded-xl border-2 border-dashed border-border p-4">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    className="flex aspect-[3/4] w-[calc(33.333%-11px)] cursor-grab flex-col items-center justify-center gap-2 rounded border bg-white shadow-md active:cursor-grabbing"
                  >
                     <Icons.page className="text-muted-foreground/30 size-8" />
                     <span className="text-[10px] font-bold text-muted-foreground">Page {i}</span>
                  </motion.div>
                ))}
                
                <motion.div 
                   animate={{ scale: [1, 1.05, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="border-primary/50 bg-primary/5 hover:bg-primary/10 flex aspect-[3/4] w-[calc(33.333%-11px)] cursor-pointer items-center justify-center rounded border-2 border-dashed text-primary transition-colors"
                >
                   <Icons.add className="size-6" />
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
            className="relative order-2 flex aspect-square w-full items-center justify-center rounded-3xl border border-border bg-muted p-6 md:aspect-video lg:order-1 lg:aspect-square"
          >
             <div className="absolute inset-0 rounded-3xl bg-gradient-to-tl from-purple-100 to-transparent dark:from-purple-950/30" />
             
             {/* Simulated Coloring UI */}
             <div className="relative z-10 flex aspect-[3/4] w-3/4 flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-white p-4 shadow-2xl">
                 <Icons.palette className="absolute left-4 top-4 size-6 text-purple-300" />
                 <motion.svg
                   viewBox="0 0 100 100"
                   className="size-full"
                 >
                   <motion.path
                     d="M 50 10 C 20 10 10 30 10 50 C 10 70 30 90 50 90 C 70 90 90 70 90 50 C 90 30 80 10 50 10"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     className="text-muted-foreground/20"
                   />
                   <motion.path
                     initial={{ pathLength: 0, fill: "transparent" }}
                     whileInView={{ 
                       pathLength: 1, 
                       fill: ["transparent", "#a855f7"] 
                     }}
                     viewport={{ once: true }}
                     transition={{ duration: 3, ease: "easeInOut" }}
                     d="M 50 10 C 20 10 10 30 10 50 C 10 70 30 90 50 90 C 70 90 90 70 90 50 C 90 30 80 10 50 10"
                     stroke="#a855f7"
                     strokeWidth="2"
                   />
                 </motion.svg>
                 
                 {/* Color Picker palette */}
                 <div className="bg-background/90 absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-border px-3 py-2 shadow-lg backdrop-blur">
                    <div className="size-4 rounded-full bg-red-400" />
                    <div className="size-4 rounded-full bg-purple-500 ring-2 ring-purple-500 ring-offset-1" />
                    <div className="size-4 rounded-full bg-blue-400" />
                    <div className="size-4 rounded-full bg-green-400" />
                 </div>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-col gap-6 lg:order-2"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
               <Icons.palette className="size-3" /> Digital Palette
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Color Online Instantly
            </h2>
            <p className="text-lg text-muted-foreground">
              No printer? No problem. Use our interactive digital coloring tool to bring your generated pages to life right in your browser.
            </p>
            <ul className="mt-2 space-y-4">
               {["Smart fill stays perfectly inside the lines", "Works seamlessly on desktop, tablet, and mobile", "Save your masterpieces and share with friends"].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 text-sm font-medium">
                   <div className="flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                     <Icons.check className="size-3" />
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
