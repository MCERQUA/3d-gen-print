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

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { input_task_id, height_meters } = body;

    if (!input_task_id) {
      return NextResponse.json(
        { message: "Input task ID is required" },
        { status: 400 }
      );
    }

    const creditsNeeded = 5;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    // Get the source generation
    const sourceGeneration = await db.generation.findFirst({
      where: { meshyTaskId: input_task_id, userId },
    });

    if (!sourceGeneration) {
      return NextResponse.json(
        { message: "Source model not found" },
        { status: 404 }
      );
    }

    const meshy = getMeshyClient();
    const result = await meshy.createRigging({
      input_task_id,
      height_meters: height_meters || 1.7,
    });

    const meshyTaskId = result.result;

    // Create rigging record
    await db.rigging.create({
      data: {
        generationId: sourceGeneration.id,
        meshyTaskId,
        status: "PENDING",
        heightMeters: height_meters || 1.7,
      },
    });

    await db.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditsNeeded } },
    });

    await db.transaction.create({
      data: {
        userId,
        type: "GENERATION",
        amount: -creditsNeeded,
        description: "Character rigging",
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Rigging error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
