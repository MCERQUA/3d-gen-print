"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <Link
      href="/credits"
      className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors bg-muted/50 px-3 py-1.5 rounded-full"
    >
      <Coins className="h-4 w-4 text-yellow-500" />
      {loading ? (
        <span className="animate-pulse">...</span>
      ) : (
        <span className="text-primary font-bold">{credits ?? 0}</span>
      )}
      <span className="text-muted-foreground hidden sm:inline">credits</span>
    </Link>
  );
}
