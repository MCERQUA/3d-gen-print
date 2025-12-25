"use client";

import { Suspense, useRef, useState } from "react";
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
  if (url.startsWith("https://assets.meshy.ai/")) {
    return `/api/proxy/model?url=${encodeURIComponent(url)}`;
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
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
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

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
      >
        <div className="text-center text-destructive">
          <p>Failed to load model</p>
          <p className="text-sm text-muted-foreground">{error}</p>
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
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Model */}
          <Model url={getProxiedUrl(modelUrl)} />

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
  useGLTF.preload(url);
}
