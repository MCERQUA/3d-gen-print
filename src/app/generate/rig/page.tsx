"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PersonStanding, Check } from "lucide-react";

interface Generation {
  id: string;
  meshyTaskId: string;
  prompt: string | null;
  thumbnailUrl: string | null;
  status: string;
}

export default function RigPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [models, setModels] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Form state
  const [heightMeters, setHeightMeters] = useState(1.7);

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
      toast.error("Please select a humanoid model to rig");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const response = await fetch("/api/generate/rig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_task_id: selectedModel,
          height_meters: heightMeters,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start rigging");
      }

      const { taskId } = await response.json();
      toast.success("Rigging started!");

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/rig/${taskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success("Rigging completed! You can now apply animations.");
            router.push(`/models/${taskId}`);
          } else if (task.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(task.task_error?.message || "Rigging failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

    } catch (error) {
      setIsGenerating(false);
      toast.error(error instanceof Error ? error.message : "Rigging failed");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Rig & Animate</h1>
        <p className="text-muted-foreground">
          Add a skeleton to humanoid characters for animation
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Humanoid Model</CardTitle>
              <CardDescription>
                Choose a humanoid character model to rig. Works best with bipedal characters in A-pose or T-pose.
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
                  <p className="text-sm">Generate a humanoid model first.</p>
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
              <CardTitle>Rigging Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Character Height: {heightMeters.toFixed(2)}m</Label>
                <Slider
                  value={[heightMeters]}
                  onValueChange={(v) => setHeightMeters(v[0])}
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  Set the real-world height for proper animation scaling
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Tips for best results:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Use humanoid bipedal characters</li>
                  <li>- A-pose or T-pose works best</li>
                  <li>- Character should be facing forward</li>
                  <li>- Avoid characters with complex accessories</li>
                </ul>
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
              <div className="text-4xl font-bold text-primary">5</div>
              <p className="text-muted-foreground">credits</p>
              <p className="text-xs text-muted-foreground mt-2">
                +3 credits per animation
              </p>
            </CardContent>
          </Card>

          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle>Rigging...</CardTitle>
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
            <PersonStanding className="h-4 w-4 mr-2" />
            {isGenerating ? "Rigging..." : "Rig Character"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            After rigging, you can apply animations from our library
          </p>
        </div>
      </div>
    </div>
  );
}
