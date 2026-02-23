import { HeroV2 } from "@/components/sections/v2/hero-v2";
import { PrivacyBannerV2 } from "@/components/sections/v2/privacy-banner-v2";
import { FeaturesBentoV2 } from "@/components/sections/v2/features-bento-v2";
import { EditorAndColoringV2 } from "@/components/sections/v2/editor-coloring-v2";
import Testimonials from "@/components/sections/testimonials";

export default function IndexPage() {
  return (
    <>
      <HeroV2 />
      <PrivacyBannerV2 />
      <FeaturesBentoV2 />
      <EditorAndColoringV2 />
      <Testimonials />
    </>
  );
}
