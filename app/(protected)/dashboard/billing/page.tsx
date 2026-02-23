import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  getUserSubscriptionPlan,
} from "@/lib/subscription";
import { constructMetadata } from "@/lib/utils";
import { BillingPlansCard } from "@/components/dashboard/billing-plans-card";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";
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
        text="Track usage, review your current plan, and upgrade only when you need more capacity."
      />

      <div className="space-y-8 pb-10">
        <Card className="border-border/80 bg-card/95 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>Monthly Generation Usage</span>
              <Badge
                variant={generationsRemaining > 0 ? "secondary" : "destructive"}
                className="rounded-full"
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
              <Progress value={progressPercentage} className="h-2.5" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border-border/70 bg-background/70 space-y-1 rounded-2xl border p-4">
                <p className="text-2xl font-semibold text-primary">
                  {displayGenerationsUsed}
                </p>
                <p className="text-sm text-muted-foreground">Used This Month</p>
              </div>
              <div className="border-border/70 bg-background/70 space-y-1 rounded-2xl border p-4">
                <p className="text-2xl font-semibold text-foreground">
                  {generationsRemaining}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {generationsRemaining > 0
                ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month.`
                : "You have no generations left this month. Upgrade to keep generating."}
            </p>
            {overLimitCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {overLimitCount} additional generation
                {overLimitCount === 1 ? "" : "s"} were created earlier this
                month.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <BillingPlansCard subscriptionPlan={subscriptionPlan} />

        <Alert className="border-border/90 bg-secondary/40 text-foreground">
          <Icons.warning className="size-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            Stripe runs in test mode here. Use test card numbers from{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4"
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
