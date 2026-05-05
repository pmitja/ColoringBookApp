import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";
import GeneratorStudio from "@/components/generator/generator-studio";

export const metadata: Metadata = {
  title: "AI Name Generator – Color Genie",
  description:
    "Generate personalized printable name coloring pages with decorative doodles.",
};

export default async function NameGeneratorPage() {
  const user = await getCurrentUser();
  const isPaidUser = user?.id ? await isUserOnPaidPlan(user.id) : false;

  return (
    <GeneratorStudio
      heading="AI Name Generator"
      text="Create personalized name coloring pages with cute decorative styles."
      enabledModes={["name"]}
      defaultMode="name"
      isPaidUser={isPaidUser}
    />
  );
}
