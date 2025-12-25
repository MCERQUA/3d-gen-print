"use client";

import { useEffect, useState, use, Component, ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Share2, AlertTriangle } from "lucide-react";
import { PrintPreparationCard } from "@/components/print-preparation-card";
import type { ModelStats } from "@/components/model-viewer";

// Error boundary for 3D viewer
interface ViewerErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  thumbnailUrl?: string | null;
}

interface ViewerErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  constructor(props: ViewerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ViewerErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Viewer crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] bg-muted rounded-lg flex flex-col items-center justify-center border p-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <p className="font-medium text-center">3D Viewer unavailable</p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Your device may not support WebGL
          </p>
          {this.props.thumbnailUrl && (
            <img
              src={this.props.thumbnailUrl}
              alt="Model preview"
              className="mt-4 max-h-32 rounded-lg object-contain"
            />
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Dynamic import to avoid SSR issues with Three.js
const ModelViewer = dynamic(
  () => import("@/components/model-viewer")
    .then((mod) => mod.ModelViewer)
    .catch((err) => {
      console.error("Failed to load ModelViewer:", err);
      // Return a fallback component
      return function FallbackViewer({ modelUrl, className }: { modelUrl: string; className?: string }) {
        return (
          <div className={`flex flex-col items-center justify-center bg-muted rounded-lg border p-4 ${className}`}>
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="font-medium text-center">3D Viewer failed to load</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Error: {err?.message || "Unknown error"}
            </p>
            <a
              href={modelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Download Model
            </a>
          </div>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading 3D viewer...</span>
        </div>
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
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [colorMapperOpen, setColorMapperOpen] = useState(false);

  useEffect(() => {
    const fetchGeneration = async () => {
      try {
        const response = await fetch(`/api/models/${taskId}`);
        if (!response.ok) throw new Error("Failed to fetch model");
        const data = await response.json();
        setGeneration(data);
      } catch (error) {
        console.error("Fetch error:", error);
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
    window.open(url, "_blank");
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
        <div className="md:col-span-2 min-w-0">
          {modelUrl ? (
            <ViewerErrorBoundary thumbnailUrl={generation.thumbnailUrl}>
              <div className="rounded-lg overflow-hidden border w-full">
                <ModelViewer
                  modelUrl={modelUrl}
                  className="w-full h-[300px] sm:h-[400px] md:h-[500px]"
                  onStatsChange={setModelStats}
                />
              </div>
            </ViewerErrorBoundary>
          ) : (
            <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] bg-muted rounded-lg flex items-center justify-center border">
              {generation.thumbnailUrl ? (
                <img
                  src={generation.thumbnailUrl}
                  alt={generation.prompt || "Model thumbnail"}
                  className="max-h-full max-w-full object-contain"
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

          {/* Print Preparation */}
          {generation.status === "SUCCEEDED" && (
            <PrintPreparationCard
              stats={modelStats}
              meshyTaskId={generation.meshyTaskId}
              onRemeshComplete={(newTaskId) => {
                toast.success("Mesh repaired! Refreshing model...");
                // Could refresh the page or update the model URL
              }}
              onOpenColorMapper={() => setColorMapperOpen(true)}
            />
          )}

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
