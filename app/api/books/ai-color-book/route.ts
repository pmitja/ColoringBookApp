import { auth } from "@/auth";
import { fal } from "@fal-ai/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

const GENERATOR_MODEL = "xai/grok-imagine-image";
const MIN_PROMPT_LENGTH = 12;
const DEFAULT_PAGE_COUNT = 10;
const MIN_PAGE_COUNT = 1;
const MAX_PAGE_COUNT = 40;
const PAPER_FORMATS = ["A3", "A4", "A5"] as const;
const DEFAULT_PAPER_FORMAT = "A4";
const STYLE_PRESETS = [
  "CLASSIC",
  "PLAYFUL_ROUNDED",
  "BOLD_SIMPLE",
  "DETAILED_COZY",
  "WHIMSICAL",
] as const;
const DEFAULT_STYLE_PRESET = "CLASSIC";
// A-series paper uses ~1:sqrt(2). `4:3` is the closest supported landscape
// Grok ratio to the editor canvas (420x297).
const GROK_A_SERIES_ASPECT_RATIO = "4:3";

// Use oversized dimensions so the editor's re-clamp effect snaps generated
// assets to the current page size (which is viewport-scaled in the client).
const AUTO_CLAMP_IMAGE_BOX_WIDTH = 4096;
const AUTO_CLAMP_IMAGE_BOX_HEIGHT = 2896; // ~sqrt(2) landscape ratio

const LINEART_REQUIREMENTS_NO_TEXT = [
  "Create printable children's coloring-book line art.",
  "Use black outlines on pure white background only.",
  "No grayscale shading, no hatching, no crosshatching, no texture fill.",
  "No text, letters, numbers, logos, borders, or watermarks.",
].join(" ");

const LINEART_REQUIREMENTS_WITH_TITLE = [
  "Create printable children's coloring-book line art.",
  "Use black outlines on pure white background only.",
  "No grayscale shading, no hatching, no crosshatching, no texture fill.",
  "Render only the requested book title text. No other text, logos, borders, or watermarks.",
].join(" ");

const COLOR_FRONT_COVER_REQUIREMENTS = [
  "Create a full-color commercial-style children's coloring book front cover illustration (not black-and-white line art).",
  "Use a cute, cozy, kid-friendly look with clean outlines and appealing colors.",
  "Use a soft pastel palette with warm contrast and a polished print-ready cover feel.",
  "Keep the composition readable and cover-like with a strong focal scene.",
  "No watermarks or logos.",
].join(" ");

const COLOR_BACK_COVER_REQUIREMENTS = [
  "Create a full-color children's coloring book back cover design (not black-and-white line art only).",
  "Use a soft pastel background and cute decorative accents that match the front cover style.",
  "Include several framed mini preview panels that can be simple black line-art previews on white cards.",
  "Leave a clean open area near the bottom-right for barcode/ISBN placement.",
  "No watermarks or logos.",
].join(" ");

type AIColorBookStatus = "PROCESSING" | "DONE" | "FAILED";
type CoverRole = "front" | "back";
type AssetRole = "front" | "interior" | "back";
type PaperFormat = (typeof PAPER_FORMATS)[number];
type StylePreset = (typeof STYLE_PRESETS)[number];

interface AIColorBookMeta {
  status: AIColorBookStatus;
  prompt: string;
  paperFormat: PaperFormat;
  aspectRatio: string;
  stylePreset: StylePreset;
  requestedPageCount: number;
  totalAssets: number;
  completedAssets: number;
  currentStep: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

interface BookImageData {
  id: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
  rotation: number;
  objectPosX: number;
  objectPosY: number;
  coverRole?: CoverRole;
}

type BookElement = {
  type: "image";
  data: BookImageData;
};

interface BookPage {
  id: string;
  elements: BookElement[];
}

interface BookData {
  title: string;
  pages: BookPage[];
  meta: {
    aiColorBook: AIColorBookMeta;
  };
}

interface GeneratedAsset {
  role: AssetRole;
  index: number;
  jobId: string;
}

interface ProcessColorBookParams {
  userId: string;
  bookId: string;
  title: string;
  prompt: string;
  pageCount: number;
  paperFormat: PaperFormat;
  aspectRatio: string;
  stylePreset: StylePreset;
}

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

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampPageCount(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PAGE_COUNT;
  }

