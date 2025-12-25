"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ModelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Model page error:", error);
  }, [error]);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-2">
          The 3D viewer encountered an error on this device.
        </p>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Error: {error.message || "Unknown error"}
        </p>
        <div className="flex gap-4">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/gallery">Back to Gallery</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
