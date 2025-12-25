/**
 * Meshy.ai API Client
 * Complete TypeScript client for all Meshy API endpoints
 */

const MESHY_BASE_URL = "https://api.meshy.ai";

// Types
export interface TextTo3DPreviewParams {
  prompt: string;
  art_style?: "realistic" | "sculpture";
  ai_model?: "latest" | "meshy-5" | "meshy-4";
  topology?: "quad" | "triangle";
  target_polycount?: number;
  should_remesh?: boolean;
  symmetry_mode?: "off" | "auto" | "on";
  pose_mode?: "a-pose" | "t-pose" | "";
  moderation?: boolean;
}

export interface TextTo3DRefineParams {
  preview_task_id: string;
  enable_pbr?: boolean;
  texture_prompt?: string;
  texture_image_url?: string;
  ai_model?: "latest" | "meshy-5" | "meshy-4";
  moderation?: boolean;
}

export interface ImageTo3DParams {
  image_url: string;
  ai_model?: "latest" | "meshy-5" | "meshy-4";
  should_texture?: boolean;
  should_remesh?: boolean;
  enable_pbr?: boolean;
  topology?: "quad" | "triangle";
  target_polycount?: number;
  texture_prompt?: string;
  texture_image_url?: string;
  pose_mode?: "normal" | "a_t_pose";
  save_pre_remeshed_model?: boolean;
  output_format?: string[];
}

export interface MultiImageTo3DParams {
  image_urls: string[];
  should_remesh?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
  texture_prompt?: string;
  texture_image_url?: string;
  ai_model?: "latest" | "meshy-5";
  enable_safety_check?: boolean;
  is_a_t_pose?: boolean;
  save_pre_remeshed_model?: boolean;
}

export interface RemeshParams {
  input_task_id?: string;
  model_url?: string;
  target_formats?: ("glb" | "fbx" | "obj" | "usdz" | "blend" | "stl")[];
  topology?: "quad" | "triangle";
  target_polycount?: number;
  resize_height?: number;
  origin_at?: "bottom" | "center";
  convert_format_only?: boolean;
}

export interface RetextureParams {
  input_task_id?: string;
  model_url?: string;
  text_style_prompt?: string;
  image_style_url?: string;
  ai_model?: "latest" | "meshy-5" | "meshy-4";
  enable_original_uv?: boolean;
  enable_pbr?: boolean;
}

export interface RiggingParams {
  input_task_id?: string;
  model_url?: string;
  height_meters?: number;
  texture_image_url?: string;
}

export interface AnimationParams {
  rig_task_id: string;
  action_id: number;
  post_process?: {
    operation_type?: "change_fps" | "fbx2usdz" | "extract_armature";
    fps?: 24 | 25 | 30 | 60;
  };
}

export interface MeshyTask {
  id: string;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  model_urls?: Record<string, string>;
  texture_urls?: Array<Record<string, string>>;
  thumbnail_url?: string;
  prompt?: string;
  art_style?: string;
  created_at: number;
  started_at?: number;
  finished_at?: number;
  preceding_tasks?: number;
  task_error?: { message: string };
}

export interface BalanceResponse {
  balance: number;
}

class MeshyError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "MeshyError";
  }
}

export class MeshyClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${MESHY_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new MeshyError(response.status, error.message || "Request failed");
    }

    return response.json();
  }

  // ============================================
  // TEXT TO 3D
  // ============================================

  async createTextTo3DPreview(params: TextTo3DPreviewParams): Promise<{ result: string }> {
    return this.request("/openapi/v2/text-to-3d", {
      method: "POST",
      body: JSON.stringify({ mode: "preview", ...params }),
    });
  }

  async createTextTo3DRefine(params: TextTo3DRefineParams): Promise<{ result: string }> {
    return this.request("/openapi/v2/text-to-3d", {
      method: "POST",
      body: JSON.stringify({ mode: "refine", ...params }),
    });
  }

  async getTextTo3DTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v2/text-to-3d/${taskId}`);
  }

  async deleteTextTo3DTask(taskId: string): Promise<void> {
    await this.request(`/openapi/v2/text-to-3d/${taskId}`, { method: "DELETE" });
  }

  // ============================================
  // IMAGE TO 3D
  // ============================================

  async createImageTo3D(params: ImageTo3DParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/image-to-3d", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getImageTo3DTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/image-to-3d/${taskId}`);
  }

  async deleteImageTo3DTask(taskId: string): Promise<void> {
    await this.request(`/openapi/v1/image-to-3d/${taskId}`, { method: "DELETE" });
  }

  // ============================================
  // MULTI-IMAGE TO 3D
  // ============================================

  async createMultiImageTo3D(params: MultiImageTo3DParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/multi-image-to-3d", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getMultiImageTo3DTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/multi-image-to-3d/${taskId}`);
  }

  // ============================================
  // REMESH
  // ============================================

  async createRemesh(params: RemeshParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/remesh", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getRemeshTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/remesh/${taskId}`);
  }

  // ============================================
  // RETEXTURE
  // ============================================

  async createRetexture(params: RetextureParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/retexture", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getRetextureTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/retexture/${taskId}`);
  }

  // ============================================
  // RIGGING
  // ============================================

  async createRigging(params: RiggingParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/rigging", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getRiggingTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/rigging/${taskId}`);
  }

  // ============================================
  // ANIMATION
  // ============================================

  async createAnimation(params: AnimationParams): Promise<{ result: string }> {
    return this.request("/openapi/v1/animations", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getAnimationTask(taskId: string): Promise<MeshyTask> {
    return this.request(`/openapi/v1/animations/${taskId}`);
  }

  // ============================================
  // BALANCE
  // ============================================

  async getBalance(): Promise<BalanceResponse> {
    return this.request("/openapi/v1/balance");
  }
}

// Singleton instance
let meshyClient: MeshyClient | null = null;

export function getMeshyClient(): MeshyClient {
  if (!meshyClient) {
    const apiKey = process.env.MESHY_API_KEY;
    if (!apiKey) {
      throw new Error("MESHY_API_KEY is not configured");
    }
    meshyClient = new MeshyClient(apiKey);
  }
  return meshyClient;
}