  return Math.max(
    MIN_PAGE_COUNT,
    Math.min(MAX_PAGE_COUNT, Math.round(numericValue)),
  );
}

function normalizePrompt(value: unknown) {
  if (typeof value !== "string") return null;
  const prompt = value.trim();
  if (prompt.length < MIN_PROMPT_LENGTH) return null;
  return prompt;
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (!title) return null;
  return title.slice(0, 120);
}

function normalizePaperFormat(value: unknown): PaperFormat {
  if (typeof value !== "string") return DEFAULT_PAPER_FORMAT;

  const upper = value.trim().toUpperCase();
  if ((PAPER_FORMATS as readonly string[]).includes(upper)) {
    return upper as PaperFormat;
  }

  return DEFAULT_PAPER_FORMAT;
}

function getAspectRatioForPaperFormat(_paperFormat: PaperFormat) {
  return GROK_A_SERIES_ASPECT_RATIO;
}

function normalizeStylePreset(value: unknown): StylePreset {
  if (typeof value !== "string") return DEFAULT_STYLE_PRESET;

  const upper = value.trim().toUpperCase();
  if ((STYLE_PRESETS as readonly string[]).includes(upper)) {
    return upper as StylePreset;
  }

  return DEFAULT_STYLE_PRESET;
}

function buildStyleLock(stylePreset: StylePreset) {
  const styleDescription: Record<StylePreset, string> = {
    CLASSIC:
      "Classic children's coloring-book line art with clean medium outlines, balanced detail, simple readable faces, and clear subject separation.",
    PLAYFUL_ROUNDED:
      "Playful rounded line art with soft curved shapes, friendly expressions, smoother contours, and medium-thick outlines.",
    BOLD_SIMPLE:
      "Bold simple line art with thick outlines, larger shapes, minimal small details, and very clear silhouettes for younger kids.",
    DETAILED_COZY:
      "Detailed cozy line art with clean fine-to-medium outlines, richer scene details, layered props, and warm homey compositions while staying uncluttered.",
    WHIMSICAL:
      "Whimsical storybook line art with expressive characters, playful proportions, decorative but clean details, and gentle imaginative scene composition.",
  };

  return [
    "BOOK-WIDE STYLE LOCK (must remain consistent across front cover, every interior page, and back cover):",
    styleDescription[stylePreset],
    "Keep the same line thickness behavior, character face style, shape language, detail density, and composition complexity across all assets in this book.",
    "Do not switch to a different drawing style or realism level on any page.",
  ].join("\n");
}

