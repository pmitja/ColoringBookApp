import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
          buttonVariants({ variant: "outline" }),
          "absolute left-4 top-4 md:left-8 md:top-8 gap-2 rounded-2xl font-bold shadow-sm",
        )}
      >
        <ChevronLeft className="size-4" />
        Back
      </Link>

      <div className="playful-card mx-auto w-full max-w-md rounded-[2.5rem] border-2 shadow-xl shadow-primary/5 p-6 sm:p-10">
        <div className="flex flex-col space-y-3 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-[1.5rem] bg-primary/10 shadow-sm border-2 border-primary/20 rotate-3 mb-2 overflow-hidden">
            <Icons.logo className="h-8 w-auto max-w-[120px] object-contain -rotate-3" />
          </div>
          <h1 className="font-heading text-4xl tracking-tight">Welcome Back</h1>
          <p className="text-base font-medium text-muted-foreground">
            Enter your email to sign in to your account.
          </p>
        </div>

        <div className="mt-8">
          <Suspense>
            <UserAuthForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
          <Link
            href="/register"
            className="underline underline-offset-4 transition-colors hover:text-primary font-bold"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
