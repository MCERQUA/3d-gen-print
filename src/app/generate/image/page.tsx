"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export default function ImageTo3DPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form state
  const [aiModel, setAiModel] = useState("latest");
  const [topology, setTopology] = useState("triangle");
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [enablePbr, setEnablePbr] = useState(false);
  const [symmetryMode, setSymmetryMode] = useState("auto");

  const estimatedCredits = aiModel === "latest" ? 25 : 7;

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      toast.error("Please upload an image file");
    }
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const removeImage = () => {
    setImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      toast.error("Please upload an image");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:image/xxx;base64, prefix
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      // Start preview generation
      const response = await fetch("/api/generate/image-to-3d/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          ai_model: aiModel,
          topology,
          target_polycount: targetPolycount,
          symmetry_mode: symmetryMode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start generation");
      }

      const { taskId: newTaskId } = await response.json();
      toast.success("Generation started!");

      // Poll for progress (Image-to-3D is single stage)
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/image-to-3d/${newTaskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success("3D model generated successfully!");
            router.push(`/models/${newTaskId}`);
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
        <h1 className="text-3xl font-bold">Image to 3D</h1>
        <p className="text-muted-foreground">
          Upload an image and AI will generate a 3D model from it
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Upload a clear image of the object you want to convert to 3D
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!imagePreview ? (
                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageDrop}
                  onClick={() => document.getElementById("image-input")?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Drop your image here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supports: PNG, JPG, WEBP (Max 10MB)
                  </p>
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isGenerating}
                  />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-[400px] object-contain rounded-lg"
                  />
                  {!isGenerating && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Model */}
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Meshy-6 (Latest - 25 credits)</SelectItem>
                    <SelectItem value="meshy-5">Meshy-5 (Stable - 7 credits)</SelectItem>
                    <SelectItem value="meshy-4">Meshy-4 (Legacy - 7 credits)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Topology */}
              <div className="space-y-2">
                <Label>Topology</Label>
                <Select value={topology} onValueChange={setTopology} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="triangle">Triangle (Default)</SelectItem>
                    <SelectItem value="quad">Quad (Better for animation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Polycount */}
              <div className="space-y-2">
                <Label>Target Polycount: {targetPolycount.toLocaleString()}</Label>
                <Slider
                  value={[targetPolycount]}
                  onValueChange={(v) => setTargetPolycount(v[0])}
                  min={1000}
                  max={100000}
                  step={1000}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  Lower for 3D printing, higher for detailed renders
                </p>
              </div>

              {/* Symmetry */}
              <div className="space-y-2">
                <Label>Symmetry Mode</Label>
                <Select value={symmetryMode} onValueChange={setSymmetryMode} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="on">Always On</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PBR Toggle */}
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {estimatedCredits}
              </div>
              <p className="text-muted-foreground">credits total</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Image-to-3D generation</span>
                  <span>{estimatedCredits} credits</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes mesh + texture in one step
                </p>
              </div>
            </CardContent>
          </Card>

          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle>Generating...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !image}
            className="w-full"
            size="lg"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate 3D Model"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Generation typically takes 2-5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
