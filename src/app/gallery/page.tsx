"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Clock, CheckCircle, XCircle } from "lucide-react";

interface Generation {
  id: string;
  meshyTaskId: string;
  meshyTaskType: string;
  status: string;
  prompt: string | null;
  progress: number;
  thumbnailUrl: string | null;
  artStyle: string | null;
  aiModel: string | null;
  createdAt: string;
}

export default function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGenerations = async () => {
      try {
        const response = await fetch("/api/models");
        if (response.ok) {
          const data = await response.json();
          setGenerations(data);
        }
      } catch (error) {
        console.error("Failed to fetch generations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGenerations();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return "default";
      case "FAILED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filterByStatus = (status: string | null) => {
    if (!status) return generations;
    return generations.filter((g) => g.status === status);
  };

  const renderGenerationCard = (generation: Generation) => (
    <Card key={generation.id} className="overflow-hidden group">
      <div className="aspect-square bg-muted relative">
        {generation.thumbnailUrl ? (
          <img
            src={generation.thumbnailUrl}
            alt={generation.prompt || "Generated model"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {generation.status === "PENDING" || generation.status === "IN_PROGRESS" ? (
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <span>{generation.progress}%</span>
              </div>
            ) : (
              <span>No preview</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button asChild variant="secondary">
            <Link href={`/models/${generation.meshyTaskId}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={getStatusColor(generation.status) as "default" | "secondary" | "destructive"}>
            {getStatusIcon(generation.status)}
            <span className="ml-1">{generation.status}</span>
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <p className="line-clamp-2 text-sm font-medium">
          {generation.prompt || "Untitled"}
        </p>
        <div className="flex gap-2 mt-2">
          {generation.meshyTaskType && (
            <Badge variant="outline" className="text-xs">
              {generation.meshyTaskType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
        {new Date(generation.createdAt).toLocaleDateString()}
      </CardFooter>
    </Card>
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Gallery</h1>
          <p className="text-muted-foreground">
            View and manage your generated 3D models
          </p>
        </div>
        <Button asChild>
          <Link href="/generate">
            <Plus className="h-4 w-4 mr-2" />
            New Generation
          </Link>
        </Button>
      </div>

      {generations.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No models yet</h2>
          <p className="text-muted-foreground mb-6">
            Start generating 3D models to see them here
          </p>
          <Button asChild>
            <Link href="/generate">Create Your First Model</Link>
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({generations.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterByStatus("SUCCEEDED").length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              In Progress ({filterByStatus("PENDING").length + filterByStatus("IN_PROGRESS").length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed ({filterByStatus("FAILED").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generations.map(renderGenerationCard)}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filterByStatus("SUCCEEDED").map(renderGenerationCard)}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...filterByStatus("PENDING"), ...filterByStatus("IN_PROGRESS")].map(
                renderGenerationCard
              )}
            </div>
          </TabsContent>

          <TabsContent value="failed">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filterByStatus("FAILED").map(renderGenerationCard)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
