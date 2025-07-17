import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default function HeroLanding() {
  return (
    <section className="space-y-6 py-12 sm:py-20 lg:py-20">
      <div className="container flex max-w-5xl flex-col items-center gap-5 text-center">
        {/* Privacy Badge */}
        <div
          className={cn(
            "inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800",
            "dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
          )}
        >
          <span className="mr-2">🔒</span>
          <span className="font-medium">Your Photos Are Never Stored</span>
        </div>

        <h1 className="text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px]">
          Turn Your Family Photos into{" "}
          <span className="text-gradient_indigo-purple font-extrabold">
            Coloring Books
          </span>
        </h1>

        <p
          className="max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8"
          style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          Transform precious family moments into magical coloring adventures for
          your kids. Upload a photo, and our AI creates beautiful coloring pages
          in seconds—safely and privately.
        </p>

        {/* How It Works - Simple 3 Step */}
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Icons.media className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Upload Photo</span>
          </div>
          <Icons.arrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <Icons.spinner className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">AI Magic</span>
          </div>
          <Icons.arrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <Icons.package className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Download & Color</span>
          </div>
        </div>

        <div
          className="flex justify-center space-x-2 md:space-x-4"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <Link
            href="/dashboard"
            prefetch={true}
            className={cn(
              buttonVariants({ size: "lg", rounded: "full" }),
              "gap-2",
            )}
          >
            <span>Start Creating (Free)</span>
            <Icons.arrowRight className="size-4" />
          </Link>
          <Link
            href="#features"
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "lg",
                rounded: "full",
              }),
              "px-5",
            )}
          >
            <span>See Examples</span>
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>✨ 3 free coloring books to start</p>
          <p>🔒 Photos processed instantly, never stored</p>
          <p>🎨 Perfect for kids ages 3-12</p>
        </div>
      </div>
    </section>
  );
}
