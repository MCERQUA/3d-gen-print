import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const orders = await db.printOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        generation: {
          select: {
            thumbnailUrl: true,
            prompt: true,
          },
        },
      },
    });

    return NextResponse.json(
      orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        material: order.material,
        size: order.size,
        quantity: order.quantity,
        total: order.total,
        thumbnailUrl: order.generation.thumbnailUrl,
        prompt: order.generation.prompt,
        createdAt: order.createdAt,
        trackingNumber: order.trackingNumber,
      }))
    );
  } catch (error) {
    console.error("List orders error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
