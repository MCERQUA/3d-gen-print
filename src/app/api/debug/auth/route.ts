import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId, sessionId } = await auth();

    return NextResponse.json({
      authenticated: !!userId,
      userId: userId ? userId.slice(0, 8) + "..." : null,
      sessionId: sessionId ? sessionId.slice(0, 8) + "..." : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
