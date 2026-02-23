import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  getUserSubscriptionPlan,
} from "@/lib/subscription";
import { constructMetadata } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BillingPlansCard } from "@/components/dashboard/billing-plans-card";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Billing – Colorline AI",
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
          <Card className="border-border/40 bg-background/40 relative overflow-hidden rounded-3xl shadow-sm backdrop-blur-xl md:col-span-2">
            <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
            <CardHeader className="relative z-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Usage Overview</CardTitle>
                  <CardDescription>
                    Current plan:{" "}
                    <strong className="text-foreground">
                      {subscriptionPlan.title}
                    </strong>
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    generationsRemaining > 0 ? "secondary" : "destructive"
                  }
                  className="bg-secondary/80 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-md"
                >
                  {generationsRemaining} generations left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-8">
              <div className="space-y-3">
                <div className="flex items-end justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Monthly Generation Limit
                  </span>
                  <span className="text-lg font-semibold">
                    {displayGenerationsUsed}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {monthlyGenerationLimit}
                    </span>
                  </span>
                </div>
                <Progress
                  value={progressPercentage}
                  className="bg-secondary/50 h-3 rounded-full"
                  indicatorClassName={
                    progressPercentage >= 100 ? "bg-destructive" : "bg-primary"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border-border/30 bg-background/50 hover:bg-background/80 flex flex-col items-center justify-center rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all">
                  <div className="bg-primary/10 mb-3 rounded-full p-3 text-primary">
                    <Icons.laptop className="size-6" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight">
                    {displayGenerationsUsed}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Used This Month
                  </p>
                </div>
                <div className="border-border/30 bg-background/50 hover:bg-background/80 flex flex-col items-center justify-center rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all">
                  <div className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-500">
                    <Icons.check className="size-6" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight">
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
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-500/80">
                    <Icons.warning className="size-3" />
                    {overLimitCount} additional generation
                    {overLimitCount === 1 ? "" : "s"} were created earlier this
                    month (over limit).
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-background/40 hover:border-primary/20 group relative flex flex-col justify-between overflow-hidden rounded-3xl shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
            <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="relative z-10">
              <div className="bg-primary/10 mb-4 flex size-12 items-center justify-center rounded-xl text-primary">
                <Icons.billing className="size-6" />
              </div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription className="pt-2">
                You are currently on the{" "}
                <strong className="text-foreground">
                  {subscriptionPlan.title}
                </strong>{" "}
                plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="space-y-2">
                <p className="flex items-center justify-between text-sm text-muted-foreground">
                  Status
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  >
                    Active
                  </Badge>
                </p>
                <p className="flex items-center justify-between text-sm text-muted-foreground">
                  Billing Cycle
                  <span className="font-medium capitalize text-foreground">
                    {subscriptionPlan.interval || "Monthly"}
                  </span>
                </p>
              </div>
              {!subscriptionPlan.isPaid && (
                <div className="border-border/50 border-t pt-4">
                  <p className="mb-4 text-sm text-muted-foreground">
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

        <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/5 text-amber-600 backdrop-blur-sm dark:text-amber-500">
          <Icons.warning className="size-5" />
          <AlertTitle className="font-semibold">Demo Mode Active</AlertTitle>
          <AlertDescription className="mt-1 text-amber-600/80 dark:text-amber-500/80">
            Stripe runs in test mode here. Use test card numbers from{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 transition-colors hover:text-amber-600 dark:hover:text-amber-400"
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
