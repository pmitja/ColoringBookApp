import { Suspense } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "Create an account",
  description: "Create an account to get started.",
};

export default function RegisterPage() {
  return (
    <div className="relative grid min-h-screen items-center px-4 py-14 lg:grid-cols-2 lg:px-0">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-40px] size-[300px] rounded-full bg-sky-300/30 blur-3xl dark:bg-cyan-400/20" />
        <div className="absolute bottom-[-100px] right-[-80px] size-[300px] rounded-full bg-amber-300/35 blur-3xl dark:bg-orange-400/20" />
      </div>

      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-4 top-4 rounded-2xl font-bold shadow-sm md:right-8 md:top-8",
        )}
      >
        Login
      </Link>

      <div className="hidden h-full items-center justify-center p-10 lg:flex">
        <div className="playful-card shadow-primary/5 bg-background/50 max-w-md rounded-[2.5rem] border-2 p-10 shadow-xl backdrop-blur-sm">
          <p className="bg-primary/10 ring-primary/20 mb-4 w-fit rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary ring-1">
            Color Genie
          </p>
          <h2 className="font-heading text-4xl leading-tight text-foreground">
            Build Magical Coloring Books From Everyday Photos.
          </h2>
          <p className="mt-4 text-base font-medium text-muted-foreground">
            Start free, test your workflow, and export printable pages for home
            and classroom use.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md lg:p-8">
        <div className="playful-card shadow-primary/5 bg-background/80 rounded-[2.5rem] border-2 p-6 shadow-xl backdrop-blur-md sm:p-10">
          <div className="flex flex-col space-y-3 text-center">
            <div className="bg-primary/10 border-primary/20 mx-auto mb-2 flex size-16 rotate-3 items-center justify-center overflow-hidden rounded-3xl border-2 shadow-sm">
              <Icons.logo className="h-9 w-auto max-w-[140px] -rotate-3 object-contain" />
            </div>
            <h1 className="font-heading text-4xl tracking-tight">
              Create an Account
            </h1>
            <p className="text-base font-medium text-muted-foreground">
              Enter your email to start creating.
            </p>
          </div>

          <div className="mt-8">
            <Suspense>
              <UserAuthForm type="register" />
            </Suspense>
          </div>

          <p className="mt-8 px-4 text-center text-sm font-medium text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="font-bold underline underline-offset-4 transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-bold underline underline-offset-4 transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
