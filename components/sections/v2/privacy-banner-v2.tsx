"use client";

import { motion } from "framer-motion";

import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export function PrivacyBannerV2() {
  return (
    <section className="bg-accent/40 overflow-hidden border-y border-border py-6 sm:py-5">
      <MaxWidthWrapper>
        <div className="grid gap-6 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm ring-1 ring-border">
              <Icons.check className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-sm font-semibold text-foreground sm:text-base">
                100% Private Processing. We do not save your image, only the
                results.
              </h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                Upload your personal photos safely. They are deleted immediately
                after lineart conversion.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card p-4 text-center shadow-sm sm:py-3"
          >
            <span className="font-heading text-2xl font-bold tabular-nums text-primary sm:text-3xl">
              10,000+
            </span>
            <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
              pages generated
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-sm sm:flex-row sm:gap-3 sm:py-3 sm:text-left"
          >
            <div className="bg-muted/60 flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-primary">
              <Icons.download className="size-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold text-foreground sm:text-base">
                Print-ready PDF
              </p>
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                Export books your printer will love.
              </p>
            </div>
          </motion.div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
