"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Palette, RotateCcw, Download, Check } from "lucide-react";

// Filament color presets matching common AMS configurations
const COLOR_PRESETS = {
  "bambu-basic": {
    name: "Bambu Basic",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Red", hex: "#E53935" },
      { name: "Blue", hex: "#1E88E5" },
      { name: "Yellow", hex: "#FDD835" },
      { name: "Green", hex: "#43A047" },
      { name: "Orange", hex: "#FB8C00" },
      { name: "Gray", hex: "#757575" },
    ],
  },
  "earth-tones": {
    name: "Earth Tones",
    colors: [
      { name: "Cream", hex: "#F5F5DC" },
      { name: "Tan", hex: "#D2B48C" },
      { name: "Brown", hex: "#8B4513" },
      { name: "Olive", hex: "#808000" },
      { name: "Forest", hex: "#228B22" },
      { name: "Rust", hex: "#B7410E" },
      { name: "Clay", hex: "#B66A50" },
      { name: "Charcoal", hex: "#36454F" },
    ],
  },
  "grayscale": {
    name: "Grayscale",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Light Gray", hex: "#D3D3D3" },
      { name: "Silver", hex: "#C0C0C0" },
      { name: "Gray", hex: "#808080" },
      { name: "Dim Gray", hex: "#696969" },
      { name: "Dark Gray", hex: "#505050" },
      { name: "Charcoal", hex: "#36454F" },
      { name: "Black", hex: "#1A1A1A" },
    ],
  },
  "vibrant": {
    name: "Vibrant",
    colors: [
      { name: "Hot Pink", hex: "#FF69B4" },
      { name: "Electric Blue", hex: "#00BFFF" },
      { name: "Lime", hex: "#32CD32" },
      { name: "Yellow", hex: "#FFFF00" },
      { name: "Orange", hex: "#FF6600" },
      { name: "Purple", hex: "#9400D3" },
      { name: "Cyan", hex: "#00FFFF" },
      { name: "Magenta", hex: "#FF00FF" },
    ],
  },
} as const;

export interface ColorSlot {
  name: string;
  hex: string;
  mappedFromTexture?: string; // Original texture color this maps to
}

export interface ColorMapping {
  slots: ColorSlot[];
  preset: keyof typeof COLOR_PRESETS | "custom";
}

interface PrintColorMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedColors?: string[]; // Hex colors extracted from texture
  onSave?: (mapping: ColorMapping) => void;
  initialMapping?: ColorMapping;
}

export function PrintColorMapper({
  open,
  onOpenChange,
  extractedColors = [],
  onSave,
  initialMapping,
}: PrintColorMapperProps) {
  const [preset, setPreset] = useState<keyof typeof COLOR_PRESETS | "custom">(
    initialMapping?.preset || "bambu-basic"
  );
  const [slots, setSlots] = useState<ColorSlot[]>(
    initialMapping?.slots || COLOR_PRESETS["bambu-basic"].colors.map(c => ({ ...c }))
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Apply a preset
  const applyPreset = useCallback((presetKey: keyof typeof COLOR_PRESETS) => {
    setPreset(presetKey);
    setSlots(COLOR_PRESETS[presetKey].colors.map(c => ({ ...c })));
  }, []);

  // Update a single slot color
  const updateSlotColor = useCallback((index: number, hex: string, name?: string) => {
    setSlots(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        hex,
        name: name || updated[index].name,
      };
      return updated;
    });
    setPreset("custom");
  }, []);

  // Map an extracted color to a slot
  const mapExtractedColor = useCallback((extractedHex: string, slotIndex: number) => {
    setSlots(prev => {
      const updated = [...prev];
      updated[slotIndex] = {
        ...updated[slotIndex],
        mappedFromTexture: extractedHex,
      };
      return updated;
    });
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    applyPreset("bambu-basic");
  }, [applyPreset]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.({ slots, preset });
    onOpenChange(false);
  }, [slots, preset, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configure Print Colors
          </DialogTitle>
          <DialogDescription>
            Map your model&apos;s textures to 8 filament colors for multi-color 3D printing.
            Works with Bambu AMS and similar multi-material systems.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset selector */}
          <div className="space-y-2">
            <Label>Color Preset</Label>
            <Select
              value={preset}
              onValueChange={(v) => {
                if (v !== "custom") {
                  applyPreset(v as keyof typeof COLOR_PRESETS);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_PRESETS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
                {preset === "custom" && (
                  <SelectItem value="custom">Custom</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 8 Color Slots */}
          <div className="space-y-2">
            <Label>Filament Slots (8 Colors)</Label>
            <div className="grid grid-cols-4 gap-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSlot === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedSlot(index)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-xs text-muted-foreground">Slot {index + 1}</div>
                    <div
                      className="w-12 h-12 rounded-lg border shadow-inner"
                      style={{ backgroundColor: slot.hex }}
                    />
                    <span className="text-xs font-medium truncate w-full text-center">
                      {slot.name}
                    </span>
                    {slot.mappedFromTexture && (
                      <Badge variant="secondary" className="text-[10px]">
                        Mapped
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected slot editor */}
          {selectedSlot !== null && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Label>Edit Slot {selectedSlot + 1}</Label>
                <Badge variant="outline">{slots[selectedSlot].name}</Badge>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Color Name</Label>
                  <Input
                    value={slots[selectedSlot].name}
                    onChange={(e) =>
                      updateSlotColor(selectedSlot, slots[selectedSlot].hex, e.target.value)
                    }
                    placeholder="Color name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hex Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={slots[selectedSlot].hex}
                      onChange={(e) => updateSlotColor(selectedSlot, e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={slots[selectedSlot].hex}
                      onChange={(e) => updateSlotColor(selectedSlot, e.target.value)}
                      className="w-24 font-mono text-sm"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted colors from texture */}
          {extractedColors.length > 0 && (
            <div className="space-y-2">
              <Label>Detected Texture Colors</Label>
              <p className="text-xs text-muted-foreground">
                Click a detected color, then click a slot to map it
              </p>
              <div className="flex flex-wrap gap-2">
                {extractedColors.map((color, index) => (
                  <button
                    key={index}
                    className="w-10 h-10 rounded-lg border-2 border-border hover:border-primary transition-colors shadow-sm"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (selectedSlot !== null) {
                        mapExtractedColor(color, selectedSlot);
                      }
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preview strip */}
          <div className="space-y-2">
            <Label>Color Palette Preview</Label>
            <div className="flex h-8 rounded-lg overflow-hidden border">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex-1"
                  style={{ backgroundColor: slot.hex }}
                  title={slot.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={resetToDefault} className="sm:mr-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Save Colors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
