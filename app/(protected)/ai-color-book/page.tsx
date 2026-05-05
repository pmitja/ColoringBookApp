import type { Metadata } from "next";

import AIColorBookGenerator from "@/components/books/ai-color-book-generator";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata: Metadata = {
  title: "AI Color Book – Color Genie",
  description:
    "Generate a full coloring book from one prompt, including front cover, interior pages, and back cover.",
};

export default function AIColorBookPage() {
  return (
    <>
      <DashboardHeader
        heading="AI Color Book"
        text="Generate a complete coloring book from one prompt. Choose page count, then we will create front cover, interior pages, and back cover automatically."
      />

      <AIColorBookGenerator />
    </>
  );
}