function buildTitleFromPrompt(prompt: string) {
  const words = prompt.replace(/\s+/g, " ").trim().split(" ").slice(0, 6);

  if (words.length === 0) return "AI Coloring Book";

  const title = words
    .map((word) => {
      if (!word.length) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return title.slice(0, 120);
}

function buildInteriorPagePrompt(
  prompt: string,
  stylePreset: StylePreset,
  pageIndex: number,
  pageCount: number,
) {
  return [
    `Theme prompt: ${prompt}`,
    buildStyleLock(stylePreset),
    `Generate interior coloring-book page ${pageIndex} of ${pageCount}. Keep this page clearly different from other pages while staying in the same theme.`,
    "Compose one clear scene with readable main subjects and enough open areas for coloring.",
    LINEART_REQUIREMENTS_NO_TEXT,
  ].join("\n\n");
}

function buildFrontCoverPrompt(
  prompt: string,
  title: string,
  stylePreset: StylePreset,
) {
  return [
    `Theme prompt: ${prompt}`,
    buildStyleLock(stylePreset),
    `Book title text to render exactly: "${title}"`,
    "Generate a front cover illustration for a children's coloring book.",
    "Create a friendly central composition that looks like a cover.",
    "Render the title text clearly and legibly near the top of the cover in large lettering.",
    "Make the title readable with high contrast, clean spacing, and clear outline/shape separation.",
    "Do not imitate any specific existing published cover. Create an original design only.",
    COLOR_FRONT_COVER_REQUIREMENTS,
  ].join("\n\n");
}

function buildBackCoverPrompt(prompt: string, stylePreset: StylePreset) {
  return [
    `Theme prompt: ${prompt}`,
    buildStyleLock(stylePreset),
    "Generate a back cover illustration for the same children's coloring book.",
    "Keep composition simpler than the front cover while still feeling polished and colorful.",
    "Do not render text except tiny placeholder-like barcode-safe empty area (leave area blank instead of text).",
    "Do not imitate any specific existing published back cover. Create an original design only.",
    COLOR_BACK_COVER_REQUIREMENTS,
  ].join("\n\n");
}

function createImageElement({
  assetId,
  x,
  y,
  width,
  height,
  fit,
  coverRole,
}: {
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
  coverRole?: CoverRole;
}): BookElement {
  return {
    type: "image",
    data: {
      id: createId("img"),
      assetId,
      x,
      y,
      width,
      height,
      fit,
      rotation: 0,
      objectPosX: 50,
      objectPosY: 50,
      ...(coverRole ? { coverRole } : {}),
    },
  };
}

function createFrontCoverPage(assetId: string): BookPage {
  return {
    id: createId("page"),
    elements: [
      createImageElement({
        assetId,
        x: 0,
        y: 0,
        width: AUTO_CLAMP_IMAGE_BOX_WIDTH,
        height: AUTO_CLAMP_IMAGE_BOX_HEIGHT,
        fit: "cover",
        coverRole: "front",
      }),
    ],
  };
}

function createBackCoverPage(assetId: string): BookPage {
  return {
    id: createId("page"),
    elements: [
      createImageElement({
        assetId,
        x: 0,
        y: 0,
        width: AUTO_CLAMP_IMAGE_BOX_WIDTH,
        height: AUTO_CLAMP_IMAGE_BOX_HEIGHT,
        fit: "cover",
        coverRole: "back",
      }),
    ],
  };
}

function createInteriorPage(assetId: string): BookPage {
  return {
    id: createId("page"),
    elements: [
      createImageElement({
        assetId,
        x: 0,
        y: 0,
        width: AUTO_CLAMP_IMAGE_BOX_WIDTH,
        height: AUTO_CLAMP_IMAGE_BOX_HEIGHT,
        fit: "contain",
      }),
    ],
  };
}

function createBookData(
  title: string,
  meta: AIColorBookMeta,
  pages: BookPage[],
) {
  return {
    title,
    pages,
    meta: {
      aiColorBook: meta,
    },
  } satisfies BookData;
}

function toBookJson(data: BookData): Prisma.InputJsonValue {
  return data as unknown as Prisma.InputJsonValue;
}

function buildPagesFromAssets(assets: GeneratedAsset[]) {
  const front = assets.find((asset) => asset.role === "front");
  const back = assets.find((asset) => asset.role === "back");
  const interiorPages = assets
    .filter((asset) => asset.role === "interior")
    .sort((a, b) => a.index - b.index);

  const pages: BookPage[] = [];

  if (front) {
    pages.push(createFrontCoverPage(front.jobId));
  }

  for (const interior of interiorPages) {
    pages.push(createInteriorPage(interior.jobId));
  }

  if (back) {
    pages.push(createBackCoverPage(back.jobId));
  }

  if (pages.length === 0) {
    pages.push({
      id: createId("page"),
      elements: [],
    });
  }

  return pages;
}

async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: string,
): Promise<string> {
  const result = await fal.subscribe(GENERATOR_MODEL, {
    input: {
      prompt,
      num_images: 1,
      output_format: "png",
      aspect_ratio: aspectRatio,
    } as any,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log(
          "AI color book generation:",
          update.logs?.map((log) => log.message).join("\n"),
        );
      }
    },
  });

  const url = result.data?.images?.[0]?.url;
  if (!url) {
    throw new Error("No image returned from image model.");
  }

  return url;
}

