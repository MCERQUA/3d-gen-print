"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Ruler,
  Palette,
  Download,
  Box,
  Triangle,
} from "lucide-react";
import type { ModelStats } from "@/components/model-viewer";
import { GENERATION_CREDITS, estimatePrintCost, formatPrice } from "@/lib/pricing";

// Print bed presets (in mm)
const PRINT_BED_PRESETS = {
  "bambu-a1-mini": { name: "Bambu A1 Mini", x: 180, y: 180, z: 180 },
  "bambu-a1": { name: "Bambu A1", x: 256, y: 256, z: 256 },
  "bambu-p1s": { name: "Bambu P1S", x: 256, y: 256, z: 256 },
  "bambu-x1c": { name: "Bambu X1C", x: 256, y: 256, z: 256 },
  "custom": { name: "Custom", x: 200, y: 200, z: 200 },
};

interface ColorSlot {
  name: string;
  hex: string;
}

interface PrintPreparationCardProps {
  stats: ModelStats | null;
  meshyTaskId: string;
  modelName?: string;
  colorMapping?: { slots: ColorSlot[] } | null;
  onRemeshComplete?: (newTaskId: string) => void;
  onOpenColorMapper?: () => void;
}

type RemeshStatus = "idle" | "starting" | "processing" | "completed" | "failed";

