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
    const { input_task_id, text_style_prompt, ai_model, enable_pbr } = body;

    if (!input_task_id) {
      return NextResponse.json(
        { message: "Input task ID is required" },
        { status: 400 }
      );
    }

    const creditsNeeded = 12;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    const meshy = getMeshyClient();
    const result = await meshy.createRetexture({
      input_task_id,
      text_style_prompt: text_style_prompt || undefined,
      ai_model: ai_model || "latest",
      enable_pbr: enable_pbr || false,
    });

    const meshyTaskId = result.result;

    await db.generation.create({
      data: {
        userId,
        meshyTaskId,
        meshyTaskType: "RETEXTURE",
        status: "PENDING",
        prompt: text_style_prompt || "Retexture",
        aiModel: ai_model || "latest",
        enablePbr: enable_pbr || false,
        creditsUsed: creditsNeeded,
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
        description: `Retexture: ${text_style_prompt?.substring(0, 30) || "style change"}`,
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Retexture error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
