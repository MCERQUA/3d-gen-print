"use client";

import { Suspense, useState, useEffect, Component, ReactNode, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
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
import { X, ChevronRight, Box, Grid3X3, Eye, Axis3D, RotateCcw, Info } from "lucide-react";

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

      const pos = geometry.attributes.position;
      const index = geometry.index;

      if (pos && index) {
        let meshVolume = 0;
        const v0 = new THREE.Vector3();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();

        for (let i = 0; i < index.count; i += 3) {
          v0.fromBufferAttribute(pos, index.getX(i));
          v1.fromBufferAttribute(pos, index.getX(i + 1));
          v2.fromBufferAttribute(pos, index.getX(i + 2));

          meshVolume += v0.dot(v1.cross(v2)) / 6;

          const edge1 = new THREE.Vector3().subVectors(v1, v0);
          const edge2 = new THREE.Vector3().subVectors(v2, v0);
          totalSurfaceArea += edge1.cross(edge2).length() / 2;
        }

        totalVolume += Math.abs(meshVolume);
      }

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
        for (const count of edges.values()) {
          if (count !== 2) {
            isWatertight = false;
            break;
          }
        }
      }
    }
  });

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

// Stats Drawer Component (Mobile-friendly slide-out)
function StatsDrawer({
  stats,
  isOpen,
  onClose
}: {
  stats: ModelStats;
  isOpen: boolean;
  onClose: () => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/30 z-10"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-gray-900 text-white z-20 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Model Stats
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-60px)]">
          {/* Mesh Info */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Mesh Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">Triangles</span>
                <span className="font-mono font-semibold">{formatNumber(stats.triangles)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">Vertices</span>
                <span className="font-mono font-semibold">{formatNumber(stats.vertices)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">Meshes</span>
                <span className="font-mono font-semibold">{stats.meshCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">File Size</span>
                <span className="font-mono font-semibold">{formatSize(stats.fileSize)}</span>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Dimensions
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Width (X)</div>
                <div className="font-mono font-bold text-lg">{stats.dimensions.x.toFixed(1)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Height (Y)</div>
                <div className="font-mono font-bold text-lg">{stats.dimensions.y.toFixed(1)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Depth (Z)</div>
                <div className="font-mono font-bold text-lg">{stats.dimensions.z.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Print Analysis */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Print Analysis
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">Volume</span>
                <span className="font-mono font-semibold">{stats.volume.toFixed(2)} units³</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70">Surface Area</span>
                <span className="font-mono font-semibold">{stats.surfaceArea.toFixed(2)} units²</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/70">Watertight</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  stats.isWatertight
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {stats.isWatertight ? "Yes - Ready to Print" : "No - Needs Repair"}
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <strong>Tip:</strong> A watertight mesh is required for 3D printing.
              All edges must connect exactly 2 faces with no holes or gaps.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Floating Stats Tab (collapsed state)
function StatsTab({ onClick, stats }: { onClick: () => void; stats: ModelStats }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900 text-white px-2 py-4 rounded-l-lg shadow-lg hover:bg-gray-800 transition-colors flex flex-col items-center gap-2"
    >
      <ChevronRight className="h-4 w-4 rotate-180" />
      <span className="text-xs font-semibold writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
        STATS
      </span>
      <div className={`w-2 h-2 rounded-full ${stats.isWatertight ? 'bg-green-400' : 'bg-red-400'}`} />
    </button>
  );
}

// Mobile-friendly toolbar
function ViewToolbar({
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
  const modes: { value: ViewMode; icon: ReactNode; label: string }[] = [
    { value: "solid", icon: <Box className="h-4 w-4" />, label: "Solid" },
    { value: "wireframe", icon: <Grid3X3 className="h-4 w-4" />, label: "Wire" },
    { value: "solid-wireframe", icon: <Box className="h-4 w-4" />, label: "Both" },
    { value: "xray", icon: <Eye className="h-4 w-4" />, label: "X-Ray" },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-full p-1 shadow-lg">
        {/* View modes */}
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            className={`p-2.5 rounded-full transition-colors ${
              viewMode === mode.value
                ? "bg-primary text-primary-foreground"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title={mode.label}
          >
            {mode.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Axes toggle */}
        <button
          onClick={() => onShowAxesChange(!showAxes)}
          className={`p-2.5 rounded-full transition-colors ${
            showAxes
              ? "bg-primary text-primary-foreground"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
          title="Show Axes"
        >
          <Axis3D className="h-4 w-4" />
        </button>

        {/* Auto-rotate toggle */}
        <button
          onClick={() => onAutoRotateChange(!autoRotate)}
          className={`p-2.5 rounded-full transition-colors ${
            autoRotate
              ? "bg-primary text-primary-foreground"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
          title={autoRotate ? "Stop Rotation" : "Auto Rotate"}
        >
          <RotateCcw className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`} />
        </button>
      </div>
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
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchAndLoadModel() {
      try {
        setLoadProgress(10);
        setError(null);

        const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
        console.log("Fetching model through proxy...");

        setLoadProgress(20);

        const response = await fetch(proxyUrl, {
          credentials: "include", // Ensure cookies are sent for auth
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Response wasn't JSON
          }
          // Add helpful context for common errors
          if (response.status === 401) {
            errorMessage = "Please sign in to view 3D models";
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
      <div className={`relative overflow-hidden ${className}`}>
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

            <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
              <GizmoViewport labelColor="white" axisHeadScale={1} />
            </GizmoHelper>
          </Suspense>
        </Canvas>

        {/* Floating toolbar at bottom */}
        <ViewToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showAxes={showAxes}
          onShowAxesChange={setShowAxes}
          autoRotate={autoRotate}
          onAutoRotateChange={setAutoRotate}
        />

        {/* Stats tab (always visible on right edge) */}
        {stats && !statsOpen && (
          <StatsTab onClick={() => setStatsOpen(true)} stats={stats} />
        )}

        {/* Stats drawer */}
        {stats && (
          <StatsDrawer
            stats={stats}
            isOpen={statsOpen}
            onClose={() => setStatsOpen(false)}
          />
        )}

        {/* Touch hint for mobile */}
        <div className="absolute top-2 left-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded pointer-events-none md:hidden">
          Pinch to zoom • Drag to rotate
        </div>

        {/* Desktop hint */}
        <div className="absolute top-2 left-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded pointer-events-none hidden md:block">
          Scroll to zoom • Drag to rotate • Right-click to pan
        </div>
      </div>
    </ErrorBoundary>
  );
}
