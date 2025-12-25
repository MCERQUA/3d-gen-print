/**
 * Pricing & Credits Configuration
 *
 * All credit costs and pricing are defined here for easy adjustment.
 * Update these values when Meshy pricing changes or when adjusting margins.
 */

// ============================================
// GENERATION CREDITS (Meshy API Operations)
// ============================================

export const GENERATION_CREDITS = {
  // Text-to-3D
  TEXT_TO_3D_PREVIEW: {
    latest: 25,
    "meshy-5": 7,
    "meshy-4": 7,
  },
  TEXT_TO_3D_REFINE: 12,

  // Image-to-3D
  IMAGE_TO_3D: {
    latest: 25,
    "meshy-5": 7,
    "meshy-4": 7,
  },

  // Multi-Image-to-3D
  MULTI_IMAGE_TO_3D: {
    latest: 25,
    "meshy-5": 7,
  },

  // Post-processing
  REMESH: 7,
  RETEXTURE: 12,
  RIGGING: 5,
} as const;

// Helper to get credit cost for a generation type
export function getGenerationCreditCost(
  type: keyof typeof GENERATION_CREDITS,
  aiModel?: string
): number {
  const cost = GENERATION_CREDITS[type];
  if (typeof cost === "number") return cost;

  // For operations with model-specific pricing
  const modelKey = (aiModel || "latest") as keyof typeof cost;
  return cost[modelKey] ?? cost.latest;
}

// ============================================
// CREDIT PACKAGES (User Purchases)
// ============================================

export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 4.99,
    pricePerCredit: 0.0998,
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    credits: 150,
    price: 12.99,
    pricePerCredit: 0.0866,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    price: 39.99,
    pricePerCredit: 0.0800,
    popular: false,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 1500,
    price: 99.99,
    pricePerCredit: 0.0667,
    popular: false,
  },
] as const;

// ============================================
// PRINT PRICING (Future - 3D Printing Orders)
// ============================================

export const PRINT_MATERIALS = {
  PLA: {
    name: "PLA",
    description: "Standard, biodegradable plastic",
    pricePerGram: 0.05,
    colors: ["White", "Black", "Red", "Blue", "Yellow", "Green", "Orange", "Gray"],
  },
  PETG: {
    name: "PETG",
    description: "Durable, water-resistant",
    pricePerGram: 0.07,
    colors: ["White", "Black", "Clear", "Blue", "Red"],
  },
  ABS: {
    name: "ABS",
    description: "Strong, heat-resistant",
    pricePerGram: 0.06,
    colors: ["White", "Black", "Red", "Blue"],
  },
  RESIN: {
    name: "Resin",
    description: "High detail, smooth finish",
    pricePerGram: 0.15,
    colors: ["Gray", "White", "Clear", "Black"],
  },
  RESIN_TOUGH: {
    name: "Tough Resin",
    description: "Durable resin for functional parts",
    pricePerGram: 0.20,
    colors: ["Gray", "Black"],
  },
} as const;

export const PRINT_SIZE_TIERS = {
  SMALL: {
    name: "Small",
    maxVolume: 50, // cm³
    baseFee: 5.00,
  },
  MEDIUM: {
    name: "Medium",
    maxVolume: 200, // cm³
    baseFee: 10.00,
  },
  LARGE: {
    name: "Large",
    maxVolume: 500, // cm³
    baseFee: 20.00,
  },
  XL: {
    name: "Extra Large",
    maxVolume: 1000, // cm³
    baseFee: 35.00,
  },
  CUSTOM: {
    name: "Custom",
    maxVolume: Infinity,
    baseFee: 50.00, // Quote required
  },
} as const;

// Calculate estimated print cost
export function estimatePrintCost(
  volumeCm3: number,
  material: keyof typeof PRINT_MATERIALS,
  quantity: number = 1
): {
  materialCost: number;
  baseFee: number;
  sizeTier: string;
  totalPerUnit: number;
  total: number;
} {
  // Estimate weight: ~1.2g per cm³ for most materials
  const weightGrams = volumeCm3 * 1.2;
  const materialConfig = PRINT_MATERIALS[material];
  const materialCost = weightGrams * materialConfig.pricePerGram;

  // Determine size tier
  type SizeTierValue = (typeof PRINT_SIZE_TIERS)[keyof typeof PRINT_SIZE_TIERS];
  let sizeTier: SizeTierValue = PRINT_SIZE_TIERS.CUSTOM;

  for (const [, tier] of Object.entries(PRINT_SIZE_TIERS)) {
    if (volumeCm3 <= tier.maxVolume) {
      sizeTier = tier;
      break;
    }
  }

  const totalPerUnit = materialCost + sizeTier.baseFee;

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    baseFee: sizeTier.baseFee,
    sizeTier: sizeTier.name,
    totalPerUnit: Math.round(totalPerUnit * 100) / 100,
    total: Math.round(totalPerUnit * quantity * 100) / 100,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

export function formatCredits(credits: number): string {
  return credits.toLocaleString();
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
