import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import { BASE_STYLES, INTO_LINEART, type StyleId } from "@/config/prompts";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

const GENERATOR_MODEL = "xai/grok-imagine-image";
const EDIT_MODEL = "xai/grok-imagine-image/edit";
const MAX_BATCH_COUNT = 5;

type GenerateMode = "prompt" | "consistent";

function getFalErrorDetails(error: unknown): string | null {
  const falError = error as any;
  const detail = falError?.body?.detail;
  if (!detail) return null;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });
}

function buildPromptGeneratorPrompt(prompt: string, style: StyleId | null) {
  if (!style) return prompt;

  return `${prompt}\n\nArt direction: ${BASE_STYLES[style]}`;
}

function buildConsistentPrompt(prompt: string, style: StyleId) {
  return [
    BASE_STYLES[style],
    prompt,
    "Keep the same primary character identity, facial features, hairstyle, and recognizable clothing cues as the reference image.",
    "Change only scene, action, and camera framing as requested.",
  ].join("\n\n");
}

async function fetchAndUploadToUploadThing(
  imageUrl: string,
  filename: string,
  isUpscaled = false,
): Promise<string | null> {
  try {
    const { UTApi } = await import("uploadthing/server");
    const sharp = await import("sharp");

    const utapi = new UTApi();

    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const targetResolution = isUpscaled ? 2400 : 1400;

    const processedBuffer = await sharp
      .default(buffer)
      .resize({
        width: targetResolution,
        height: targetResolution,
        fit: "inside",
      })
      .flatten({ background: "#ffffff" })
      .grayscale()
      .normalise()
      .threshold(215, { grayscale: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    const file = new File([processedBuffer], filename, {
      type: "image/png",
    });
    const uploadRes = await utapi.uploadFiles(file);
    if (uploadRes.error) throw new Error(uploadRes.error.message);

    return uploadRes.data.url;
  } catch (err) {
    console.error("Error uploading to UploadThing:", err);
    return null;
  }
}

async function updateJobFailed(jobId: string, error: unknown) {
  const detail = getFalErrorDetails(error);
  const baseMessage = error instanceof Error ? error.message : "Unknown error";
  const errorMessage = detail
    ? `${baseMessage} | detail: ${detail}`
    : baseMessage;

  if (detail) {
    console.error(`FAL validation details for job ${jobId}:`, detail);
  }

  await prisma.imageJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errorMessage,
    },
  });
}

async function updateJobDone(
  jobId: string,
  lineartUrl: string,
  isUpscaled: boolean,
) {
  await prisma.imageJob.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      inputUrl: null,
      cartoonUrl: null,
      lineartUrl,
      isUpscaled,
      errorMessage: null,
    },
  });
}

async function processPromptJob(
  jobId: string,
  prompt: string,
  style: StyleId | null,
  isUpscaled: boolean,
) {
  try {
    const job = await prisma.imageJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "QUEUED") return;

    await prisma.imageJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });

    const promptResult = await fal.subscribe(GENERATOR_MODEL, {
      input: {
        prompt: buildPromptGeneratorPrompt(prompt, style),
        num_images: 1,
        output_format: "png",
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Prompt generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });

    const generatedImageUrl = promptResult.data?.images?.[0]?.url;
    if (!generatedImageUrl) throw new Error("No image returned from FAL.AI");

    const lineartResult = await fal.subscribe(EDIT_MODEL, {
      input: {
        prompt: INTO_LINEART,
        image_url: generatedImageUrl,
        output_format: "png",
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Lineart generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });

    const lineartImageUrl = lineartResult.data?.images?.[0]?.url;
    if (!lineartImageUrl)
      throw new Error("No lineart image returned from FAL.AI");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      isUpscaled,
    );
    if (!lineartUrl)
      throw new Error("Failed to upload lineart image to UploadThing");

    await updateJobDone(jobId, lineartUrl, isUpscaled);
  } catch (error) {
    console.error(`Error processing prompt job ${jobId}:`, error);
    await updateJobFailed(jobId, error);
  }
}

async function processConsistentJob(
  jobId: string,
  prompt: string,
  style: StyleId,
  referenceImageUrl: string,
  isUpscaled: boolean,
) {
  try {
    const job = await prisma.imageJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "QUEUED") return;

    await prisma.imageJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });

    const consistentResult = await fal.subscribe(EDIT_MODEL, {
      input: {
        prompt: buildConsistentPrompt(prompt, style),
        image_url: referenceImageUrl,
        output_format: "png",
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Consistent generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });

    const styledImageUrl = consistentResult.data?.images?.[0]?.url;
    if (!styledImageUrl)
      throw new Error("No consistent-character image returned from FAL.AI");

    const lineartResult = await fal.subscribe(EDIT_MODEL, {
      input: {
        prompt: INTO_LINEART,
        image_url: styledImageUrl,
        output_format: "png",
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Lineart generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });

    const lineartImageUrl = lineartResult.data?.images?.[0]?.url;
    if (!lineartImageUrl)
      throw new Error("No lineart image returned from FAL.AI");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      isUpscaled,
    );
    if (!lineartUrl)
      throw new Error("Failed to upload lineart image to UploadThing");

    await updateJobDone(jobId, lineartUrl, isUpscaled);
  } catch (error) {
    console.error(`Error processing consistent job ${jobId}:`, error);
    await updateJobFailed(jobId, error);
  }
}

