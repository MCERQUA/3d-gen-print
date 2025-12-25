import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log("Proxy: Unauthorized - no userId");
      return NextResponse.json(
        { message: "Unauthorized - Please sign in to view 3D models" },
        { status: 401, headers: corsHeaders }
      );
    }

    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { message: "URL is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Only allow Meshy asset URLs
    if (!url.startsWith("https://assets.meshy.ai/")) {
      console.log("Proxy: Invalid URL -", url);
      return NextResponse.json(
        { message: "Invalid URL - only Meshy assets allowed" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Proxy: Fetching model for user", userId, "-", url);

    // Fetch the model from Meshy
    const response = await fetch(url, {
      headers: {
        "Accept": "*/*",
      },
    });

    if (!response.ok) {
      console.log("Proxy: Meshy fetch failed -", response.status);
      return NextResponse.json(
        { message: `Failed to fetch model from Meshy (${response.status})` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const contentType = response.headers.get("content-type") || "model/gltf-binary";
    const buffer = await response.arrayBuffer();

    console.log("Proxy: Success - size:", buffer.byteLength, "bytes");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Proxy failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
