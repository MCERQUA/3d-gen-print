"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Coins, Check, Sparkles, Zap, Crown } from "lucide-react";

const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    priceDisplay: "$4.99",
    popular: false,
    description: "Perfect for trying out",
    icon: Coins,
  },
  {
    id: "standard",
    name: "Standard Pack",
    credits: 150,
    priceDisplay: "$12.99",
    popular: true,
    description: "Best value for regular use",
    savings: "Save 13%",
    icon: Sparkles,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 400,
    priceDisplay: "$29.99",
    popular: false,
    description: "For power users",
    savings: "Save 25%",
    icon: Zap,
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    credits: 1000,
    priceDisplay: "$69.99",
    popular: false,
    description: "Maximum value",
    savings: "Save 30%",
    icon: Crown,
  },
];

// Component that handles search params (needs Suspense)
function PaymentStatusHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const purchasedCredits = searchParams.get("credits");

    if (success === "true" && purchasedCredits) {
      toast.success(`Successfully purchased ${purchasedCredits} credits!`);
      window.history.replaceState({}, "", "/credits");
    } else if (canceled === "true") {
      toast.error("Purchase was canceled");
      window.history.replaceState({}, "", "/credits");
    }
  }, [searchParams]);

  return null;
}

function CreditsPageContent() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits");
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits);
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, []);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start checkout");
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed");
      setPurchasing(null);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Payment Status Handler wrapped in Suspense */}
      <Suspense fallback={null}>
        <PaymentStatusHandler />
      </Suspense>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Buy Credits</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Purchase credits to generate 3D models
        </p>

        {/* Current Balance */}
        <Card className="inline-flex items-center gap-4 px-8 py-4">
          <Coins className="h-8 w-8 text-yellow-500" />
          <div className="text-left">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-primary">{credits ?? 0}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Credit Packages */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {CREDIT_PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <Card
              key={pkg.id}
              className={`relative flex flex-col ${
                pkg.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center flex-grow">
                <div className="mb-2">
                  <span className="text-4xl font-bold">{pkg.credits}</span>
                  <span className="text-muted-foreground ml-1">credits</span>
                </div>
                <p className="text-2xl font-semibold">{pkg.priceDisplay}</p>
                {pkg.savings && (
                  <Badge variant="secondary" className="mt-2">
                    {pkg.savings}
                  </Badge>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                >
                  {purchasing === pkg.id ? "Processing..." : "Buy Now"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Credit Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Credits Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Generation Costs</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Text-to-3D (Meshy-6): 37 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Text-to-3D (Meshy-5): 19 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Image-to-3D: 7-25 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Multi-Image-to-3D: 7-25 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Retexture: 12 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Remesh: 7 credits</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">What You Get</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>High-quality 3D models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Multiple export formats (GLB, FBX, OBJ, USDZ)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>PBR textures with metallic/roughness maps</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Credits never expire</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Order physical 3D prints</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreditsPage() {
  return <CreditsPageContent />;
}
