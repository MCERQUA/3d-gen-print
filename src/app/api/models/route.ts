import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get all generations for the user, ordered by creation date
    const generations = await db.generation.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        meshyTaskId: true,
        meshyTaskType: true,
        status: true,
        prompt: true,
        progress: true,
        thumbnailUrl: true,
        artStyle: true,
        aiModel: true,
        createdAt: true,
      },
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error("List models error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
