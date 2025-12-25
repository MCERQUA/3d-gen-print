"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function TextTo3DPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Form state
  const [prompt, setPrompt] = useState("");
  const [artStyle, setArtStyle] = useState("realistic");
  const [aiModel, setAiModel] = useState("latest");
  const [topology, setTopology] = useState("triangle");
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [enablePbr, setEnablePbr] = useState(false);
  const [symmetryMode, setSymmetryMode] = useState("auto");

  const estimatedCredits = aiModel === "latest" ? 25 : 7;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (prompt.length > 600) {
      toast.error("Description must be 600 characters or less");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Start preview generation
      const response = await fetch("/api/generate/text-to-3d/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          art_style: artStyle,
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
      setTaskId(newTaskId);
      toast.success("Generation started!");

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/text-to-3d/${newTaskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            toast.success("Preview generated! Now adding textures...");

            // Start refine task
            const refineResponse = await fetch("/api/generate/text-to-3d/refine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                preview_task_id: newTaskId,
                enable_pbr: enablePbr,
                ai_model: aiModel,
              }),
            });

            if (refineResponse.ok) {
              const { taskId: refineTaskId } = await refineResponse.json();

              // Poll refine task
              const refineInterval = setInterval(async () => {
                const refineStatus = await fetch(`/api/generate/text-to-3d/${refineTaskId}`);
                const refineTask = await refineStatus.json();

                if (refineTask.status === "SUCCEEDED") {
                  clearInterval(refineInterval);
                  setIsGenerating(false);
                  toast.success("3D model generated successfully!");
                  router.push(`/models/${refineTaskId}`);
                } else if (refineTask.status === "FAILED") {
                  clearInterval(refineInterval);
                  setIsGenerating(false);
                  toast.error("Texture generation failed");
                }
              }, 3000);
            }
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
        <h1 className="text-3xl font-bold">Text to 3D</h1>
        <p className="text-muted-foreground">
          Describe what you want to create and AI will generate a 3D model
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                Describe the 3D model you want to create (max 600 characters)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="A futuristic robot warrior with glowing blue eyes, metallic armor with intricate details, standing in a heroic pose..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px]"
                maxLength={600}
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {prompt.length}/600 characters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Art Style */}
              <div className="space-y-2">
                <Label>Art Style</Label>
                <Select value={artStyle} onValueChange={setArtStyle} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="sculpture">Sculpture</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Realistic for textured models, Sculpture for untextured artistic pieces
                </p>
              </div>

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
                  disabled={isGenerating || artStyle === "sculpture"}
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
                {estimatedCredits + 12}
              </div>
              <p className="text-muted-foreground">credits total</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Preview generation</span>
                  <span>{estimatedCredits} credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Texture refinement</span>
                  <span>12 credits</span>
                </div>
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
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
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
