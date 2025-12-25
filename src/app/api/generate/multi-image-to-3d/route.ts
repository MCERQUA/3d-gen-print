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
    const { images, ai_model, enable_pbr } = body;

    if (!images || images.length < 2 || images.length > 4) {
      return NextResponse.json(
        { message: "Please provide 2-4 images" },
        { status: 400 }
      );
    }

    const creditsNeeded = ai_model === "latest" ? 25 : 7;

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { message: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}` },
        { status: 402 }
      );
    }

    // Convert to data URLs
    const imageUrls = images.map((img: string) => `data:image/png;base64,${img}`);

    const meshy = getMeshyClient();
    const result = await meshy.createMultiImageTo3D({
      image_urls: imageUrls,
      ai_model: ai_model || "latest",
      should_texture: true,
      enable_pbr: enable_pbr || false,
    });

    const meshyTaskId = result.result;

    await db.generation.create({
      data: {
        userId,
        meshyTaskId,
        meshyTaskType: "MULTI_IMAGE_TO_3D",
        status: "PENDING",
        prompt: "Multi-Image to 3D conversion",
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
        description: "Multi-Image-to-3D Generation",
        meshyTaskId,
      },
    });

    return NextResponse.json({ taskId: meshyTaskId });
  } catch (error) {
    console.error("Multi-Image-to-3D error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
