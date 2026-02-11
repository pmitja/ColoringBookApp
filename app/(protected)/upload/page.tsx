import type { Metadata } from "next";

import GeneratorStudio from "@/components/generator/generator-studio";

export const metadata: Metadata = {
  title: "Upload Photo – Coloring Book Creator",
  description: "Upload a photo and turn it into a printable coloring page.",
};

export default function UploadPage() {
  return (
    <GeneratorStudio
      heading="Upload Photo"
      text="Choose a family photo to transform into a coloring book."
      enabledModes={["photo"]}
      defaultMode="photo"
    />
  );
}
