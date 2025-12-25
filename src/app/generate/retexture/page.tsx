"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Paintbrush, Check } from "lucide-react";

interface Generation {
  id: string;
  meshyTaskId: string;
  prompt: string | null;
  thumbnailUrl: string | null;
  status: string;
}

export default function RetexturePage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [models, setModels] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Form state
  const [stylePrompt, setStylePrompt] = useState("");
  const [aiModel, setAiModel] = useState("latest");
  const [enablePbr, setEnablePbr] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models");
        if (response.ok) {
          const data = await response.json();
          setModels(data.filter((m: Generation) => m.status === "SUCCEEDED"));
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error("Please select a model to retexture");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const response = await fetch("/api/generate/retexture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_task_id: selectedModel,
          text_style_prompt: stylePrompt || undefined,
          ai_model: aiModel,
          enable_pbr: enablePbr,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start retexture");
      }

      const { taskId } = await response.json();
      toast.success("Retexture started!");

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/retexture/${taskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success("Retexture completed!");
            router.push(`/models/${taskId}`);
          } else if (task.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(task.task_error?.message || "Retexture failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

    } catch (error) {
      setIsGenerating(false);
      toast.error(error instanceof Error ? error.message : "Retexture failed");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Retexture</h1>
        <p className="text-muted-foreground">
          Apply new AI-generated textures to an existing 3D model
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Model</CardTitle>
              <CardDescription>
                Choose a completed model to retexture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No completed models found.</p>
                  <p className="text-sm">Generate a model first to retexture it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {models.map((model) => (
                    <div
                      key={model.meshyTaskId}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                        selectedModel === model.meshyTaskId
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                      onClick={() => setSelectedModel(model.meshyTaskId)}
                    >
                      {model.thumbnailUrl ? (
                        <img
                          src={model.thumbnailUrl}
                          alt={model.prompt || "Model"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No preview</span>
                        </div>
                      )}
                      {selectedModel === model.meshyTaskId && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Style Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Style Prompt (optional)</Label>
                <Textarea
                  placeholder="Describe the texture style, e.g., 'weathered bronze with patina', 'cartoon style with bright colors'"
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Meshy-6 (Latest)</SelectItem>
                    <SelectItem value="meshy-5">Meshy-5 (Stable)</SelectItem>
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
              <CardTitle>Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">12</div>
              <p className="text-muted-foreground">credits</p>
            </CardContent>
          </Card>

          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle>Processing...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedModel}
            className="w-full"
            size="lg"
          >
            <Paintbrush className="h-4 w-4 mr-2" />
            {isGenerating ? "Processing..." : "Retexture Model"}
          </Button>
        </div>
      </div>
    </div>
  );
}
