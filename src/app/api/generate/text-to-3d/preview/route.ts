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
    const { prompt, art_style, ai_model, topology, target_polycount, symmetry_mode } = body;

    if (!prompt || prompt.length > 600) {
      return NextResponse.json(
        { message: "Prompt is required and must be 600 characters or less" },
        { status: 400 }
      );
    }

    // Calculate credits needed
    const creditsNeeded = ai_model === "latest" ? 25 : 7;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    // Create Meshy task
    const meshy = getMeshyClient();
    const result = await meshy.createTextTo3DPreview({
      prompt,
      art_style: art_style || "realistic",
      ai_model: ai_model || "latest",
      topology: topology || "triangle",
      target_polycount: target_polycount || 30000,
      symmetry_mode: symmetry_mode || "auto",
    });

    const meshyTaskId = result.result;

    // Create generation record
    await db.generation.create({
      data: {
        userId,
        meshyTaskId,
        meshyTaskType: "TEXT_TO_3D_PREVIEW",
        status: "PENDING",
        prompt,
        aiModel: ai_model || "latest",
        artStyle: art_style || "realistic",
        topology: topology || "triangle",
        targetPolycount: target_polycount || 30000,
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
        description: `Text-to-3D Preview: ${prompt.substring(0, 50)}...`,
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Text-to-3D preview error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
