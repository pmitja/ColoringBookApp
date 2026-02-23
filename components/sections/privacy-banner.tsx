import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { Icons } from "@/components/shared/icons";

export default function PrivacyBanner() {
  return (
    <section className="border-y border-border bg-muted py-6">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Icons.check className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Your creativity, your privacy.
            </h3>
            <p className="text-sm text-muted-foreground">
              We process your images to create lineart, but we never save your original photos.
            </p>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
