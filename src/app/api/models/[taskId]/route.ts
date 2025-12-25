import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
      return NextResponse.json({ message: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: generation.id,
      meshyTaskId: generation.meshyTaskId,
      status: generation.status,
      prompt: generation.prompt,
      progress: generation.progress,
      modelUrls: generation.modelUrls,
      textureUrls: generation.textureUrls,
      thumbnailUrl: generation.thumbnailUrl,
      artStyle: generation.artStyle,
      aiModel: generation.aiModel,
      topology: generation.topology,
      targetPolycount: generation.targetPolycount,
      createdAt: generation.createdAt,
      finishedAt: generation.finishedAt,
    });
  } catch (error) {
    console.error("Get model error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
