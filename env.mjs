import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    NEXTAUTH_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_OAUTH_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    STRIPE_API_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    UPLOADTHING_SECRET: z.string().min(1).optional(),
    UPLOADTHING_APP_ID: z.string().min(1).optional(),
    FAL_API_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
    NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_HOBBY_MONTHLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_HOBBY_YEARLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_SCALE_PRO_MONTHLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_SCALE_PRO_YEARLY_PLAN_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID: z.string().min(1),
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID: z.string().min(1),
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID: z.string().min(1),
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_OAUTH_TOKEN: process.env.GITHUB_OAUTH_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // Stripe
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    // UploadThing
    UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    // FAL.AI
    FAL_API_KEY: process.env.FAL_API_KEY,
    NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_HOBBY_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_HOBBY_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_HOBBY_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_HOBBY_YEARLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_SCALE_PRO_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_SCALE_PRO_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_SCALE_PRO_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_SCALE_PRO_YEARLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
  },
});
