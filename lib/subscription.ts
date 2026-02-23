// @ts-nocheck
// TODO: Fix this when we turn strict mode on.
import { pricingData } from "@/config/subscriptions";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { UserSubscriptionPlan } from "types";

function isPaidSubscriptionActive(user: {
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}) {
  return Boolean(
    user.stripePriceId &&
      user.stripeCurrentPeriodEnd?.getTime() + 86_400_000 > Date.now(),
  );
}

function findPlanByPriceId(priceId?: string | null) {
  if (!priceId) return null;
  return (
    pricingData.find((plan) => plan.stripeIds.monthly === priceId) ||
    pricingData.find((plan) => plan.stripeIds.yearly === priceId) ||
    null
  );
}

export function getCurrentMonthStartUtc(referenceDate = new Date()) {
  return new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );
}

export function resolveGenerationPlanLimit(user: {
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}) {
  const fallbackPlan =
    pricingData.find((plan) => plan.title === "Free") ?? pricingData[0];
  const isPaid = isPaidSubscriptionActive(user);
  const matchedPlan = isPaid ? findPlanByPriceId(user.stripePriceId) : null;
  const effectivePlan = matchedPlan ?? fallbackPlan;

  return {
    planTitle: effectivePlan.title,
    monthlyGenerationLimit: effectivePlan.monthlyGenerationLimit,
    isPaid,
  };
}

export async function getUserMonthlyGenerationUsage(
  userId: string,
  monthStart = getCurrentMonthStartUtc(),
) {
  if (!userId) return 0;

  return prisma.imageJob.count({
    where: {
      userId,
      createdAt: {
        gte: monthStart,
      },
    },
  });
}

export async function isUserOnPaidPlan(userId: string): Promise<boolean> {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) return false;

  if (user.role === "ADMIN") return true;

  return isPaidSubscriptionActive(user);
}

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if(!userId) throw new Error("Missing parameters");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Check if user is on a paid plan.
  const isPaid = isPaidSubscriptionActive(user);

  // Find the pricing data corresponding to the user's plan
  const userPlan = findPlanByPriceId(user.stripePriceId);

  const plan = isPaid && userPlan ? userPlan : pricingData[0]

  const interval = isPaid
    ? userPlan?.stripeIds.monthly === user.stripePriceId
      ? "month"
      : userPlan?.stripeIds.yearly === user.stripePriceId
      ? "year"
      : null
    : null;

  let isCanceled = false;
  if (isPaid && user.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    )
    isCanceled = stripePlan.cancel_at_period_end
  }

  return {
    ...plan,
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime(),
    isPaid,
    interval,
    isCanceled
  }
}
