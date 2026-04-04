import api from "@/lib/axios";
import type {
  Ambassador,
  CreateAmbassadorDto,
  UpdateAmbassadorDto,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  AmbassadorImage,
  ProjectAsset,
} from "../types";

export const ambassadorApi = {
  /**
   * Get a single ambassador by ID
   */
  async getAmbassador(id: string): Promise<Ambassador> {
    const response = await api.get<Ambassador>(`/ambassadors/${id}`);
    return response.data;
  },

  /**
   * Create a new ambassador
   */
  async createAmbassador(data: CreateAmbassadorDto): Promise<string> {
    const payload = {
      ...data,
      biography: data.biography || null,
      behavioralPatterns: data.behavioralPatterns || null,
    };
    const response = await api.post<string>("/ambassadors", payload);
    return response.data;
  },

  /**
   * Update an existing ambassador
   */
  async updateAmbassador(data: UpdateAmbassadorDto): Promise<void> {
    await api.put(`/ambassadors/${data.id}`, data);
  },

  /**
   * Delete an ambassador
   */
  async deleteAmbassador(id: string): Promise<void> {
    await api.delete(`/ambassadors/${id}`);
  },

  /**
   * Upload media to ingest service — delegates to mediaApi
   */
  async uploadMedia(file: File): Promise<string> {
    const { mediaApi } = await import("@/features/media/api");
    const result = await mediaApi.uploadImage(file);
    return result.mediaId;
  },

  /**
   * Get ambassador images
   */
  async getAmbassadorImages(id: string): Promise<AmbassadorImage[]> {
    const response = await api.get<any[]>(`/ambassadors/${id}/images`);
    return (response.data ?? []).map((item: any) => ({
      id: item.id ?? item.Id ?? item.imageId ?? item.ImageId ?? "",
      imageUrl: item.imageUrl ?? item.ImageUrl ?? item.url ?? item.Url ?? "",
      imageType: item.imageType ?? item.ImageType ?? 0,
    }));
  },

  /**
   * Link media to ambassador.
   * imageType: 0 = image, 1 = video
   */
  async linkAmbassadorImage(
    ambassadorId: string,
    mediaId: string,
    imageType: 0 | 1 = 0
  ): Promise<void> {
    await api.post(`/ambassadors/${ambassadorId}/images`, {
      ambassadorId,
      mediaId,
      imageType,
    });
  },

  /**
   * Delete image from ambassador gallery
   */
  async deleteAmbassadorImage(ambassadorId: string, imageId: string): Promise<void> {
    await api.delete(`/ambassadors/${ambassadorId}/images/${imageId}`);
  },
};

export const projectApi = {
  /**
   * Get all projects for the current user
   */
  async getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");
    return response.data;
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectDto): Promise<string> {
    const payload = {
      ...data,
      photo: data.photo || null, // Convert empty string to null
    };
    const response = await api.post<string>("/projects", payload);
    return response.data;
  },

  /**
   * Update an existing project
   */
  async updateProject(data: UpdateProjectDto): Promise<void> {
    await api.put(`/projects/${data.id}`, data);
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  /**
   * Get project assets (generated media)
   */
  async getProjectAssets(
    projectId: string,
    params?: { cursor?: string; pageSize?: number }
  ): Promise<{ items: ProjectAsset[]; nextCursor: string | null }> {
    const response = await api.get<{ items: ProjectAsset[]; nextCursor: string | null }>(
      `/project-assets/${projectId}`,
      { params: { lifetime: 1, ...params } }
    );
    return response.data;
  },
};

