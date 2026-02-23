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
        "relative flex h-full flex-col justify-between space-y-6 rounded-3xl border p-6 transition-all duration-300",
        isCurrent
          ? "border-primary/50 bg-primary/5 shadow-[0_0_30px_-15px_hsl(var(--primary))] backdrop-blur-xl"
          : "border-border/40 bg-background/40 hover:border-border/80 hover:bg-background/60 backdrop-blur-xl hover:shadow-md",
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
            Current Plan
          </Badge>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight">{plan.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {plan.description}
          </p>
        </div>

        <div className="border-border/40 flex items-baseline gap-2 border-b pb-2">
          <span className="text-4xl font-extrabold tracking-tight">
            {formatPrice(displayPrice)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {isYearly ? "/year" : "/month"}
          </span>
        </div>

        {plan.prices.monthly > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-500">
            <Icons.check className="size-4" />
            {isYearly
              ? `Save ${formatPrice(plan.prices.monthly * 12 - plan.prices.yearly)} yearly`
              : `${formatPrice(plan.prices.yearly)}/year if billed annually`}
          </div>
        )}

        <div className="pt-2">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Icons.laptop className="size-4 text-primary" />
            {plan.monthlyGenerationLimit} generations/month
          </p>
          <ul className="space-y-3">
            {plan.benefits.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <Icons.check className="text-primary/70 mt-0.5 size-4 shrink-0" />
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
            <Button className="w-full rounded-xl" variant="secondary" disabled>
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
          <Button className="w-full rounded-xl" variant="outline" disabled>
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
            <CardTitle className="text-3xl font-bold tracking-tight">
              Available Plans
            </CardTitle>
            <CardDescription className="text-base">
              Choose the perfect plan for your needs. Upgrade anytime to unlock
              more generations and advanced features.
            </CardDescription>
          </div>
          <div className="border-border/50 bg-background/50 flex w-fit items-center rounded-full border p-1 backdrop-blur-xl">
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
                className="h-auto rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="h-auto rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Yearly{" "}
                <span className="ml-1.5 hidden rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 sm:inline-block">
                  Save 20%
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
