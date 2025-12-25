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

    // Get the generation record
    const generation = await db.generation.findFirst({
      where: {
        meshyTaskId: taskId,
        userId,
      },
    });

    if (!generation) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    // If already succeeded or failed, return cached data
    if (generation.status === "SUCCEEDED" || generation.status === "FAILED") {
      return NextResponse.json({
        id: generation.meshyTaskId,
        status: generation.status,
        progress: generation.progress,
        model_urls: generation.modelUrls,
        texture_urls: generation.textureUrls,
        thumbnail_url: generation.thumbnailUrl,
        task_error: generation.status === "FAILED" ? { message: "Generation failed" } : null,
      });
    }

    // Fetch latest status from Meshy
    const meshy = getMeshyClient();
    const task = await meshy.getImageTo3DTask(taskId);

    // Update our database
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: task.status,
        progress: task.progress,
        modelUrls: task.model_urls || undefined,
        textureUrls: task.texture_urls || undefined,
        thumbnailUrl: task.thumbnail_url || undefined,
        startedAt: task.started_at ? new Date(task.started_at) : undefined,
        finishedAt: task.finished_at ? new Date(task.finished_at) : undefined,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Get Image-to-3D task error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
