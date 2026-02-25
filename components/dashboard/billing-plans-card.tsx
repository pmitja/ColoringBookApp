"use client";

import { useMemo, useState } from "react";
import { SubscriptionPlan, UserSubscriptionPlan } from "@/types";

import { pricingData } from "@/config/subscriptions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BillingFormButton } from "@/components/forms/billing-form-button";
import { Icons } from "@/components/shared/icons";

type BillingInterval = "monthly" | "yearly";

function formatPrice(value: number) {
  if (value === 0) return "$0";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function PlanCard({
  plan,
  isCurrent,
  canUpgrade,
  subscriptionPlan,
  isYearly,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  canUpgrade: boolean;
  subscriptionPlan: UserSubscriptionPlan;
  isYearly: boolean;
}) {
  const displayPrice = isYearly ? plan.prices.yearly : plan.prices.monthly;
  const monthlyEquivalent =
    plan.prices.monthly > 0 ? Number((plan.prices.yearly / 12).toFixed(2)) : 0;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between space-y-6 overflow-hidden rounded-[2rem] border-4 p-6 transition-all duration-300",
        isCurrent
          ? "border-purple-500 bg-purple-50/50 shadow-[8px_8px_0px_0px_rgba(168,85,247,0.4)] dark:border-purple-400 dark:bg-purple-900/10"
          : "border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]",
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="border-2 border-white bg-purple-600 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm dark:border-slate-900">
            Current Plan
          </Badge>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{plan.title}</h3>
          <p className="text-sm font-bold leading-relaxed text-slate-500 dark:text-slate-400">
            {plan.description}
          </p>
        </div>

        <div className="flex items-baseline gap-2 border-b-2 border-slate-100 pb-4 dark:border-slate-800">
          <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            {formatPrice(displayPrice)}
          </span>
          <span className="text-base font-bold text-slate-500 dark:text-slate-400">
            {isYearly ? "/year" : "/month"}
          </span>
        </div>

        {plan.prices.monthly > 0 && (
          <div className="flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Icons.check className="size-4" />
            {isYearly
              ? `Save ${formatPrice(plan.prices.monthly * 12 - plan.prices.yearly)} yearly`
              : `${formatPrice(plan.prices.yearly)}/year if billed annually`}
          </div>
        )}

        <div className="pt-2">
          <p className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-50">
            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
               <Icons.laptop className="size-4" />
            </div>
            {plan.monthlyGenerationLimit} generations/month
          </p>
          <ul className="space-y-3">
            {plan.benefits.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                <Icons.check className="mt-0.5 size-4 shrink-0 stroke-[3px] text-slate-900 dark:text-slate-50" />
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-6">
        {isCurrent ? (
          subscriptionPlan.isPaid ? (
            <BillingFormButton
              offer={plan}
              subscriptionPlan={subscriptionPlan}
              year={isYearly}
            />
          ) : (
            <Button className="w-full rounded-xl border-2 border-slate-200 bg-slate-100 font-bold text-slate-500" disabled>
              Active Plan
            </Button>
          )
        ) : canUpgrade ? (
          <BillingFormButton
            offer={plan}
            subscriptionPlan={subscriptionPlan}
            year={isYearly}
          />
        ) : (
          <Button className="w-full rounded-xl border-2 border-slate-200" variant="outline" disabled>
            Unavailable
          </Button>
        )}
      </div>
    </div>
  );
}

export function BillingPlansCard({
  subscriptionPlan,
}: {
  subscriptionPlan: UserSubscriptionPlan;
}) {
  const currentPlanIndex = useMemo(
    () =>
      pricingData.findIndex((plan) => plan.title === subscriptionPlan.title),
    [subscriptionPlan.title],
  );

  const defaultBillingInterval: BillingInterval =
    subscriptionPlan.interval === "year" ? "yearly" : "monthly";
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    defaultBillingInterval,
  );
  const isYearly = billingInterval === "yearly";

  const visiblePlans = pricingData
    .map((plan, index) => ({ plan, index }))
    .filter(({ index }) => currentPlanIndex < 0 || index >= currentPlanIndex);

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pb-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl space-y-2">
            <CardTitle className="font-heading text-3xl font-extrabold text-slate-900 dark:text-slate-50">
              Available Plans
            </CardTitle>
            <CardDescription className="text-base font-bold text-slate-500 dark:text-slate-400">
              Choose the perfect plan for your needs. Upgrade anytime to unlock
              more generations and advanced features.
            </CardDescription>
          </div>
          <div className="flex w-fit items-center rounded-full border-2 border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ToggleGroup
              type="single"
              value={billingInterval}
              onValueChange={(value) => {
                if (value === "monthly" || value === "yearly") {
                  setBillingInterval(value);
                }
              }}
              className="gap-1"
            >
              <ToggleGroupItem
                value="monthly"
                className="h-auto rounded-full px-6 py-2.5 text-sm font-bold transition-all data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-slate-50 dark:data-[state=on]:text-slate-900"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="h-auto rounded-full px-6 py-2.5 text-sm font-bold transition-all data-[state=on]:bg-slate-900 data-[state=on]:text-white dark:data-[state=on]:bg-slate-50 dark:data-[state=on]:text-slate-900"
              >
                Yearly{" "}
                <span className="ml-2 hidden rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700 sm:inline-block">
                  Save 20%
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {visiblePlans.map(({ plan, index }) => (
            <PlanCard
              key={plan.title}
              plan={plan}
              isCurrent={plan.title === subscriptionPlan.title}
              canUpgrade={
                currentPlanIndex >= 0 ? index > currentPlanIndex : true
              }
              subscriptionPlan={subscriptionPlan}
              isYearly={isYearly}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
