import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMeshyClient } from "@/lib/meshy";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get user and check credits
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { preview_task_id, enable_pbr, texture_prompt, ai_model } = body;

    if (!preview_task_id) {
      return NextResponse.json(
        { message: "Preview task ID is required" },
        { status: 400 }
      );
    }

    // Verify the preview task exists and belongs to user
    const previewGeneration = await db.generation.findFirst({
      where: {
        meshyTaskId: preview_task_id,
        userId,
        meshyTaskType: "TEXT_TO_3D_PREVIEW",
        status: "SUCCEEDED",
      },
    });

    if (!previewGeneration) {
      return NextResponse.json(
        { message: "Preview task not found or not completed" },
        { status: 404 }
      );
    }

    // Credits for refine
    const creditsNeeded = 12;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    // Create Meshy refine task
    const meshy = getMeshyClient();
    const result = await meshy.createTextTo3DRefine({
      preview_task_id,
      enable_pbr: enable_pbr || false,
      texture_prompt,
      ai_model: ai_model || "latest",
    });

    const meshyTaskId = result.result;

    // Create generation record
    await db.generation.create({
      data: {
        userId,
        meshyTaskId,
        meshyTaskType: "TEXT_TO_3D_REFINE",
        status: "PENDING",
        prompt: previewGeneration.prompt,
        aiModel: ai_model || "latest",
        enablePbr: enable_pbr || false,
        refinedFromId: previewGeneration.id,
        creditsUsed: creditsNeeded,
      },
    });

    // Deduct credits
    await db.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditsNeeded } },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId,
        type: "GENERATION",
        amount: -creditsNeeded,
        description: `Text-to-3D Refine: ${previewGeneration.prompt?.substring(0, 50)}...`,
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Text-to-3D refine error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
