import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Billing – Coloring Book Creator",
  description: "Manage your credits and billing information.",
});

export default async function BillingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Mock data - in real app, fetch from database
  const creditsUsed = (user as any)?.creditsUsed || 0;
  const creditsAllocated = (user as any)?.creditsAllocated || 3;
  const creditsRemaining = Math.max(creditsAllocated - creditsUsed, 0);
  const progressPercentage =
    (creditsUsed / Math.max(creditsAllocated, 1)) * 100;

  return (
    <>
      <DashboardHeader
        heading="Credits & Billing"
        text="Manage your coloring book credits and billing information."
      />

      <div className="space-y-8 pb-10">
        {/* Current Usage */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Usage</span>
              <Badge
                variant="outline"
                className={
                  creditsRemaining > 0
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100"
                    : "border-rose-400/30 bg-rose-500/15 text-rose-800 dark:text-rose-100"
                }
              >
                {creditsRemaining} credits left
              </Badge>
            </CardTitle>
            <CardDescription>
              Track your coloring book creation usage for this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Credits Used</span>
                <span>
                  {creditsUsed} of {creditsAllocated}
                </span>
              </div>
              <Progress
                value={progressPercentage}
                className="h-3 bg-slate-200/70 dark:bg-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-semibold text-emerald-200">
                  {creditsUsed}
                </p>
                <p className="text-sm text-muted-foreground">Used This Month</p>
              </div>
              <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-semibold text-sky-200">
                  {creditsRemaining}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {creditsRemaining > 0
                  ? `You can create ${creditsRemaining} more coloring books this month`
                  : "Credits will reset next month, or upgrade for unlimited access"}
              </p>

              {creditsRemaining === 0 && (
                <Button className="gap-2">
                  <Icons.billing className="h-4 w-4" />
                  Buy More Credits
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get unlimited coloring book creations and priority processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Free Plan */}
              <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-slate-950/40">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Free Plan</h3>
                  <p className="text-2xl font-semibold">
                    $0<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Perfect for trying out the service
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />3 coloring
                    books per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    High-quality downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    Standard processing time
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.close className="h-4 w-4 text-slate-400" />
                    Priority support
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                  disabled
                >
                  Current Plan
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="relative space-y-4 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 via-slate-950/60 to-transparent p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    variant="outline"
                    className="border-emerald-300/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-100"
                  >
                    Most Popular
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Premium Plan</h3>
                  <p className="text-2xl font-semibold">
                    $9.99<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For families who love creating
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    Unlimited coloring books
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    High-quality downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    Priority processing (2x faster)
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-emerald-300" />
                    Multiple export formats
                  </li>
                </ul>
                <Button className="w-full gap-2">
                  <Icons.billing className="h-4 w-4" />
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packs */}
        <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle>One-Time Credit Packs</CardTitle>
            <CardDescription>
              Need just a few more coloring books? Buy credits without a
              subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-center dark:border-white/10 dark:bg-slate-950/40">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Starter
                </h4>
                <p className="text-xl font-semibold">5 Credits</p>
                <p className="text-lg font-semibold">$4.99</p>
                <p className="text-sm text-muted-foreground">
                  $1.00 per coloring book
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                >
                  Buy Credits
                </Button>
              </div>
              <div className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 p-5 text-center shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-100">
                  Best Value
                </h4>
                <p className="text-xl font-semibold">15 Credits</p>
                <p className="text-lg font-semibold">$12.99</p>
                <p className="text-sm text-muted-foreground">
                  $0.87 per coloring book
                </p>
                <Badge
                  variant="outline"
                  className="mx-auto w-fit border-emerald-300/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-100"
                >
                  Popular
                </Badge>
                <Button size="sm" className="w-full">
                  Buy Credits
                </Button>
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-center dark:border-white/10 dark:bg-slate-950/40">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Family
                </h4>
                <p className="text-xl font-semibold">30 Credits</p>
                <p className="text-lg font-semibold">$24.99</p>
                <p className="text-sm text-muted-foreground">
                  $0.83 per coloring book
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5"
                >
                  Buy Credits
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Alert className="!pl-14 border-amber-400/30 bg-amber-500/10 text-amber-800 dark:text-amber-100">
          <Icons.warning />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription className="text-balance">
            This is a demo app using Stripe test mode. You can use test card
            numbers from the{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-8"
            >
              Stripe documentation
            </a>{" "}
            to test the payment flow.
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
