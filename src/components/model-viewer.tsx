"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  Center,
  Html,
} from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  backgroundColor?: string;
}

function Loader({ progress }: { progress: number }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">
          {progress.toFixed(0)}%
        </span>
      </div>
    </Html>
  );
}

interface ModelProps {
  blobUrl: string;
}

function Model({ blobUrl }: ModelProps) {
  const { scene } = useGLTF(blobUrl);
  const modelRef = useRef<THREE.Group>(null);

  // Clone the scene to avoid issues with reusing
  const clonedScene = scene.clone();

  // Center and scale the model
  const box = new THREE.Box3().setFromObject(clonedScene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;

  return (
    <Center>
      <primitive
        ref={modelRef}
        object={clonedScene}
        scale={scale}
        dispose={null}
      />
    </Center>
  );
}

export function ModelViewer({
  modelUrl,
  className = "",
  autoRotate = true,
  showControls = true,
  backgroundColor = "#1a1a1a",
}: ModelViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Fetch model through proxy and create blob URL
  useEffect(() => {
    let objectUrl: string | null = null;

    async function fetchModel() {
      try {
        setLoadProgress(10);

        // Build proxy URL
        const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
        console.log("Fetching model through proxy:", proxyUrl.substring(0, 80));

        setLoadProgress(20);

        const response = await fetch(proxyUrl);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch model: ${response.status} - ${errorText}`);
        }

        setLoadProgress(60);

        const blob = await response.blob();
        console.log("Model blob size:", blob.size, "bytes");

        setLoadProgress(80);

        // Create object URL from blob
        objectUrl = URL.createObjectURL(blob);
        console.log("Created blob URL:", objectUrl);

        setLoadProgress(100);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Model fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load model");
      }
    }

    fetchModel();

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [modelUrl]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
      >
        <div className="text-center text-destructive p-4">
          <p className="font-medium">Failed to load model</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Loading model... {loadProgress}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: backgroundColor }}
        gl={{ preserveDrawingBuffer: true }}
        onError={() => setError("WebGL error occurred")}
      >
        <Suspense fallback={<Loader progress={100} />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Model */}
          <Model blobUrl={blobUrl} />

          {/* Controls */}
          {showControls && (
            <OrbitControls
              autoRotate={autoRotate}
              autoRotateSpeed={2}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={20}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded">
        Drag to rotate | Scroll to zoom | Right-click to pan
      </div>
    </div>
  );
}
