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
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8",
        )}
      >
        Login
      </Link>

      <div className="hidden h-full items-center justify-center p-10 lg:flex">
        <div className="surface-glass max-w-md rounded-3xl p-8">
          <p className="playful-pill mb-4 w-fit text-xs uppercase tracking-[0.2em]">
            Colorline AI
          </p>
          <h2 className="font-heading text-4xl leading-tight text-foreground">
            Build Magical Coloring Books From Everyday Photos.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, test your workflow, and export printable pages for home
            and classroom use.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md lg:p-8">
        <div className="surface-glass rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col space-y-3 text-center">
            <Icons.logo className="mx-auto h-10 w-auto" />
            <h1 className="font-heading text-3xl tracking-tight">
              Create an Account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to start creating.
            </p>
          </div>

          <div className="mt-6">
            <Suspense>
              <UserAuthForm type="register" />
            </Suspense>
          </div>

          <p className="mt-4 px-4 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 transition-colors hover:text-primary"
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
