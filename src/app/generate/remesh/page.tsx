"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Settings2, Check } from "lucide-react";

interface Generation {
  id: string;
  meshyTaskId: string;
  prompt: string | null;
  thumbnailUrl: string | null;
  status: string;
}

const OUTPUT_FORMATS = [
  { id: "glb", label: "GLB (Recommended)" },
  { id: "fbx", label: "FBX" },
  { id: "obj", label: "OBJ" },
  { id: "usdz", label: "USDZ (iOS AR)" },
  { id: "stl", label: "STL (3D Printing)" },
];

export default function RemeshPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [models, setModels] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Form state
  const [topology, setTopology] = useState("triangle");
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["glb"]);

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

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error("Please select a model to remesh");
      return;
    }

    if (selectedFormats.length === 0) {
      toast.error("Please select at least one output format");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const response = await fetch("/api/generate/remesh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_task_id: selectedModel,
          topology,
          target_polycount: targetPolycount,
          target_formats: selectedFormats,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start remesh");
      }

      const { taskId } = await response.json();
      toast.success("Remesh started!");

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/generate/remesh/${taskId}`);
          const task = await statusResponse.json();

          setProgress(task.progress || 0);

          if (task.status === "SUCCEEDED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.success("Remesh completed!");
            router.push(`/models/${taskId}`);
          } else if (task.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(task.task_error?.message || "Remesh failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

    } catch (error) {
      setIsGenerating(false);
      toast.error(error instanceof Error ? error.message : "Remesh failed");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Remesh</h1>
        <p className="text-muted-foreground">
          Optimize polygon count and convert to different formats
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Model</CardTitle>
              <CardDescription>
                Choose a completed model to remesh
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
                  <p className="text-sm">Generate a model first.</p>
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
              <CardTitle>Remesh Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="space-y-3">
                <Label>Output Formats</Label>
                {OUTPUT_FORMATS.map((format) => (
                  <div key={format.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={format.id}
                      checked={selectedFormats.includes(format.id)}
                      onCheckedChange={() => toggleFormat(format.id)}
                      disabled={isGenerating}
                    />
                    <label
                      htmlFor={format.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {format.label}
                    </label>
                  </div>
                ))}
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
              <div className="text-4xl font-bold text-primary">7</div>
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
            disabled={isGenerating || !selectedModel || selectedFormats.length === 0}
            className="w-full"
            size="lg"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {isGenerating ? "Processing..." : "Remesh Model"}
          </Button>
        </div>
      </div>
    </div>
  );
}
