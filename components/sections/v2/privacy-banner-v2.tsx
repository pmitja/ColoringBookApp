"use client";

import { motion } from "framer-motion";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function PrivacyBannerV2() {
  return (
    <section className="overflow-hidden border-y border-emerald-100 bg-emerald-50 py-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-10 items-center justify-center rounded-full bg-emerald-200 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
          >
            <Icons.check className="size-5" />
          </motion.div>
          <div>
            <h3 className="font-heading text-sm font-bold text-emerald-900 dark:text-emerald-400 sm:text-base">
              100% Private Processing. We do not save your image, only the results.
            </h3>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 sm:text-sm">
              Upload your personal photos safely. They are deleted immediately after lineart conversion.
            </p>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