async function uploadLineartToUploadThing(
  imageUrl: string,
  fileName: string,
): Promise<string> {
  const { UTApi } = await import("uploadthing/server");
  const sharp = await import("sharp");

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const processedBuffer = await sharp
    .default(sourceBuffer)
    .resize({
      width: 1800,
      height: 1800,
      fit: "inside",
    })
    .flatten({ background: "#ffffff" })
    .grayscale()
    .normalise()
    .threshold(215, { grayscale: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  const file = new File([processedBuffer], fileName, {
    type: "image/png",
  });

  const utapi = new UTApi();
  const upload = await utapi.uploadFiles(file);
  if (upload.error) {
    throw new Error(upload.error.message);
  }

  return upload.data.url;
}

async function uploadColorImageToUploadThing(
  imageUrl: string,
  fileName: string,
): Promise<string> {
  const { UTApi } = await import("uploadthing/server");
  const sharp = await import("sharp");

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const processedBuffer = await sharp
    .default(sourceBuffer)
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const file = new File([processedBuffer], fileName, {
    type: "image/png",
  });

  const utapi = new UTApi();
  const upload = await utapi.uploadFiles(file);
  if (upload.error) {
    throw new Error(upload.error.message);
  }

  return upload.data.url;
}

async function createDoneImageJob(
  userId: string,
  fileName: string,
  urls: {
    lineartUrl: string | null;
    cartoonUrl: string | null;
  },
) {
  return prisma.imageJob.create({
    data: {
      userId,
      inputFileName: fileName,
      inputUrl: null,
      cartoonUrl: urls.cartoonUrl,
      lineartUrl: urls.lineartUrl,
      isPublic: false,
      isUpscaled: false,
      status: "DONE",
      errorMessage: null,
    },
    select: {
      id: true,
    },
  });
}

async function processAIColorBookGeneration(params: ProcessColorBookParams) {
  const {
    userId,
    bookId,
    title,
    prompt,
    pageCount,
    paperFormat,
    aspectRatio,
    stylePreset,
  } = params;
  const totalAssets = pageCount + 2;
  const startedAt = new Date().toISOString();

  let meta: AIColorBookMeta = {
    status: "PROCESSING",
    prompt,
    paperFormat,
    aspectRatio,
    stylePreset,
    requestedPageCount: pageCount,
    totalAssets,
    completedAssets: 0,
    currentStep: "Generation started",
    startedAt,
  };

  let bookData = createBookData(title, meta, []);
  const generatedAssets: GeneratedAsset[] = [];

  const persistProgress = async (step: string) => {
    meta = {
      ...meta,
      currentStep: step,
    };

    bookData = createBookData(
      title,
      meta,
      buildPagesFromAssets(generatedAssets),
    );
    await prisma.book.update({
      where: { id: bookId },
      data: {
        title,
        data: toBookJson(bookData),
      },
    });
  };

  const createAndTrackAsset = async (
    imagePrompt: string,
    fileName: string,
    role: AssetRole,
    index: number,
    progressStep: string,
  ) => {
    const generatedUrl = await generateImageFromPrompt(imagePrompt, aspectRatio);
    const isCoverAsset = role === "front" || role === "back";
    const uploadedUrl = isCoverAsset
      ? await uploadColorImageToUploadThing(generatedUrl, fileName)
      : await uploadLineartToUploadThing(generatedUrl, fileName);
    const job = await createDoneImageJob(userId, fileName, {
      // Keep `lineartUrl` populated for editor asset loading compatibility.
      lineartUrl: uploadedUrl,
      cartoonUrl: isCoverAsset ? uploadedUrl : null,
    });

    generatedAssets.push({
      role,
      index,
      jobId: job.id,
    });

    meta = {
      ...meta,
      completedAssets: meta.completedAssets + 1,
      currentStep: progressStep,
    };
    bookData = createBookData(
      title,
      meta,
      buildPagesFromAssets(generatedAssets),
    );

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title,
        data: toBookJson(bookData),
      },
    });
  };

  try {
    await persistProgress("Generating front cover");
    await createAndTrackAsset(
      buildFrontCoverPrompt(prompt, title, stylePreset),
      `ai-color-book-front-cover-${Date.now()}.png`,
      "front",
      0,
      "Front cover generated",
    );

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      await persistProgress(
        `Generating interior page ${pageIndex}/${pageCount}`,
      );
      await createAndTrackAsset(
        buildInteriorPagePrompt(prompt, stylePreset, pageIndex, pageCount),
        `ai-color-book-page-${Date.now()}-${pageIndex}.png`,
        "interior",
        pageIndex,
        `Interior page ${pageIndex}/${pageCount} generated`,
      );
    }

    await persistProgress("Generating back cover");
    await createAndTrackAsset(
      buildBackCoverPrompt(prompt, stylePreset),
      `ai-color-book-back-cover-${Date.now()}.png`,
      "back",
      pageCount + 1,
      "Back cover generated",
    );

    const pages = buildPagesFromAssets(generatedAssets);

    meta = {
      ...meta,
      status: "DONE",
      completedAssets: totalAssets,
      currentStep: "Book generation completed",
      finishedAt: new Date().toISOString(),
      error: undefined,
    };

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title,
        data: toBookJson(createBookData(title, meta, pages)),
      },
    });
  } catch (error) {
    const detail = getFalErrorDetails(error);
    const baseMessage =
      error instanceof Error ? error.message : "Unknown generation error";
    const errorMessage = detail
      ? `${baseMessage} | detail: ${detail}`
      : baseMessage;

    console.error(`AI color book generation failed for ${bookId}:`, error);
    if (detail) {
      console.error(`FAL validation details for book ${bookId}:`, detail);
    }

    meta = {
      ...meta,
      status: "FAILED",
      currentStep: "Generation failed",
      finishedAt: new Date().toISOString(),
      error: errorMessage,
    };

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title,
        data: toBookJson(
          createBookData(title, meta, buildPagesFromAssets(generatedAssets)),
        ),
      },
    });
  }
}

