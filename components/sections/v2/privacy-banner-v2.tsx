"use client";

import { motion } from "framer-motion";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function PrivacyBannerV2() {
  return (
    <section className="overflow-hidden border-y-4 border-slate-900 bg-pink-100 py-4 shadow-[0px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-[0px_4px_0px_0px_rgba(0,0,0,0.5)]">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-emerald-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-800 dark:text-primary"
          >
            <Icons.check className="size-6" />
          </motion.div>
          <div>
            <h3 className="font-heading text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-base">
              100% Private Processing. We do not save your image, only the results.
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 sm:text-sm">
              Upload your personal photos safely. They are deleted immediately after lineart conversion.
            </p>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
