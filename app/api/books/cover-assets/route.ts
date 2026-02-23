import { fal } from "@fal-ai/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

const COVER_MODEL = "fal-ai/nano-banana";
const COVER_OPTIONS_COUNT = 2;
const MIN_PROMPT_LENGTH = 12;

const ALLOWED_ASPECT_RATIOS = new Set(["3:4", "4:3", "1:1"]);
type AspectRatio = "3:4" | "4:3" | "1:1";

if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });
}

function parseAspectRatio(value: unknown): AspectRatio | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim() as AspectRatio;
  return ALLOWED_ASPECT_RATIOS.has(trimmed) ? trimmed : null;
}

function normalizePrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const prompt = value.trim();
  if (prompt.length < MIN_PROMPT_LENGTH) return null;
  return prompt;
}

function buildCoverPrompt(
  prompt: string,
  target: string | null,
  titleText: string | null,
) {
  const sideHint =
    target === "back"
      ? "Back cover composition. Keep key objects lower to avoid spine crop."
      : "Front cover composition. Keep a clean title-safe area at the top with no text rendered.";
  const titleHint = titleText
    ? `Requested title text: "${titleText}". If text is rendered, keep it large and clear near the top area.`
    : "Leave a clear title-safe area at the top. Do not render title text.";

  return [
    `Scene request: ${prompt}`,
    sideHint,
    titleHint,
    "Create a cute, wholesome children’s coloring-book cover illustration: cozy atmosphere, rounded shapes, thick clean outlines, soft pastel-friendly palette, polished digital illustration quality.",
    titleText
      ? "Centered, print-ready cover layout. No logos, no watermarks, no frame border."
      : "Centered, print-ready cover layout. No logos, no watermarks, no frame border. Reserve top title area without rendered text.",
  ].join("\n\n");
}

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.FAL_API_KEY) {
    return Response.json(
      { error: "FAL_API_KEY not configured" },
      { status: 500 },
    );
  }

  const userId = req.auth.user.id;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isPaidUser =
      Boolean(dbUser.stripePriceId) &&
      Boolean(dbUser.stripeCurrentPeriodEnd) &&
      (dbUser.stripeCurrentPeriodEnd?.getTime() ?? 0) + 86_400_000 >
        Date.now();
    const isSuperAdmin = dbUser.role === "ADMIN";
    const hasPremiumAccess = isPaidUser || isSuperAdmin;

    if (!hasPremiumAccess) {
      return Response.json(
        { error: "Cover generation is available on paid plans only." },
        { status: 403 },
      );
    }

    const payload = await req.json().catch(() => null);
    const prompt = normalizePrompt(payload?.prompt);
    const aspectRatio = parseAspectRatio(payload?.aspectRatio);
    const titleText =
      typeof payload?.titleText === "string" && payload.titleText.trim().length > 0
        ? payload.titleText.trim()
        : null;
    const target =
      typeof payload?.target === "string" ? payload.target.trim() : null;

    if (!prompt) {
      return Response.json(
        {
          error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    if (!aspectRatio) {
      return Response.json({ error: "Invalid aspect ratio." }, { status: 400 });
    }

    if (!isSuperAdmin) {
      const planLimits = resolveGenerationPlanLimit(dbUser);
      const usedThisMonth = await getUserMonthlyGenerationUsage(
        userId,
        getCurrentMonthStartUtc(),
      );
      const remainingThisMonth = Math.max(
        planLimits.monthlyGenerationLimit - usedThisMonth,
        0,
      );

      if (remainingThisMonth < 1) {
        return Response.json(
          {
            error: `You have no generations left this month on the ${planLimits.planTitle} plan.`,
          },
          { status: 403 },
        );
      }
    }

    const generated = await fal.subscribe(COVER_MODEL, {
      input: {
        prompt: buildCoverPrompt(prompt, target, titleText),
        num_images: COVER_OPTIONS_COUNT,
        aspect_ratio: aspectRatio,
        output_format: "webp",
      } as any,
      logs: true,
    });

    const generatedUrls = ((generated.data as any)?.images ?? [])
      .map((item: any) => item?.url)
      .filter((url: unknown): url is string => typeof url === "string")
      .slice(0, COVER_OPTIONS_COUNT);

    if (generatedUrls.length < COVER_OPTIONS_COUNT) {
      throw new Error("Model did not return enough images.");
    }

    const timestamp = Date.now();
    return Response.json({
      options: generatedUrls.map((url, index) => ({
        id: `temp-cover-option-${timestamp}-${index + 1}`,
        url,
        name: `Generated cover option ${index + 1}`,
      })),
      persistence: {
        mode: "save-selected-only",
      },
    });
  } catch (error) {
    console.error("Cover generation failed:", error);
    return Response.json(
      {
        error: "Failed to generate cover assets. Please try again.",
      },
      { status: 500 },
    );
  }
});
