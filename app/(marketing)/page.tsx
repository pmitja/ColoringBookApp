import Testimonials from "@/components/sections/testimonials";
import { EditorAndColoringV2 } from "@/components/sections/v2/editor-coloring-v2";
import { FeaturesBentoV2 } from "@/components/sections/v2/features-bento-v2";
import { FinalCtaV2 } from "@/components/sections/v2/final-cta-v2";
import { HeroV2 } from "@/components/sections/v2/hero-v2";
import { HowItWorksV2 } from "@/components/sections/v2/how-it-works-v2";
import { PrivacyBannerV2 } from "@/components/sections/v2/privacy-banner-v2";
import { ShowcaseGalleryV2 } from "@/components/sections/v2/showcase-gallery-v2";

export default function IndexPage() {
  return (
    <>
      <HeroV2 />
      <PrivacyBannerV2 />
      <HowItWorksV2 />
      <ShowcaseGalleryV2 />
      <FeaturesBentoV2 />
      <EditorAndColoringV2 />
      <Testimonials />
      <FinalCtaV2 />
    </>
  );
}
