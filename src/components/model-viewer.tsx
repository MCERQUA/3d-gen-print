"use client";

import { Suspense, useRef, useState, useEffect, Component, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Center,
  Html,
} from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  backgroundColor?: string;
}

// Error boundary to catch Three.js errors
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Model viewer error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
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
  scene: THREE.Group;
}

function Model({ scene }: ModelProps) {
  const modelRef = useRef<THREE.Group>(null);

  // Center and scale the model
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;

  return (
    <Center>
      <primitive
        ref={modelRef}
        object={scene}
        scale={scale}
        dispose={null}
      />
    </Center>
  );
}

function ErrorDisplay({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-muted ${className}`}>
      <div className="text-center text-destructive p-4">
        <p className="font-medium">Failed to load 3D model</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Try refreshing the page
        </p>
      </div>
    </div>
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
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Fetch model through proxy and load with GLTFLoader
  useEffect(() => {
    let mounted = true;

    async function fetchAndLoadModel() {
      try {
        setLoadProgress(10);
        setError(null);

        // Build proxy URL
        const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
        console.log("Fetching model through proxy...");

        setLoadProgress(20);

        const response = await fetch(proxyUrl);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Response wasn't JSON
          }
          throw new Error(errorMessage);
        }

        setLoadProgress(40);

        const arrayBuffer = await response.arrayBuffer();
        console.log("Model fetched, size:", arrayBuffer.byteLength, "bytes");

        if (arrayBuffer.byteLength === 0) {
          throw new Error("Empty model file received");
        }

        setLoadProgress(60);

        // Load with GLTFLoader
        const loader = new GLTFLoader();

        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          loader.parse(
            arrayBuffer,
            "",
            (result) => resolve(result),
            (err) => reject(err)
          );
        });

        console.log("Model parsed successfully");
        setLoadProgress(100);

        if (mounted) {
          setScene(gltf.scene);
        }
      } catch (err) {
        console.error("Model load error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load model");
        }
      }
    }

    fetchAndLoadModel();

    return () => {
      mounted = false;
    };
  }, [modelUrl]);

  if (error) {
    return <ErrorDisplay message={error} className={className} />;
  }

  if (!scene) {
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
    <ErrorBoundary fallback={<ErrorDisplay message="WebGL rendering error" className={className} />}>
      <div className={`relative ${className}`}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: backgroundColor }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <Suspense fallback={<Loader progress={100} />}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />

            {/* Environment for reflections */}
            <Environment preset="studio" />

            {/* Model */}
            <Model scene={scene} />

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
    </ErrorBoundary>
  );
}
