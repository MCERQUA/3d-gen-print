"use client";

import { Suspense, useRef, useState, useEffect, Component, ReactNode, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Center,
  Html,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

// Types
interface ModelViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  backgroundColor?: string;
  onStatsChange?: (stats: ModelStats) => void;
}

export interface ModelStats {
  triangles: number;
  vertices: number;
  meshCount: number;
  dimensions: { x: number; y: number; z: number };
  volume: number;
  surfaceArea: number;
  fileSize: number;
  isWatertight: boolean;
  boundingBox: THREE.Box3;
}

type ViewMode = "solid" | "wireframe" | "solid-wireframe" | "xray";

// Error boundary
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

// Calculate model statistics
function calculateModelStats(scene: THREE.Group, fileSize: number): ModelStats {
  let triangles = 0;
  let vertices = 0;
  let meshCount = 0;
  let totalVolume = 0;
  let totalSurfaceArea = 0;
  let isWatertight = true;

  const boundingBox = new THREE.Box3().setFromObject(scene);
  const size = boundingBox.getSize(new THREE.Vector3());

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshCount++;
      const geometry = child.geometry;

      if (geometry.index) {
        triangles += geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        triangles += geometry.attributes.position.count / 3;
      }

      if (geometry.attributes.position) {
        vertices += geometry.attributes.position.count;
      }

      // Calculate volume using signed volume of triangles
      // This works for watertight meshes
      const pos = geometry.attributes.position;
      const index = geometry.index;

      if (pos && index) {
        let meshVolume = 0;
        const vertex = new THREE.Vector3();
        const v0 = new THREE.Vector3();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();

        for (let i = 0; i < index.count; i += 3) {
          v0.fromBufferAttribute(pos, index.getX(i));
          v1.fromBufferAttribute(pos, index.getX(i + 1));
          v2.fromBufferAttribute(pos, index.getX(i + 2));

          // Signed volume of tetrahedron
          meshVolume += v0.dot(v1.cross(v2)) / 6;

          // Surface area of triangle
          const edge1 = new THREE.Vector3().subVectors(v1, v0);
          const edge2 = new THREE.Vector3().subVectors(v2, v0);
          totalSurfaceArea += edge1.cross(edge2).length() / 2;
        }

        totalVolume += Math.abs(meshVolume);
      }

      // Check for non-manifold edges (simple watertight check)
      if (geometry.index) {
        const edges = new Map<string, number>();
        const idx = geometry.index.array;
        for (let i = 0; i < idx.length; i += 3) {
          const a = idx[i], b = idx[i + 1], c = idx[i + 2];
          [[a, b], [b, c], [c, a]].forEach(([v1, v2]) => {
            const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
            edges.set(key, (edges.get(key) || 0) + 1);
          });
        }
        // Each edge should appear exactly twice in a watertight mesh
        for (const count of edges.values()) {
          if (count !== 2) {
            isWatertight = false;
            break;
          }
        }
      }
    }
  });

  // Apply scale to get real-world dimensions
  const worldMatrix = scene.matrixWorld;
  const scale = new THREE.Vector3();
  worldMatrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);

  return {
    triangles: Math.round(triangles),
    vertices,
    meshCount,
    dimensions: {
      x: Math.round(size.x * 100) / 100,
      y: Math.round(size.y * 100) / 100,
      z: Math.round(size.z * 100) / 100,
    },
    volume: Math.round(totalVolume * 1000) / 1000,
    surfaceArea: Math.round(totalSurfaceArea * 100) / 100,
    fileSize,
    isWatertight,
    boundingBox,
  };
}

// Model component with view modes
interface ModelProps {
  scene: THREE.Group;
  viewMode: ViewMode;
  showAxes: boolean;
}

function Model({ scene, viewMode, showAxes }: ModelProps) {
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Clone material to avoid modifying original
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((material) => {
          switch (viewMode) {
            case "wireframe":
              material.wireframe = true;
              material.transparent = false;
              material.opacity = 1;
              break;
            case "solid-wireframe":
              // Will add wireframe overlay separately
              material.wireframe = false;
              break;
            case "xray":
              material.transparent = true;
              material.opacity = 0.3;
              material.wireframe = false;
              material.depthWrite = false;
              break;
            default:
              material.wireframe = false;
              material.transparent = false;
              material.opacity = 1;
          }
        });
      }
    });

    return clone;
  }, [scene, viewMode]);

  // Create wireframe overlay for solid-wireframe mode
  const wireframeOverlay = useMemo(() => {
    if (viewMode !== "solid-wireframe") return null;

    const overlay = scene.clone(true);
    overlay.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x000000,
          wireframe: true,
          transparent: true,
          opacity: 0.3,
        });
      }
    });
    return overlay;
  }, [scene, viewMode]);

  // Center and scale
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;

  return (
    <Center>
      <group scale={scale}>
        <primitive object={clonedScene} dispose={null} />
        {wireframeOverlay && <primitive object={wireframeOverlay} dispose={null} />}
        {showAxes && <axesHelper args={[maxDim * 0.5]} />}
      </group>
    </Center>
  );
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

