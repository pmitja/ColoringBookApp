import type { Metadata } from "next";

import AIColorBookGenerator from "@/components/books/ai-color-book-generator";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata: Metadata = {
  title: "AI Color Book – Colorline AI",
  description:
    "Generate a full coloring book from one prompt, including front cover, interior pages, and back cover.",
};

export default function AIColorBookPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900 dark:text-slate-50">AI Color Book</h1>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
            Generate a complete coloring book from one prompt. Choose page count, then we will create front cover, interior pages, and back cover automatically.
          </p>
        </div>
      </div>

      <AIColorBookGenerator />
    </>
  );
}
