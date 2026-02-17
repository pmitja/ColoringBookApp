import type { Metadata } from "next";

import GeneratorStudio from "@/components/generator/generator-studio";
import { getCurrentUser } from "@/lib/session";
import { isUserOnPaidPlan } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Upload Photo – Colorline AI",
  description: "Upload a photo and turn it into a printable coloring page.",
};

export default async function UploadPage() {
  const user = await getCurrentUser();
  const isPaidUser = user?.id ? await isUserOnPaidPlan(user.id) : false;

  return (
    <GeneratorStudio
      heading="Upload Photo"
      text="Choose a family photo to transform into a coloring book."
      enabledModes={["photo"]}
      defaultMode="photo"
      isPaidUser={isPaidUser}
    />
  );
}
