import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    // Only allow Meshy asset URLs
    if (!url.startsWith("https://assets.meshy.ai/")) {
      return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
    }

    // Fetch the model from Meshy
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to fetch model" },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "model/gltf-binary";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Proxy failed" },
      { status: 500 }
    );
  }
}
