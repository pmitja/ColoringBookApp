import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import { BASE_STYLES, INTO_LINEART, type StyleId } from "@/config/prompts";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const GENERATOR_MODEL = "xai/grok-imagine-image";
const EDIT_MODEL = "xai/grok-imagine-image/edit";

const ASPECT_RATIOS = new Set(["auto", "3:4", "1:1", "4:3"]);

type AspectRatio = "auto" | "3:4" | "1:1" | "4:3";
type GenerateMode = "prompt" | "consistent";
type UploadVariant = "styled" | "lineart";

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

function buildPromptGeneratorPrompt(prompt: string, style: StyleId) {
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
  variant: UploadVariant = "styled",
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

    const processedBuffer =
      variant === "lineart"
        ? await sharp
            .default(buffer)
            .resize({ width: 1400, height: 1400, fit: "inside" })
            .flatten({ background: "#ffffff" })
            .grayscale()
            .normalise()
            .threshold(215, { grayscale: true })
            .png({ compressionLevel: 9, palette: true })
            .toBuffer()
        : await sharp
            .default(buffer)
            .resize({ width: 1400, height: 1400, fit: "inside" })
            .jpeg({ quality: 84, progressive: true })
            .toBuffer();

    const file = new File([processedBuffer], filename, {
      type: variant === "lineart" ? "image/png" : "image/jpeg",
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
  const errorMessage = detail ? `${baseMessage} | detail: ${detail}` : baseMessage;

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
  styledUrl: string,
  lineartUrl: string,
) {
  await prisma.imageJob.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      inputUrl: null,
      cartoonUrl: styledUrl,
      lineartUrl,
      errorMessage: null,
    },
  });
}

async function processPromptJob(
  jobId: string,
  prompt: string,
  style: StyleId,
  aspectRatio: AspectRatio,
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
        aspect_ratio: aspectRatio,
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

    const styledUrl = await fetchAndUploadToUploadThing(
      generatedImageUrl,
      `styled-${jobId}.jpg`,
    );
    if (!styledUrl)
      throw new Error("Failed to upload styled image to UploadThing");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      "lineart",
    );
    if (!lineartUrl)
      throw new Error("Failed to upload lineart image to UploadThing");

    await updateJobDone(jobId, styledUrl, lineartUrl);
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

    const styledUrl = await fetchAndUploadToUploadThing(
      styledImageUrl,
      `styled-${jobId}.jpg`,
    );
    if (!styledUrl)
      throw new Error("Failed to upload styled image to UploadThing");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      "lineart",
    );
    if (!lineartUrl)
      throw new Error("Failed to upload lineart image to UploadThing");

    await updateJobDone(jobId, styledUrl, lineartUrl);
  } catch (error) {
    console.error(`Error processing consistent job ${jobId}:`, error);
    await updateJobFailed(jobId, error);
  }
}

async function uploadReferenceFileToFalStorage(file: File): Promise<string> {
  return fal.storage.upload(file);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "FAL_API_KEY not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const mode = ((formData.get("mode") as string) || "prompt") as GenerateMode;
    const prompt = (formData.get("prompt") as string)?.trim();
    const style = ((formData.get("style") as string) || "FAST") as StyleId;
    const aspectRatioRaw = ((formData.get("aspectRatio") as string) ||
      "auto") as AspectRatio;

    if (!prompt || prompt.length < 12) {
      return NextResponse.json(
        { error: "Prompt is too short" },
        { status: 400 },
      );
    }

    if (!BASE_STYLES[style]) {
      return NextResponse.json(
        { error: "Invalid style selected" },
        { status: 400 },
      );
    }

    if (!ASPECT_RATIOS.has(aspectRatioRaw)) {
      return NextResponse.json(
        { error: "Invalid aspect ratio" },
        { status: 400 },
      );
    }

    if (mode !== "prompt" && mode !== "consistent") {
      return NextResponse.json(
        { error: "Invalid generation mode" },
        { status: 400 },
      );
    }

    const aspectRatio = aspectRatioRaw as AspectRatio;
    let referenceImageUrl: string | null = null;

    if (mode === "consistent") {
      const referenceJobId =
        (formData.get("referenceJobId") as string | null)?.trim() || null;
      if (referenceJobId) {
        const referenceJob = await prisma.imageJob.findFirst({
          where: {
            id: referenceJobId,
            userId: user.id,
            status: "DONE",
          },
          select: {
            cartoonUrl: true,
            lineartUrl: true,
          },
        });

        referenceImageUrl =
          referenceJob?.cartoonUrl || referenceJob?.lineartUrl || null;
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

        referenceImageUrl = await uploadReferenceFileToFalStorage(referenceImage);
      }
    }

    const job = await prisma.imageJob.create({
      data: {
        userId: user.id,
        inputFileName:
          mode === "consistent"
            ? `consistent-character-${Date.now()}.png`
            : `ai-generator-${Date.now()}.png`,
        inputUrl: null,
        status: "QUEUED",
      },
    });

    if (mode === "consistent") {
      process.nextTick(() => {
        processConsistentJob(
          job.id,
          prompt,
          style,
          referenceImageUrl as string,
        );
      });
    } else {
      process.nextTick(() => {
        processPromptJob(job.id, prompt, style, aspectRatio);
      });
    }

    return NextResponse.json({
      jobId: job.id,
      message: "Job created successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
