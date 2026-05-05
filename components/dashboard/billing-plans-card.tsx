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

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between space-y-6 overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300",
        isCurrent
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
            Current Plan
          </Badge>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {plan.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {plan.description}
          </p>
        </div>

        <div className="flex items-baseline gap-2 border-b border-border pb-4">
          <span className="font-heading text-4xl font-bold tracking-tight text-foreground">
            {formatPrice(displayPrice)}
          </span>
          <span className="text-base font-medium text-muted-foreground">
            {isYearly ? "/year" : "/month"}
          </span>
        </div>

        {plan.prices.monthly > 0 && (
          <div className="flex w-fit items-center gap-2 rounded-lg bg-accent/60 px-3 py-1.5 text-sm font-medium text-accent-foreground">
            <Icons.check className="size-4 text-primary" />
            {isYearly
              ? `Save ${formatPrice(plan.prices.monthly * 12 - plan.prices.yearly)} yearly`
              : `${formatPrice(plan.prices.yearly)}/year if billed annually`}
          </div>
        )}

        <div className="pt-2">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="rounded-lg bg-accent/60 p-1.5 text-primary">
              <Icons.laptop className="size-4" />
            </span>
            {plan.monthlyGenerationLimit} generations/month
          </p>
          <ul className="space-y-3">
            {plan.benefits.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <Icons.check className="mt-0.5 size-4 shrink-0 text-primary" />
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
            <Button className="w-full rounded-xl font-medium" disabled variant="secondary">
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
            <CardTitle className="font-heading text-3xl font-bold text-foreground">
              Available Plans
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Choose the perfect plan for your needs. Upgrade anytime to unlock
              more generations and advanced features.
            </CardDescription>
          </div>
          <div className="flex w-fit items-center rounded-full bg-muted p-1">
            <ToggleGroup
              type="single"
              value={billingInterval}
              onValueChange={(value) => {
                if (value === "monthly" || value === "yearly") {
                  setBillingInterval(value);
                }
              }}
              className="gap-0"
            >
              <ToggleGroupItem
                value="monthly"
                className="h-auto rounded-full px-6 py-2.5 text-sm font-medium transition-all data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="h-auto rounded-full px-6 py-2.5 text-sm font-medium transition-all data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                Yearly{" "}
                <span className="ml-2 hidden rounded-full bg-accent/80 px-2 py-0.5 text-xs font-semibold text-accent-foreground sm:inline-block">
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