function ErrorDisplay({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-muted ${className}`}>
      <div className="text-center text-destructive p-4">
        <p className="font-medium">Failed to load 3D model</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
    </div>
  );
}

// Stats Panel Component
function StatsPanel({ stats, className }: { stats: ModelStats; className?: string }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className={`bg-black/80 text-white text-xs p-3 rounded-lg space-y-2 ${className}`}>
      <div className="font-semibold text-sm border-b border-white/20 pb-1 mb-2">
        Model Statistics
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-white/60">Triangles:</span>
        <span className="font-mono">{formatNumber(stats.triangles)}</span>

        <span className="text-white/60">Vertices:</span>
        <span className="font-mono">{formatNumber(stats.vertices)}</span>

        <span className="text-white/60">Meshes:</span>
        <span className="font-mono">{stats.meshCount}</span>

        <span className="text-white/60">File Size:</span>
        <span className="font-mono">{formatSize(stats.fileSize)}</span>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="font-semibold text-sm mb-1">Dimensions</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-white/60">X</div>
            <div className="font-mono">{stats.dimensions.x.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-white/60">Y</div>
            <div className="font-mono">{stats.dimensions.y.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-white/60">Z</div>
            <div className="font-mono">{stats.dimensions.z.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="font-semibold text-sm mb-1">Print Analysis</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-white/60">Volume:</span>
          <span className="font-mono">{stats.volume.toFixed(2)} units³</span>

          <span className="text-white/60">Surface:</span>
          <span className="font-mono">{stats.surfaceArea.toFixed(2)} units²</span>

          <span className="text-white/60">Watertight:</span>
          <span className={stats.isWatertight ? "text-green-400" : "text-red-400"}>
            {stats.isWatertight ? "Yes ✓" : "No ✗"}
          </span>
        </div>
      </div>
    </div>
  );
}

// View Mode Controls
function ViewModeControls({
  viewMode,
  onViewModeChange,
  showAxes,
  onShowAxesChange,
  autoRotate,
  onAutoRotateChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showAxes: boolean;
  onShowAxesChange: (show: boolean) => void;
  autoRotate: boolean;
  onAutoRotateChange: (rotate: boolean) => void;
}) {
  const modes: { value: ViewMode; label: string }[] = [
    { value: "solid", label: "Solid" },
    { value: "wireframe", label: "Wire" },
    { value: "solid-wireframe", label: "Both" },
    { value: "xray", label: "X-Ray" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex rounded-lg overflow-hidden border border-white/20">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === mode.value
                ? "bg-primary text-primary-foreground"
                : "bg-black/60 text-white/80 hover:bg-black/80"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onShowAxesChange(!showAxes)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          showAxes
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-black/60 text-white/80 border-white/20 hover:bg-black/80"
        }`}
      >
        Axes
      </button>

      <button
        onClick={() => onAutoRotateChange(!autoRotate)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          autoRotate
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-black/60 text-white/80 border-white/20 hover:bg-black/80"
        }`}
      >
        {autoRotate ? "Stop" : "Rotate"}
      </button>
    </div>
  );
}

// Main ModelViewer Component
export function ModelViewer({
  modelUrl,
  className = "",
  autoRotate: initialAutoRotate = false,
  showControls = true,
  backgroundColor = "#1a1a1a",
  onStatsChange,
}: ModelViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("solid");
  const [showAxes, setShowAxes] = useState(false);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchAndLoadModel() {
      try {
        setLoadProgress(10);
        setError(null);

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
        const fileSize = arrayBuffer.byteLength;
        console.log("Model fetched, size:", fileSize, "bytes");

        if (fileSize === 0) {
          throw new Error("Empty model file received");
        }

        setLoadProgress(60);

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
        setLoadProgress(80);

        // Calculate stats
        const modelStats = calculateModelStats(gltf.scene, fileSize);
        console.log("Model stats:", modelStats);

        setLoadProgress(100);

        if (mounted) {
          setScene(gltf.scene);
          setStats(modelStats);
          onStatsChange?.(modelStats);
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
  }, [modelUrl, onStatsChange]);

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
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />

            <Environment preset="studio" />

            <Model scene={scene} viewMode={viewMode} showAxes={showAxes} />

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

            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport labelColor="white" axisHeadScale={1} />
            </GizmoHelper>
          </Suspense>
        </Canvas>

        {/* Controls overlay - top */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <ViewModeControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showAxes={showAxes}
            onShowAxesChange={setShowAxes}
            autoRotate={autoRotate}
            onAutoRotateChange={setAutoRotate}
          />

          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showStats
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-black/60 text-white/80 border-white/20 hover:bg-black/80"
            }`}
          >
            Stats
          </button>
        </div>

        {/* Stats panel */}
        {showStats && stats && (
          <StatsPanel stats={stats} className="absolute top-14 right-2 w-48" />
        )}

        {/* Help text */}
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded">
          Drag to rotate | Scroll to zoom | Right-click to pan
        </div>
      </div>
    </ErrorBoundary>
  );
}
