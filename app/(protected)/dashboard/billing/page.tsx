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
        text="Track monthly generations, view your current plan, and upgrade when needed."
      />

      <div className="space-y-8 pb-10">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Monthly Generation Usage</span>
              <Badge
                variant="outline"
                className={
                  generationsRemaining > 0
                    ? "bg-secondary/70 border-border text-secondary-foreground"
                    : "border-rose-300/40 bg-rose-100/75 text-rose-700 dark:border-rose-400/30 dark:bg-rose-900/30 dark:text-rose-300"
                }
              >
                {generationsRemaining} left this month
              </Badge>
            </CardTitle>
            <CardDescription>
              Current plan: <strong>{subscriptionPlan.title}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span>
                  {displayGenerationsUsed} of {monthlyGenerationLimit}
                </span>
              </div>
              <Progress
                value={progressPercentage}
                className="bg-muted/70 h-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border-border/70 bg-background/80 space-y-1 rounded-xl border p-4">
                <p className="text-2xl font-semibold text-primary">
                  {displayGenerationsUsed}
                </p>
                <p className="text-sm text-muted-foreground">Used This Month</p>
              </div>
              <div className="border-border/70 bg-background/80 space-y-1 rounded-xl border p-4">
                <p className="text-2xl font-semibold text-accent-foreground">
                  {generationsRemaining}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {generationsRemaining > 0
                ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month.`
                : "You have no generations left this month. Upgrade to a higher plan to keep generating."}
            </p>
            {overLimitCount > 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                {overLimitCount} extra generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month before the current limits were applied.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <BillingPlansCard subscriptionPlan={subscriptionPlan} />

        <Alert className="border-border/90 bg-secondary/55 !pl-14 text-foreground">
          <Icons.warning />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription className="text-balance">
            This is a demo app using Stripe test mode. You can use test card
            numbers from the{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-8"
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
