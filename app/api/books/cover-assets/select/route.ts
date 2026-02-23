import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

async function uploadWebpToUploadThing(
  imageUrl: string,
  fileName: string,
): Promise<string | null> {
  try {
    const { UTApi } = await import("uploadthing/server");
    const sharp = await import("sharp");

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.status}`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    const webpBuffer = await sharp.default(sourceBuffer)
      .webp({ quality: 90 })
      .toBuffer();

    const file = new File([webpBuffer], fileName, {
      type: "image/webp",
    });

    const utapi = new UTApi();
    const upload = await utapi.uploadFiles(file);
    if (upload.error) {
      throw new Error(upload.error.message);
    }

    return upload.data.url;
  } catch (error) {
    console.error("Selected cover upload failed:", error);
    return null;
  }
}

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
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

    const payload = await req.json().catch(() => null);
    const imageUrl =
      typeof payload?.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const target =
      typeof payload?.target === "string" ? payload.target.trim() : "cover";

    if (!imageUrl) {
      return Response.json({ error: "Missing image URL." }, { status: 400 });
    }

    try {
      new URL(imageUrl);
    } catch {
      return Response.json({ error: "Invalid image URL." }, { status: 400 });
    }

    const timestamp = Date.now();
    const fileName = `book-${target || "cover"}-${timestamp}.webp`;
    const uploadedUrl = await uploadWebpToUploadThing(imageUrl, fileName);

    if (!uploadedUrl) {
      throw new Error("Failed to upload selected cover.");
    }

    const job = await prisma.imageJob.create({
      data: {
        userId,
        inputFileName: fileName,
        inputUrl: null,
        cartoonUrl: uploadedUrl,
        lineartUrl: uploadedUrl,
        isPublic: false,
        isUpscaled: false,
        status: "DONE",
      },
      select: {
        id: true,
        inputFileName: true,
        lineartUrl: true,
      },
    });

    return Response.json({
      asset: {
        id: job.id,
        url: job.lineartUrl as string,
        name: job.inputFileName,
      },
    });
  } catch (error) {
    console.error("Saving selected cover failed:", error);
    return Response.json(
      { error: "Failed to save selected cover option." },
      { status: 500 },
    );
  }
});
