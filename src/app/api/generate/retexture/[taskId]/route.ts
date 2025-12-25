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

    const generation = await db.generation.findFirst({
      where: { meshyTaskId: taskId, userId },
    });

    if (!generation) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (generation.status === "SUCCEEDED" || generation.status === "FAILED") {
      return NextResponse.json({
        id: generation.meshyTaskId,
        status: generation.status,
        progress: generation.progress,
        model_urls: generation.modelUrls,
        thumbnail_url: generation.thumbnailUrl,
      });
    }

    const meshy = getMeshyClient();
    const task = await meshy.getRetextureTask(taskId);

    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: task.status,
        progress: task.progress,
        modelUrls: task.model_urls || undefined,
        thumbnailUrl: task.thumbnail_url || undefined,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Get Retexture task error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
