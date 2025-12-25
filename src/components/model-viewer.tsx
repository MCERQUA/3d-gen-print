"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  Center,
  Html,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  backgroundColor?: string;
}

// Proxy Meshy URLs to avoid CORS issues
function getProxiedUrl(url: string): string {
  // Always proxy URLs that contain meshy.ai
  if (url.includes("meshy.ai")) {
    const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(url)}`;
    console.log("Proxying model URL:", url.substring(0, 50) + "...");
    console.log("Proxied URL:", proxyUrl.substring(0, 80) + "...");
    return proxyUrl;
  }
  return url;
}

function Loader() {
  const { progress } = useProgress();
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
  url: string;
  onError?: (error: Error) => void;
}

function Model({ url, onError }: ModelProps) {
  const { scene } = useGLTF(url, true, true, (loader) => {
    loader.manager.onError = (errorUrl: string) => {
      console.error("Failed to load:", errorUrl);
      onError?.(new Error(`Failed to load model from: ${errorUrl}`));
    };
  });
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

function ErrorFallback({ message }: { message: string }) {
  return (
    <Html center>
      <div className="text-center p-4 bg-destructive/10 rounded-lg max-w-xs">
        <p className="text-destructive font-medium">Failed to load model</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
    </Html>
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
  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);

  // Apply proxy on client side only
  useEffect(() => {
    const url = getProxiedUrl(modelUrl);
    setProxiedUrl(url);
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

  if (!proxiedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Model */}
          <Model
            url={proxiedUrl}
            onError={(err) => setError(err.message)}
          />

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

// Preload models for better performance
export function preloadModel(url: string) {
  useGLTF.preload(getProxiedUrl(url));
}
