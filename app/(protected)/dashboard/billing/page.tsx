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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl font-black text-slate-900 dark:text-slate-50">Plan & Billing</h1>
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
            Manage your subscription, track usage, and view billing history.
          </p>
        </div>
      </div>

      <div className="space-y-8 pb-10">
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] md:col-span-2">
            <div className="absolute right-0 top-0 size-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-yellow-100 opacity-50 blur-3xl dark:bg-yellow-900/20" />
            <CardHeader className="relative z-10 p-8 pb-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <CardTitle className="font-heading text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    Usage Overview
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-slate-500 dark:text-slate-400">
                    Current plan:{" "}
                    <strong className="font-bold text-slate-900 dark:text-slate-50">
                      {subscriptionPlan.title}
                    </strong>
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    generationsRemaining > 0 ? "secondary" : "destructive"
                  }
                  className={cn(
                    "rounded-full border-2 px-4 py-1.5 text-sm font-black shadow-sm",
                    generationsRemaining > 0
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
                  )}
                >
                  {generationsRemaining} generations left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-8 p-8 pt-4">
              <div className="space-y-3">
                <div className="flex items-end justify-between text-sm">
                  <span className="font-bold text-slate-500 dark:text-slate-400">
                    Monthly Generation Limit
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                    {displayGenerationsUsed}{" "}
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                      / {monthlyGenerationLimit}
                    </span>
                  </span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full border-r-2 border-slate-900 transition-all duration-500 ease-out dark:border-slate-950",
                      progressPercentage >= 100
                        ? "bg-red-500"
                        : "bg-emerald-500",
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 shadow-sm transition-all hover:border-slate-400 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
                  <div className="mb-3 rounded-full border-2 border-blue-200 bg-blue-100 p-3 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Icons.laptop className="size-6" />
                  </div>
                  <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {displayGenerationsUsed}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                    Used This Month
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 shadow-sm transition-all hover:border-slate-400 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
                  <div className="mb-3 rounded-full border-2 border-emerald-200 bg-emerald-100 p-3 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Icons.check className="size-6" />
                  </div>
                  <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {generationsRemaining}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                    Remaining
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {generationsRemaining > 0
                    ? `You can generate ${generationsRemaining} more page${generationsRemaining === 1 ? "" : "s"} this month before reaching your limit.`
                    : "You have no generations left this month. Upgrade your plan to keep generating."}
                </p>
                {overLimitCount > 0 ? (
                  <p className="flex w-fit items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs font-bold text-orange-600 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    <Icons.warning className="size-3" />
                    {overLimitCount} additional generation
                    {overLimitCount === 1 ? "" : "s"} were created earlier this
                    month (over limit).
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] dark:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]">
            <div className="absolute right-0 top-0 size-32 rounded-full bg-purple-100 opacity-50 blur-3xl dark:bg-purple-900/20" />
            <CardHeader className="relative z-10 mb-6 p-0">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-purple-100 text-purple-600 shadow-sm dark:border-slate-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Icons.billing className="size-7" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                Current Subscription
              </CardTitle>
              <CardDescription className="pt-2 font-medium text-slate-600 dark:text-slate-400">
                You are currently on the{" "}
                <strong className="font-bold text-slate-900 dark:text-slate-50">
                  {subscriptionPlan.title}
                </strong>{" "}
                plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4 p-0">
              <div className="space-y-3">
                <p className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                  Status
                  <Badge
                    variant="outline"
                    className="rounded-full border-2 border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Active
                  </Badge>
                </p>
                <p className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                  Billing Cycle
                  <span className="font-extrabold capitalize text-slate-900 dark:text-slate-50">
                    {subscriptionPlan.interval || "Monthly"}
                  </span>
                </p>
              </div>
              {!subscriptionPlan.isPaid && (
                <div className="border-t-2 border-slate-100 pt-4 dark:border-slate-800">
                  <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
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

        <Alert className="rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Icons.warning className="size-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="ml-2 font-extrabold text-amber-900 dark:text-amber-200">
            Demo Mode Active
          </AlertTitle>
          <AlertDescription className="ml-2 mt-1 font-medium text-amber-700 dark:text-amber-400">
            Stripe runs in test mode here. Use test card numbers from{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline underline-offset-4 transition-colors hover:text-amber-900 dark:hover:text-amber-200"
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
