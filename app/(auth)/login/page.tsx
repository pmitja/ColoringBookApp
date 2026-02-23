import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-80px] top-[-30px] size-[260px] rounded-full bg-sky-300/30 blur-3xl dark:bg-cyan-400/20" />
        <div className="absolute bottom-[-90px] right-[-40px] size-[280px] rounded-full bg-amber-300/35 blur-3xl dark:bg-orange-400/20" />
      </div>

      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "absolute left-4 top-4 md:left-8 md:top-8",
        )}
      >
        <Icons.chevronLeft className="mr-2 size-4" />
        Back
      </Link>

      <div className="surface-glass mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col space-y-3 text-center">
          <Icons.logo className="mx-auto h-10 w-auto" />
          <h1 className="font-heading text-3xl tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account.
          </p>
        </div>

        <div className="mt-6">
          <Suspense>
            <UserAuthForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="underline underline-offset-4 transition-colors hover:text-primary"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
