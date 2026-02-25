"use client";

import { motion } from "framer-motion";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="border-border/50 mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6 dark:border-slate-700"
    >
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground dark:text-slate-50 sm:text-4xl">
          {heading}
        </h1>
        {text ? (
          <p className="max-w-2xl text-lg text-muted-foreground dark:text-slate-400">
            {text}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      ) : null}
    </motion.div>
  );
}