async function uploadReferenceFileToFalStorage(file: File): Promise<string> {
  return fal.storage.upload(file);
}

function parseBooleanField(value: FormDataEntryValue | null): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

function parseBatchCount(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(parsed, MAX_BATCH_COUNT));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPaidUser =
      Boolean(dbUser.stripePriceId) &&
      Boolean(dbUser.stripeCurrentPeriodEnd) &&
      (dbUser.stripeCurrentPeriodEnd?.getTime() ?? 0) + 86_400_000 > Date.now();
    const isSuperAdmin = dbUser.role === "ADMIN";
    const hasPremiumAccess = isPaidUser || isSuperAdmin;

    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "FAL_API_KEY not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const mode = ((formData.get("mode") as string) || "prompt") as GenerateMode;
    const prompt = (formData.get("prompt") as string)?.trim();
    const styleField = formData.get("style");
    const style =
      typeof styleField === "string" && styleField.trim().length > 0
        ? (styleField.trim() as StyleId)
        : null;
    const requestedPrivate = parseBooleanField(formData.get("private"));
    const requestedUpscale = parseBooleanField(formData.get("upscale"));
    const batchCount = parseBatchCount(formData.get("batchCount"));

    if (!prompt || prompt.length < 12) {
      return NextResponse.json(
        { error: "Prompt is too short" },
        { status: 400 },
      );
    }

    if (style && !BASE_STYLES[style]) {
      return NextResponse.json(
        { error: "Invalid style selected" },
        { status: 400 },
      );
    }

    if (mode !== "prompt" && mode !== "consistent") {
      return NextResponse.json(
        { error: "Invalid generation mode" },
        { status: 400 },
      );
    }

    const isPrivate =
      requestedPrivate === null ? hasPremiumAccess : requestedPrivate;
    if (isPrivate && !hasPremiumAccess) {
      return NextResponse.json(
        { error: "Private mode is available for paid plans only." },
        { status: 403 },
      );
    }

    const isUpscaled = requestedUpscale ?? false;
    if (isUpscaled && !hasPremiumAccess) {
      return NextResponse.json(
        { error: "Upscale is available for paid plans only." },
        { status: 403 },
      );
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

      if (batchCount > remainingThisMonth) {
        return NextResponse.json(
          {
            error:
              remainingThisMonth <= 0
                ? `You have no generations left this month on the ${planLimits.planTitle} plan. Upgrade to a higher plan to keep generating.`
                : `You only have ${remainingThisMonth} generation${remainingThisMonth === 1 ? "" : "s"} left this month on the ${planLimits.planTitle} plan. Reduce batch size or upgrade to a higher plan.`,
          },
          { status: 403 },
        );
      }
    }

    let referenceImageUrl: string | null = null;

    if (mode === "consistent") {
      const referenceJobId =
        (formData.get("referenceJobId") as string | null)?.trim() || null;
      if (referenceJobId) {
        const referenceJob = await prisma.imageJob.findFirst({
          where: {
            id: referenceJobId,
            userId,
            status: "DONE",
          },
          select: {
            cartoonUrl: true,
            lineartUrl: true,
          },
        });

        referenceImageUrl =
          referenceJob?.lineartUrl || referenceJob?.cartoonUrl || null;
      }

      if (!referenceImageUrl) {
        const referenceImage = formData.get("referenceImage") as File | null;
        if (!referenceImage) {
          return NextResponse.json(
            { error: "Reference image is required" },
            { status: 400 },
          );
        }
        if (!referenceImage.type.startsWith("image/")) {
          return NextResponse.json(
            { error: "Reference image must be an image file" },
            { status: 400 },
          );
        }
        if (referenceImage.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Reference image must be smaller than 10MB" },
            { status: 400 },
          );
        }

        referenceImageUrl =
          await uploadReferenceFileToFalStorage(referenceImage);
      }
    }

    const timestamp = Date.now();
    const jobs = await Promise.all(
      Array.from({ length: batchCount }).map((_, index) =>
        prisma.imageJob.create({
          data: {
            userId,
            inputFileName:
              mode === "consistent"
                ? batchCount > 1
                  ? `consistent-character-${timestamp}-${index + 1}.png`
                  : `consistent-character-${timestamp}.png`
                : batchCount > 1
                  ? `ai-generator-${timestamp}-${index + 1}.png`
                  : `ai-generator-${timestamp}.png`,
            inputUrl: null,
            status: "QUEUED",
            isPublic: !isPrivate,
            isUpscaled,
          },
        }),
      ),
    );

    for (const job of jobs) {
      if (mode === "consistent") {
        process.nextTick(() => {
          processConsistentJob(
            job.id,
            prompt,
            style ?? "DEFAULT",
            referenceImageUrl as string,
            isUpscaled,
          );
        });
      } else {
        process.nextTick(() => {
          processPromptJob(job.id, prompt, style, isUpscaled);
        });
      }
    }

    const [firstJob] = jobs;
    if (!firstJob) {
      return NextResponse.json(
        { error: "Failed to create generation job." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobId: firstJob.id,
      jobIds: jobs.map((job) => job.id),
      batchCount: jobs.length,
      message:
        jobs.length > 1
          ? `${jobs.length} jobs created successfully. Processing started.`
          : "Job created successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
