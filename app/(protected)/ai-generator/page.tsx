import type { Metadata } from "next";

import GeneratorStudio from "@/components/generator/generator-studio";
import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "AI Generator – Colorline AI",
  description:
    "Generate coloring pages from prompts and consistent character references.",
};

export default async function AIGeneratorPage() {
  const user = await getCurrentUser();
  const isPaidUser = user?.id ? await isUserOnPaidPlan(user.id) : false;

  return (
    <GeneratorStudio
      heading="AI Generator"
      text="Generate from prompts or keep characters consistent across new scenes."
      enabledModes={["ai", "consistent"]}
      defaultMode="ai"
      isPaidUser={isPaidUser}
    />
  );
}