export function PrintPreparationCard({
  stats,
  meshyTaskId,
  modelName = "3DGenPrint_Model",
  colorMapping,
  onRemeshComplete,
  onOpenColorMapper,
}: PrintPreparationCardProps) {
  // Remesh state
  const [remeshStatus, setRemeshStatus] = useState<RemeshStatus>("idle");
  const [remeshProgress, setRemeshProgress] = useState(0);
  const [remeshTaskId, setRemeshTaskId] = useState<string | null>(null);
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [topology, setTopology] = useState<"triangle" | "quad">("triangle");

  // Scale state
  const [scale, setScale] = useState(1.0);
  const [selectedBed, setSelectedBed] = useState<keyof typeof PRINT_BED_PRESETS>("bambu-p1s");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Calculate scaled dimensions
  const scaledDimensions = stats
    ? {
        x: stats.dimensions.x * scale * 10, // Convert to mm (assuming units are cm)
        y: stats.dimensions.y * scale * 10,
        z: stats.dimensions.z * scale * 10,
      }
    : null;

  // Check if model fits in selected bed
  const bed = PRINT_BED_PRESETS[selectedBed];
  const fitsInBed = scaledDimensions
    ? scaledDimensions.x <= bed.x &&
      scaledDimensions.y <= bed.y &&
      scaledDimensions.z <= bed.z
    : true;

  // Poll for remesh status
  useEffect(() => {
    if (!remeshTaskId || remeshStatus !== "processing") return;

    console.log("Starting to poll for remesh task:", remeshTaskId);

    const pollInterval = setInterval(async () => {
      try {
        console.log("Polling remesh status...");
        const response = await fetch(`/api/generate/remesh/${remeshTaskId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Poll response error:", response.status, errorData);
          throw new Error(errorData.message || "Failed to check status");
        }

        const data = await response.json();
        console.log("Remesh status:", data.status, "progress:", data.progress);
        setRemeshProgress(data.progress || 0);

        if (data.status === "SUCCEEDED") {
          setRemeshStatus("completed");
          toast.success("Mesh repair completed!");
          onRemeshComplete?.(remeshTaskId);
          clearInterval(pollInterval);
        } else if (data.status === "FAILED") {
          setRemeshStatus("failed");
          toast.error(data.task_error?.message || "Mesh repair failed");
          clearInterval(pollInterval);
        } else if (data.status === "CANCELED" || data.status === "EXPIRED") {
          setRemeshStatus("failed");
          toast.error(`Mesh repair ${data.status.toLowerCase()}`);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Poll error:", error);
        // Don't fail immediately - keep trying for a bit
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [remeshTaskId, remeshStatus, onRemeshComplete]);

  // Start remesh
  const handleRemesh = async () => {
    setRemeshStatus("starting");

    try {
      const response = await fetch("/api/generate/remesh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_task_id: meshyTaskId,
          target_formats: ["glb", "stl"],
          topology,
          target_polycount: targetPolycount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start remesh");
      }

      const data = await response.json();
      const newTaskId = data.taskId || data.meshyTaskId;
      console.log("Remesh started, task ID:", newTaskId);
      setRemeshTaskId(newTaskId);
      setRemeshStatus("processing");
      setRemeshProgress(0);
      toast.info(`Mesh repair started (${GENERATION_CREDITS.REMESH} credits)`);
    } catch (error) {
      setRemeshStatus("failed");
      toast.error(error instanceof Error ? error.message : "Failed to start remesh");
    }
  };

  // Export 3MF
  const handleExport3MF = async () => {
    if (!colorMapping?.slots) {
      toast.error("Please configure colors first");
      onOpenColorMapper?.();
      return;
    }

    setExporting(true);

    try {
      const response = await fetch("/api/export/3mf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelUrl: "", // We'll add this later when we have the model URL
          colors: colorMapping.slots,
          scale,
          modelName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${modelName}.3mf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("3MF file downloaded!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Format dimensions nicely
  const formatDimension = (mm: number) => {
    if (mm >= 100) return `${(mm / 10).toFixed(1)} cm`;
    return `${mm.toFixed(1)} mm`;
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Print Preparation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Loading model statistics...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Print Preparation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Print Readiness Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Print Ready</span>
          {stats.isWatertight ? (
            <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Watertight
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Repair
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Triangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Triangles:</span>
            <span className="font-mono">{stats.triangles.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-mono">{stats.volume.toFixed(1)} cm³</span>
          </div>
        </div>

        {/* Dimensions & Scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Print Size
            </Label>
            <span className="text-xs text-muted-foreground">
              Scale: {scale.toFixed(2)}x
            </span>
          </div>

          <Slider
            value={[scale]}
            onValueChange={([v]) => setScale(v)}
            min={0.1}
            max={5}
            step={0.1}
            className="my-2"
          />

          {scaledDimensions && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">
                {formatDimension(scaledDimensions.x)} × {formatDimension(scaledDimensions.y)} × {formatDimension(scaledDimensions.z)}
              </span>
              {!fitsInBed && (
                <Badge variant="destructive" className="text-xs">
                  Too large for {bed.name}
                </Badge>
              )}
            </div>
          )}

          <Select value={selectedBed} onValueChange={(v) => setSelectedBed(v as keyof typeof PRINT_BED_PRESETS)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRINT_BED_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {preset.name} ({preset.x}×{preset.y}×{preset.z}mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Print Cost Estimate */}
        {stats && stats.volume > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Est. Print Cost (PLA)</span>
              <span className="font-semibold">
                {formatPrice(estimatePrintCost(stats.volume * scale * scale * scale, "PLA").totalPerUnit)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes material + printing fee
            </p>
          </div>
        )}

        {/* Repair Mesh Button */}
        {!stats.isWatertight && (
          <div className="space-y-2">
            {remeshStatus === "processing" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Repairing mesh...
                  </span>
                  <span className="font-mono">{remeshProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${remeshProgress}%` }}
                  />
                </div>
              </div>
            ) : remeshStatus === "completed" ? (
              <Button variant="outline" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Mesh Repaired
              </Button>
            ) : (
              <Button
                onClick={handleRemesh}
                disabled={remeshStatus === "starting"}
                className="w-full"
              >
                {remeshStatus === "starting" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                Repair Mesh ({GENERATION_CREDITS.REMESH} credits)
              </Button>
            )}
          </div>
        )}

        {/* Advanced Options */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Advanced Options
              <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Target Polycount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Target Polycount</Label>
                <span className="text-xs font-mono">{targetPolycount.toLocaleString()}</span>
              </div>
              <Slider
                value={[targetPolycount]}
                onValueChange={([v]) => setTargetPolycount(v)}
                min={5000}
                max={100000}
                step={5000}
              />
            </div>

            {/* Topology */}
            <div className="space-y-2">
              <Label className="text-xs">Mesh Topology</Label>
              <Select value={topology} onValueChange={(v) => setTopology(v as "triangle" | "quad")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triangle" className="text-xs">Triangles (Default)</SelectItem>
                  <SelectItem value="quad" className="text-xs">Quads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Color Configuration */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onOpenColorMapper}
        >
          <Palette className="h-4 w-4 mr-2" />
          Configure Print Colors
        </Button>

        {/* Export Options */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleExport3MF}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export 3MF for Bambu
            {colorMapping?.slots && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {colorMapping.slots.length} colors
              </Badge>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
