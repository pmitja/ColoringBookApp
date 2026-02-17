import { PlansRow, SubscriptionPlan } from "types";

import { env } from "@/env.mjs";

const starterMonthlyStripeId =
  env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PLAN_ID ??
  env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID;
const starterYearlyStripeId =
  env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PLAN_ID ??
  env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID;

const hobbyMonthlyStripeId =
  env.NEXT_PUBLIC_STRIPE_HOBBY_MONTHLY_PLAN_ID ??
  env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID;
const hobbyYearlyStripeId =
  env.NEXT_PUBLIC_STRIPE_HOBBY_YEARLY_PLAN_ID ??
  env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID;

const proMonthlyStripeId =
  env.NEXT_PUBLIC_STRIPE_SCALE_PRO_MONTHLY_PLAN_ID ?? null;
const proYearlyStripeId =
  env.NEXT_PUBLIC_STRIPE_SCALE_PRO_YEARLY_PLAN_ID ?? null;

export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "For families and testers",
    monthlyGenerationLimit: 10,
    benefits: [
      "5-10 generations per month from a shared pool",
      "Basic styles and standard processing",
      "Printable 1-5 page PDF exports",
    ],
    limitations: [
      "No private mode",
      "No upscale exports",
      "No priority queue",
    ],
    prices: {
      monthly: 0,
      yearly: 0,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Starter",
    description: "For casual parents",
    monthlyGenerationLimit: 80,
    benefits: [
      "80 coloring pages per month",
      "HD exports",
      "Basic editor",
      "Personal-use license",
      "Private mode and upscale access",
    ],
    limitations: ["No priority queue", "No commercial license"],
    prices: {
      monthly: 9.99,
      yearly: 79,
    },
    stripeIds: {
      monthly: starterMonthlyStripeId,
      yearly: starterYearlyStripeId,
    },
  },
  {
    title: "Hobby",
    description: "For frequent home use",
    monthlyGenerationLimit: 250,
    benefits: [
      "250 coloring pages per month",
      "Priority queue",
      "Up to 10-page generator",
      "Text overlays",
      "Private mode and upscale access",
    ],
    limitations: ["No commercial license", "No consistency regen"],
    prices: {
      monthly: 19.99,
      yearly: 179,
    },
    stripeIds: {
      monthly: hobbyMonthlyStripeId,
      yearly: hobbyYearlyStripeId,
    },
  },
  {
    title: "Pro",
    description: "For creators and sellers",
    monthlyGenerationLimit: 800,
    benefits: [
      "800 coloring pages per month",
      "High print quality exports",
      "20+ page books",
      "Consistency regeneration",
      "Commercial license",
    ],
    limitations: [],
    prices: {
      monthly: 39.99,
      yearly: 349,
    },
    stripeIds: {
      monthly: proMonthlyStripeId,
      yearly: proYearlyStripeId,
    },
  },
];

export const plansColumns = ["free", "starter", "hobby", "pro"] as const;

export const comparePlans: PlansRow[] = [
  {
    feature: "Monthly generations",
    free: "5-10",
    starter: "80",
    hobby: "250",
    pro: "800",
  },
  {
    feature: "Private mode",
    free: false,
    starter: true,
    hobby: true,
    pro: true,
    tooltip: "Paid plans can keep generated images private by default.",
  },
  {
    feature: "Upscale exports",
    free: false,
    starter: true,
    hobby: true,
    pro: true,
    tooltip: "Upscale increases output resolution for cleaner prints.",
  },
  {
    feature: "Max pages per PDF/book",
    free: "1-5",
    starter: "1-10",
    hobby: "10",
    pro: "20+",
  },
  {
    feature: "Priority queue",
    free: false,
    starter: false,
    hobby: true,
    pro: true,
  },
  {
    feature: "Text overlays",
    free: false,
    starter: false,
    hobby: true,
    pro: true,
  },
  {
    feature: "Consistency regeneration",
    free: false,
    starter: false,
    hobby: false,
    pro: true,
  },
  {
    feature: "Commercial license",
    free: false,
    starter: false,
    hobby: false,
    pro: true,
  },
];
