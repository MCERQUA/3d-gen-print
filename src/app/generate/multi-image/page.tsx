"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, Images } from "lucide-react";

export default function MultiImageTo3DPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

  // Form state
  const [aiModel, setAiModel] = useState("latest");
  const [enablePbr, setEnablePbr] = useState(false);

  const estimatedCredits = aiModel === "latest" ? 25 : 7;

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    addImages(files);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  }, []);

  const addImages = (files: File[]) => {
    const remaining = 4 - images.length;
    const toAdd = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.error(`Maximum 4 images allowed. Added ${remaining} of ${files.length}.`);
    }

    const newImages = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerate = async () => {
    if (images.length < 2) {
      toast.error("Please upload at least 2 images");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Convert images to base64
      const imageBase64s = await Promise.all(
        images.map(img => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(img.file);
        }))
      );

      const response = await fetch("/api/generate/multi-image-to-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imageBase64s,
          ai_model: aiModel,
          enable_pbr: enablePbr,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start generation");
      }

      const { taskId } = await response.json();
      toast.success("Generation started!");

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/multi-image-to-3d/${taskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success("3D model generated successfully!");
            router.push(`/models/${taskId}`);
          } else if (task.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(task.task_error?.message || "Generation failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

    } catch (error) {
      setIsGenerating(false);
      toast.error(error instanceof Error ? error.message : "Generation failed");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Multi-Image to 3D</h1>
        <p className="text-muted-foreground">
          Upload 2-4 images from different angles for more accurate 3D generation
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images (2-4)</CardTitle>
              <CardDescription>
                Upload images from front, side, and back angles for best results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={img.preview}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {!isGenerating && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}

                {images.length < 4 && (
                  <div
                    className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleImageDrop}
                    onClick={() => document.getElementById("image-input")?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Add image</p>
                    <p className="text-xs text-muted-foreground">({images.length}/4)</p>
                  </div>
                )}
              </div>

              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
                disabled={isGenerating || images.length >= 4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Meshy-6 (Latest - 25 credits)</SelectItem>
                    <SelectItem value="meshy-5">Meshy-5 (Stable - 7 credits)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable PBR Textures</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate metallic, roughness, and normal maps
                  </p>
                </div>
                <Switch
                  checked={enablePbr}
                  onCheckedChange={setEnablePbr}
                  disabled={isGenerating}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{estimatedCredits}</div>
              <p className="text-muted-foreground">credits</p>
            </CardContent>
          </Card>

          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle>Generating...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || images.length < 2}
            className="w-full"
            size="lg"
          >
            <Images className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate 3D Model"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Generation typically takes 3-7 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
