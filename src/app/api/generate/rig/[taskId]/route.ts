import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMeshyClient } from "@/lib/meshy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const rigging = await db.rigging.findFirst({
      where: { meshyTaskId: taskId },
      include: {
        generation: {
          select: { userId: true },
        },
      },
    });

    if (!rigging || rigging.generation.userId !== userId) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (rigging.status === "SUCCEEDED" || rigging.status === "FAILED") {
      return NextResponse.json({
        id: rigging.meshyTaskId,
        status: rigging.status,
        progress: 100,
        model_url: rigging.modelUrl,
      });
    }

    const meshy = getMeshyClient();
    const task = await meshy.getRiggingTask(taskId);

    await db.rigging.update({
      where: { id: rigging.id },
      data: {
        status: task.status,
        modelUrl: task.model_urls?.glb || task.model_urls?.fbx || undefined,
        finishedAt: task.status === "SUCCEEDED" ? new Date() : undefined,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Get Rigging task error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
