"use client";

import { useMemo, useState } from "react";

import { SubscriptionPlan, UserSubscriptionPlan } from "@/types";
import { pricingData } from "@/config/subscriptions";
import { cn } from "@/lib/utils";
import { BillingFormButton } from "@/components/forms/billing-form-button";
import { Icons } from "@/components/shared/icons";
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
    plan.prices.monthly > 0
      ? Number((plan.prices.yearly / 12).toFixed(2))
      : 0;

  return (
    <div
      className={cn(
        "border-border/70 bg-background/80 flex h-full flex-col justify-between space-y-4 rounded-2xl border p-5",
        isCurrent &&
          "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{plan.title}</h3>
          {isCurrent ? (
            <Badge
              variant="outline"
              className="border-primary/45 bg-primary/20 text-primary-foreground"
            >
              Current Plan
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">{plan.description}</p>

        <div>
          <p className="text-2xl font-semibold">
            {formatPrice(displayPrice)}
            <span className="text-sm font-normal">
              {isYearly ? "/year" : "/month"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {plan.prices.monthly === 0
              ? "Free forever"
              : isYearly
                ? `Equivalent to ${formatPrice(monthlyEquivalent)}/month (billed annually)`
                : `${formatPrice(plan.prices.yearly)}/year if billed annually`}
          </p>
        </div>

        <p className="text-sm font-medium">
          {plan.monthlyGenerationLimit} generations/month
        </p>

        <ul className="space-y-2 text-sm">
          {plan.benefits.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Icons.check className="mt-0.5 size-4 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {isCurrent ? (
          subscriptionPlan.isPaid ? (
            <BillingFormButton
              offer={plan}
              subscriptionPlan={subscriptionPlan}
              year={isYearly}
            />
          ) : (
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          )
        ) : canUpgrade ? (
          <BillingFormButton
            offer={plan}
            subscriptionPlan={subscriptionPlan}
            year={isYearly}
          />
        ) : (
          <Button className="w-full" variant="outline" disabled>
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
    () => pricingData.findIndex((plan) => plan.title === subscriptionPlan.title),
    [subscriptionPlan.title],
  );

  const defaultBillingInterval: BillingInterval =
    subscriptionPlan.interval === "year" ? "yearly" : "monthly";
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>(defaultBillingInterval);
  const isYearly = billingInterval === "yearly";

  const visiblePlans = pricingData
    .map((plan, index) => ({ plan, index }))
    .filter(({ index }) => currentPlanIndex < 0 || index >= currentPlanIndex);

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Plans & Upgrades</CardTitle>
          <CardDescription>
            Your current plan is highlighted. Choose monthly or annual billing
            before upgrading.
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={billingInterval}
          onValueChange={(value) => {
            if (value === "monthly" || value === "yearly") {
              setBillingInterval(value);
            }
          }}
          aria-label="billing interval"
          className="h-9 w-fit overflow-hidden rounded-full border bg-background p-1 *:h-7 *:text-muted-foreground"
        >
          <ToggleGroupItem
            value="monthly"
            className="rounded-full px-5 data-[state=on]:!bg-primary data-[state=on]:!text-primary-foreground"
            aria-label="Toggle monthly billing"
          >
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem
            value="yearly"
            className="rounded-full px-5 data-[state=on]:!bg-primary data-[state=on]:!text-primary-foreground"
            aria-label="Toggle annual billing"
          >
            Annual (Save)
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {visiblePlans.map(({ plan, index }) => (
            <PlanCard
              key={plan.title}
              plan={plan}
              isCurrent={plan.title === subscriptionPlan.title}
              canUpgrade={currentPlanIndex >= 0 ? index > currentPlanIndex : true}
              subscriptionPlan={subscriptionPlan}
              isYearly={isYearly}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
