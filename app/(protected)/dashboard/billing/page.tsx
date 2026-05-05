import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  getUserSubscriptionPlan,
} from "@/lib/subscription";
import { cn, constructMetadata } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingPlansCard } from "@/components/dashboard/billing-plans-card";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Billing – Color Genie",
  description: "Manage your plan, generations, and billing information.",
});

export default async function BillingPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [generationsUsed, subscriptionPlan] = await Promise.all([
    prisma.imageJob.count({
      where: {
        userId,
        createdAt: {
          gte: getCurrentMonthStartUtc(),
        },
      },
    }),
    getUserSubscriptionPlan(userId),
  ]);

  const monthlyGenerationLimit = subscriptionPlan.monthlyGenerationLimit;
  const generationsRemaining = Math.max(
    monthlyGenerationLimit - generationsUsed,
    0,
  );
  const displayGenerationsUsed = Math.min(
    generationsUsed,
    monthlyGenerationLimit,
  );
  const overLimitCount = Math.max(generationsUsed - monthlyGenerationLimit, 0);
  const progressPercentage = Math.min(
    (generationsUsed / Math.max(monthlyGenerationLimit, 1)) * 100,
    100,
  );

  return (
    <>
      <DashboardHeader
        heading="Plan & Billing"
        text="Manage your subscription, track usage, and view billing history."
      />

      <div className="space-y-8 pb-10">
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm transition-shadow hover:shadow-md md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <CardTitle className="font-heading text-2xl">
                    Usage Overview
                  </CardTitle>
                  <CardDescription className="text-base">
                    Current plan:{" "}
                    <strong className="font-semibold text-foreground">
                      {subscriptionPlan.title}
                    </strong>
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    generationsRemaining > 0 ? "secondary" : "destructive"
                  }
                  className="rounded-full px-4 py-1.5 font-medium"
                >
                  {generationsRemaining} generations left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-0">
              <div className="space-y-3">
                <div className="flex items-end justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Monthly Generation Limit
                  </span>
                  <span className="font-heading text-lg font-bold text-foreground">
                    {displayGenerationsUsed}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      / {monthlyGenerationLimit}
                    </span>
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 ease-out",
                      progressPercentage >= 100 ? "bg-destructive" : "bg-primary",
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-accent/40 p-6">
                  <p className="font-heading text-4xl font-bold tracking-tight text-foreground">
                    {displayGenerationsUsed}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Used This Month
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-6">
                  <p className="font-heading text-4xl font-bold tracking-tight text-foreground">
                    {generationsRemaining}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Remaining
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-muted-foreground">
                  {generationsRemaining > 0
                    ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month before reaching your limit.`
                    : "You have no generations left this month. Upgrade your plan to keep generating."}
                </p>
                {overLimitCount > 0 ? (
                  <p className="flex w-fit items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/80 p-2 text-xs font-medium text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                    <Icons.warning className="size-3" />
                    {overLimitCount} additional generation
                    {overLimitCount === 1 ? "" : "s"} were created earlier this
                    month (over limit).
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-accent/60 text-primary">
                <Icons.billing className="size-6" />
              </div>
              <CardTitle className="font-heading text-xl">
                Current Subscription
              </CardTitle>
              <CardDescription className="pt-1">
                You are currently on the{" "}
                <strong className="font-semibold text-foreground">
                  {subscriptionPlan.title}
                </strong>{" "}
                plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-3">
                <p className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  Status
                  <Badge variant="outline" className="rounded-full font-medium">
                    Active
                  </Badge>
                </p>
                <p className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  Billing Cycle
                  <span className="font-semibold capitalize text-foreground">
                    {subscriptionPlan.interval || "Monthly"}
                  </span>
                </p>
              </div>
              {!subscriptionPlan.isPaid && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    Upgrade to unlock more generations and premium features.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <BillingPlansCard subscriptionPlan={subscriptionPlan} />
        </section>

        <Alert className="rounded-2xl border border-amber-200 bg-amber-50/60 text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <Icons.warning className="size-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="ml-2 font-heading font-semibold">
            Demo Mode Active
          </AlertTitle>
          <AlertDescription className="ml-2 mt-1 text-amber-800 dark:text-amber-300/90">
            Stripe runs in test mode here. Use test card numbers from{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-4 transition-colors hover:text-amber-950 dark:hover:text-amber-100"
            >
              Stripe testing docs
            </a>
            .
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
