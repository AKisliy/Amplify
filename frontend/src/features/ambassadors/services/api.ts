import api from "@/lib/axios";
import type {
  Ambassador,
  CreateAmbassadorDto,
  UpdateAmbassadorDto,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ReferenceImage,
  ProjectAsset,
  PublicationRecord,
} from "../types";

export const ambassadorApi = {
  async getAmbassador(id: string): Promise<Ambassador> {
    const response = await api.get<Ambassador>(`/ambassadors/${id}`);
    return response.data;
  },

  async getAmbassadorByProject(projectId: string): Promise<Ambassador> {
    const response = await api.get<Ambassador>(`/ambassadors/project/${projectId}`);
    return response.data;
  },

  async createAmbassador(data: CreateAmbassadorDto): Promise<Ambassador> {
    const response = await api.post<Ambassador>("/ambassadors/", {
      projectId: data.projectId,
      name: data.name,
      appearanceDescription: data.appearanceDescription || null,
      voiceDescription: data.voiceDescription || null,
      voiceId: data.voiceId || null,
    });
    return response.data;
  },

  async updateAmbassador(data: UpdateAmbassadorDto): Promise<Ambassador> {
    const { id, ...payload } = data;
    const response = await api.patch<Ambassador>(`/ambassadors/${id}`, payload);
    return response.data;
  },

  async deleteAmbassador(id: string): Promise<void> {
    await api.delete(`/ambassadors/${id}`);
  },

  async uploadMedia(file: File): Promise<string> {
    const { mediaApi } = await import("@/features/media/api");
    const result = await mediaApi.uploadFile(file);
    return result.mediaId;
  },

  async getReferenceImages(ambassadorId: string): Promise<ReferenceImage[]> {
    const response = await api.get<ReferenceImage[]>(`/ambassadors/${ambassadorId}/images`);
    return response.data ?? [];
  },

  async linkAmbassadorImage(
    ambassadorId: string,
    mediaId: string,
    imageType: "portrait" | "full_body" | "other" = "other"
  ): Promise<ReferenceImage> {
    const response = await api.post<ReferenceImage>(`/ambassadors/${ambassadorId}/images`, {
      mediaId,
      imageType,
    });
    return response.data;
  },

  async deleteAmbassadorImage(ambassadorId: string, mediaId: string): Promise<void> {
    await api.delete(`/ambassadors/${ambassadorId}/images/${mediaId}`);
  },
};

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectDto): Promise<string> {
    const response = await api.post<string>("/projects", {
      ...data,
      photo: data.photo || null,
    });
    return response.data;
  },

  async updateProject(data: UpdateProjectDto): Promise<void> {
    await api.put(`/projects/${data.id}`, data);
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

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

  async getProjectAsset(assetId: string): Promise<ProjectAsset> {
    const response = await api.get<ProjectAsset>(`/project-assets/item/${assetId}`);
    return response.data;
  },

  async getMediaPostRecords(assetId: string): Promise<PublicationRecord[]> {
    const response = await api.get<PublicationRecord[]>(
      `/publications/media-posts/${assetId}/records`
    );
    return response.data;
  },
};
