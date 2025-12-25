"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Share2, RotateCw } from "lucide-react";

// Dynamic import to avoid SSR issues with Three.js
const ModelViewer = dynamic(
  () => import("@/components/model-viewer").then((mod) => mod.ModelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Loading viewer...</span>
      </div>
    ),
  }
);

interface ModelUrls {
  glb?: string;
  fbx?: string;
  usdz?: string;
  obj?: string;
  mtl?: string;
}

interface Generation {
  id: string;
  meshyTaskId: string;
  status: string;
  prompt: string;
  progress: number;
  modelUrls: ModelUrls | null;
  textureUrls: Record<string, string> | null;
  thumbnailUrl: string | null;
  artStyle: string | null;
  aiModel: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const fetchGeneration = async () => {
      try {
        const response = await fetch(`/api/models/${taskId}`);
        if (!response.ok) throw new Error("Failed to fetch model");
        const data = await response.json();
        setGeneration(data);
      } catch (error) {
        toast.error("Failed to load model");
      } finally {
        setLoading(false);
      }
    };

    fetchGeneration();
  }, [taskId]);

  const handleDownload = async (format: keyof ModelUrls) => {
    if (!generation?.modelUrls?.[format]) return;

    const url = generation.modelUrls[format];
    const link = document.createElement("a");
    link.href = url!;
    link.download = `${generation.prompt?.slice(0, 30) || "model"}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Model not found</h1>
        <p className="text-muted-foreground mb-6">
          This model may have been deleted or you don&apos;t have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const modelUrl = generation.modelUrls?.glb || generation.modelUrls?.fbx;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/gallery">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold line-clamp-1">
            {generation.prompt || "Untitled Model"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={generation.status === "SUCCEEDED" ? "default" : "secondary"}>
              {generation.status}
            </Badge>
            {generation.aiModel && (
              <Badge variant="outline">{generation.aiModel}</Badge>
            )}
            {generation.artStyle && (
              <Badge variant="outline">{generation.artStyle}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="md:col-span-2">
          {modelUrl ? (
            <div className="rounded-lg overflow-hidden border">
              <ModelViewer
                modelUrl={modelUrl}
                className="w-full h-[500px]"
                autoRotate={autoRotate}
              />
            </div>
          ) : (
            <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
              {generation.thumbnailUrl ? (
                <img
                  src={generation.thumbnailUrl}
                  alt={generation.prompt || "Model thumbnail"}
                  className="max-h-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground">
                  {generation.status === "PENDING" || generation.status === "IN_PROGRESS"
                    ? `Generating... ${generation.progress}%`
                    : "No preview available"}
                </span>
              )}
            </div>
          )}

          {/* Viewer Controls */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
            >
              <RotateCw className={`h-4 w-4 mr-2 ${autoRotate ? "animate-spin" : ""}`} />
              {autoRotate ? "Stop Rotation" : "Auto Rotate"}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Download Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {generation.modelUrls?.glb && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDownload("glb")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  GLB Format
                </Button>
              )}
              {generation.modelUrls?.fbx && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDownload("fbx")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  FBX Format
                </Button>
              )}
              {generation.modelUrls?.usdz && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDownload("usdz")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  USDZ (iOS AR)
                </Button>
              )}
              {generation.modelUrls?.obj && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDownload("obj")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  OBJ Format
                </Button>
              )}
              {!generation.modelUrls && (
                <p className="text-sm text-muted-foreground">
                  Downloads available when generation completes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" disabled={!modelUrl}>
                <Printer className="h-4 w-4 mr-2" />
                Order 3D Print
              </Button>
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Share Model
              </Button>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {new Date(generation.createdAt).toLocaleDateString()}
                </span>
              </div>
              {generation.finishedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>
                    {new Date(generation.finishedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Task ID</span>
                <span className="font-mono text-xs">{taskId.slice(0, 12)}...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