if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });
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
    const payload = await req.json().catch(() => null);
    const prompt = normalizePrompt(payload?.prompt);
    if (!prompt) {
      return Response.json(
        {
          error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    const pageCount = clampPageCount(payload?.pageCount);
    const paperFormat = normalizePaperFormat(payload?.paperFormat);
    const aspectRatio = getAspectRatioForPaperFormat(paperFormat);
    const stylePreset = normalizeStylePreset(payload?.stylePreset);
    const title =
      normalizeTitle(payload?.title) || buildTitleFromPrompt(prompt);

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

    const isSuperAdmin = dbUser.role === "ADMIN";
    const totalRequiredAssets = pageCount + 2;

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

      if (remainingThisMonth < totalRequiredAssets) {
        return Response.json(
          {
            error:
              remainingThisMonth <= 0
                ? `You have no generations left this month on the ${planLimits.planTitle} plan.`
                : `This book needs ${totalRequiredAssets} generations (front cover + ${pageCount} pages + back cover), but you only have ${remainingThisMonth} left this month.`,
          },
          { status: 403 },
        );
      }
    }

    const initialMeta: AIColorBookMeta = {
      status: "PROCESSING",
      prompt,
      paperFormat,
      aspectRatio,
      stylePreset,
      requestedPageCount: pageCount,
      totalAssets: totalRequiredAssets,
      completedAssets: 0,
      currentStep: "Queued for generation",
      startedAt: new Date().toISOString(),
    };

    const initialData = createBookData(title, initialMeta, []);
    const book = await prisma.book.create({
      data: {
        userId,
        title,
        data: toBookJson(initialData),
      },
      select: {
        id: true,
        data: true,
      },
    });

    process.nextTick(() => {
      void processAIColorBookGeneration({
        userId,
        bookId: book.id,
        title,
        prompt,
        pageCount,
        paperFormat,
        aspectRatio,
        stylePreset,
      });
    });

    return Response.json({
      bookId: book.id,
      data: book.data,
    });
  } catch (error) {
    console.error("AI color book start failed:", error);
    return Response.json(
      { error: "Failed to start AI color book generation." },
      { status: 500 },
    );
  }
});
