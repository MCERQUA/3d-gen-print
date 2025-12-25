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
    const { input_task_id, topology, target_polycount, target_formats } = body;

    if (!input_task_id) {
      return NextResponse.json(
        { message: "Input task ID is required" },
        { status: 400 }
      );
    }

    const creditsNeeded = 7;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    const meshy = getMeshyClient();
    const result = await meshy.createRemesh({
      input_task_id,
      topology: topology || "triangle",
      target_polycount: target_polycount || 30000,
      target_formats: target_formats || ["glb"],
    });

    const meshyTaskId = result.result;

    await db.generation.create({
      data: {
        userId,
        meshyTaskId,
        meshyTaskType: "REMESH",
        status: "PENDING",
        prompt: "Remesh",
        topology: topology || "triangle",
        targetPolycount: target_polycount || 30000,
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
        description: "Remesh optimization",
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Remesh error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
