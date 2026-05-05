import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";
import GeneratorStudio from "@/components/generator/generator-studio";

export const metadata: Metadata = {
  title: "Upload Photo – Color Genie",
  description: "Upload a photo and turn it into a printable coloring page.",
};

export default async function UploadPage() {
  const user = await getCurrentUser();
  const isPaidUser = user?.id ? await isUserOnPaidPlan(user.id) : false;

  return (
    <GeneratorStudio
      heading="Upload Photo"
      text="Upload one image, choose a style, and generate a clean printable page."
      enabledModes={["photo"]}
      defaultMode="photo"
      isPaidUser={isPaidUser}
    />
  );
}
