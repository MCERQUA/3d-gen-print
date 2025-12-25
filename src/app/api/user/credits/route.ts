import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get or create user
    let user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    // If user doesn't exist, create them with bonus credits
    if (!user) {
      user = await db.user.create({
        data: {
          id: userId,
          email: "", // Will be updated by webhook
          credits: 25, // Bonus credits for new users
        },
        select: { credits: true },
      });
    }

    return NextResponse.json({ credits: user.credits });
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
