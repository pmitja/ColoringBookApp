"use client";

import { useContext, useState } from "react";
import Link from "next/link";
import { UserSubscriptionPlan } from "@/types";

import { SubscriptionPlan } from "@/types/index";
import { pricingData } from "@/config/subscriptions";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BillingFormButton } from "@/components/forms/billing-form-button";
import { ModalContext } from "@/components/modals/providers";
import { HeaderSection } from "@/components/shared/header-section";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

type BillingInterval = "monthly" | "yearly";

interface PricingCardsProps {
  userId?: string;
  subscriptionPlan?: UserSubscriptionPlan;
}

function formatPrice(value: number) {
  if (value === 0) return "$0";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PricingCards({ userId, subscriptionPlan }: PricingCardsProps) {
  const defaultBillingInterval: BillingInterval =
    subscriptionPlan?.interval === "year" ? "yearly" : "monthly";
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    defaultBillingInterval,
  );
  const isYearly = billingInterval === "yearly";
  const { setShowSignInModal } = useContext(ModalContext);

  const PricingCard = ({ offer }: { offer: SubscriptionPlan }) => {
    const displayPrice = isYearly ? offer.prices.yearly : offer.prices.monthly;
    const monthlyEquivalent =
      offer.prices.monthly > 0
        ? Number((offer.prices.yearly / 12).toFixed(2))
        : 0;

    return (
      <div
        className={cn(
          "surface-glass relative flex flex-col overflow-hidden rounded-3xl",
          offer.title.toLocaleLowerCase() === "pro"
            ? "border-primary/80 shadow-[0_20px_38px_-24px_rgb(15_118_110/0.55)] dark:shadow-[0_24px_44px_-24px_rgb(45_212_191/0.45)]"
            : "",
        )}
        key={offer.title}
      >
        <div className="bg-muted/45 min-h-[150px] items-start space-y-4 p-6">
          <p className="font-urban flex text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {offer.title}
          </p>

          <div className="flex flex-row">
            <div className="flex items-end">
              <div className="flex text-left text-3xl font-semibold leading-6">
                {formatPrice(displayPrice)}
              </div>
              <div className="-mb-1 ml-2 text-left text-sm font-medium text-muted-foreground">
                <div>{isYearly ? "/year" : "/month"}</div>
              </div>
            </div>
          </div>
          {offer.prices.monthly > 0 ? (
            <div className="text-left text-sm text-muted-foreground">
              {isYearly
                ? `Equivalent to ${formatPrice(monthlyEquivalent)}/month (billed annually)`
                : `${formatPrice(offer.prices.yearly)} billed annually`}
            </div>
          ) : null}
        </div>

        <div className="flex h-full flex-col justify-between gap-16 p-6">
          <ul className="space-y-2 text-left text-sm font-medium leading-normal">
            {offer.benefits.map((feature) => (
              <li className="flex items-start gap-x-3" key={feature}>
                <Icons.check className="size-5 shrink-0 text-primary" />
                <p>{feature}</p>
              </li>
            ))}

            {offer.limitations.length > 0 &&
              offer.limitations.map((feature) => (
                <li
                  className="flex items-start text-muted-foreground"
                  key={feature}
                >
                  <Icons.close className="mr-3 size-5 shrink-0" />
                  <p>{feature}</p>
                </li>
              ))}
          </ul>

          {userId && subscriptionPlan ? (
            offer.prices.monthly === 0 ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    rounded: "full",
                  }),
                  "w-full",
                )}
              >
                Go to dashboard
              </Link>
            ) : (
              <BillingFormButton
                year={isYearly}
                offer={offer}
                subscriptionPlan={subscriptionPlan}
              />
            )
          ) : (
            <Button
              variant={
                offer.title.toLocaleLowerCase() === "pro"
                  ? "default"
                  : "outline"
              }
              rounded="full"
              onClick={() => setShowSignInModal(true)}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <MaxWidthWrapper>
      <section className="flex flex-col items-center text-center">
        <HeaderSection
          label="Pricing"
          title="Choose The Right Plan"
          subtitle="Start free, then scale with Starter, Hobby, or Pro."
        />

        <div className="mb-4 mt-10 flex items-center gap-5">
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
            className="border-border/80 bg-card/70 h-9 overflow-hidden rounded-full border p-1 backdrop-blur-sm *:h-7 *:text-muted-foreground"
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
        </div>

        <div className="grid gap-5 bg-inherit py-5 lg:grid-cols-2 xl:grid-cols-4">
          {pricingData.map((offer) => (
            <PricingCard offer={offer} key={offer.title} />
          ))}
        </div>

        <p className="mt-3 text-balance text-center text-base text-muted-foreground">
          Email{" "}
          <a
            className="font-medium text-primary hover:underline"
            href="mailto:support@colorgenie.ai"
          >
            support@colorgenie.ai
          </a>{" "}
          for to contact our support team.
          <br />
          <strong>
            You can test the subscriptions and won&apos;t be charged.
          </strong>
        </p>
      </section>
    </MaxWidthWrapper>
  );
}
