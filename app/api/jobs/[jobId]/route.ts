import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  jobId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { jobId } = params;

    // Fetch the job from database
    const job = await prisma.imageJob.findFirst({
      where: {
        id: jobId,
        userId: user.id, // Ensure user can only access their own jobs
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Return the job data
    return NextResponse.json({
      id: job.id,
      status: job.status,
      inputFileName: job.inputFileName,
      cartoonUrl: job.cartoonUrl,
      lineartUrl: job.lineartUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      // Add current stage based on status
      currentStage: job.status === "PROCESSING" ? "cartoon" : undefined,
      progress: job.status === "QUEUED" ? 10 : 
                job.status === "PROCESSING" ? 50 : 
                job.status === "DONE" ? 100 : 0,
    });

  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update job status (for admin or background workers)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { jobId } = params;
    const body = await request.json();

    // Validate the job belongs to the user (or user is admin)
    const job = await prisma.imageJob.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Update the job
    const updatedJob = await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.cartoonUrl && { cartoonUrl: body.cartoonUrl }),
        ...(body.lineartUrl && { lineartUrl: body.lineartUrl }),
        ...(body.errorMessage && { errorMessage: body.errorMessage }),
      },
    });

    return NextResponse.json({
      id: updatedJob.id,
      status: updatedJob.status,
      inputFileName: updatedJob.inputFileName,
      cartoonUrl: updatedJob.cartoonUrl,
      lineartUrl: updatedJob.lineartUrl,
      errorMessage: updatedJob.errorMessage,
      createdAt: updatedJob.createdAt.toISOString(),
      updatedAt: updatedJob.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 