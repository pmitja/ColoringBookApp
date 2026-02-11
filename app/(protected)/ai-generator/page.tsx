import type { Metadata } from "next";

import GeneratorStudio from "@/components/generator/generator-studio";

export const metadata: Metadata = {
  title: "AI Generator – Coloring Book Creator",
  description:
    "Generate coloring pages from prompts and consistent character references.",
};

export default function AIGeneratorPage() {
  return (
    <GeneratorStudio
      heading="AI Generator"
      text="Generate from prompts or keep characters consistent across new scenes."
      enabledModes={["ai", "consistent"]}
      defaultMode="ai"
    />
  );
}
