import {
  getAmbassador as getAmbassadorSdk,
  createAmbassador as createAmbassadorSdk,
  updateAmbassador as updateAmbassadorSdk,
  deleteAmbassador as deleteAmbassadorSdk,
  getAmbassadorImages as getAmbassadorImagesSdk,
  addAmbassadorImage as addAmbassadorImageSdk,
  deleteAmbassadorImage as deleteAmbassadorImageSdk,
  getUserProjects,
  getProject as getProjectSdk,
  createProject as createProjectSdk,
  updateProject as updateProjectSdk,
  deleteProject as deleteProjectSdk,
  getProjectAssets as getProjectAssetsSdk,
} from "@/lib/api/userservice";
// Publication records endpoint is not yet in the publisher spec — keep on axios
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

// ─── Mappers ───────────────────────────────────────────────────────────────────
// The generated AmbassadorDto uses different field names than our domain type.
// These mappers keep the transformation in one place.

function mapAmbassador(dto: any): Ambassador {
  return {
    id: dto?.id ?? "",
    name: dto?.name ?? "",
    // Backend field "biography" → local "appearanceDescription"
    appearanceDescription: dto?.biography ?? dto?.appearanceDescription ?? null,
    voiceDescription: dto?.voiceDescription ?? null,
    voiceId: dto?.voiceId ?? null,
    referenceImages: [], // populated separately via getAmbassadorImages
  };
}

function mapProject(dto: any): Project {
  return {
    id: dto?.id ?? "",
    name: dto?.name ?? "",
    description: dto?.description ?? null,
    photo: dto?.photo ?? null,
    ambassadorId: dto?.ambassadorId ?? null,
  };
}

function mapProjectAsset(dto: any): ProjectAsset {
  return {
    id: dto?.id ?? "",
    mediaId: dto?.mediaId ?? "",
    templateId: dto?.templateId ?? null,
    mediaType: dto?.mediaType ?? "Image",
    mediaUrl: dto?.mediaUrl ?? "",
    createdAt: dto?.createdAt ?? "",
  };
}

function mapReferenceImage(dto: any): ReferenceImage {
  return {
    id: dto?.id ?? "",
    mediaId: dto?.mediaId ?? dto?.id ?? "",
    imageType: dto?.imageType ?? "other",
  };
}

// ─── Ambassador API ────────────────────────────────────────────────────────────

export const ambassadorApi = {
  async getAmbassador(id: string): Promise<Ambassador> {
    const { data } = await getAmbassadorSdk({ path: { id } });
    return mapAmbassador(data);
  },

  async getAmbassadorByProject(projectId: string): Promise<Ambassador> {
    // The spec doesn't expose a "by project" endpoint  — fall back to the
    // project DTO's ambassadorId and then fetch the ambassador directly.
    const { data: project } = await getProjectSdk({ path: { id: projectId } });
    if (!project?.ambassadorId) {
      throw new Error(`No ambassador found for project ${projectId}`);
    }
    const { data } = await getAmbassadorSdk({ path: { id: project.ambassadorId } });
    return mapAmbassador(data);
  },

  async createAmbassador(data: CreateAmbassadorDto): Promise<Ambassador> {
    const { data: dto } = await createAmbassadorSdk({
      body: {
        projectId: data.projectId,
        name: data.name,
        biography: data.appearanceDescription ?? null,
        voiceDescription: data.voiceDescription ?? null,
        // voiceId is not yet in the generated spec
      },
    });
    return mapAmbassador(dto);
  },

  async updateAmbassador(payload: UpdateAmbassadorDto): Promise<Ambassador> {
    const { id, ...rest } = payload;
    const { data: dto } = await updateAmbassadorSdk({
      path: { id },
      body: {
        name: rest.name ?? undefined,
        biography: rest.appearanceDescription ?? null,
        voiceDescription: rest.voiceDescription ?? null,
        // voiceId is not yet in the generated UpdateAmbassadorCommand spec
      },
    });
    return mapAmbassador(dto);
  },

  async deleteAmbassador(id: string): Promise<void> {
    await deleteAmbassadorSdk({ path: { id } });
  },

  async uploadMedia(file: File): Promise<string> {
    const { mediaApi } = await import("@/features/media/api");
    const result = await mediaApi.uploadFile(file);
    return result.mediaId;
  },

  async getReferenceImages(ambassadorId: string): Promise<ReferenceImage[]> {
    const { data } = await getAmbassadorImagesSdk({ path: { id: ambassadorId } });
    return (data ?? []).map(mapReferenceImage);
  },

  async linkAmbassadorImage(
    ambassadorId: string,
    mediaId: string,
    imageType: "portrait" | "full_body" | "other" = "other"
  ): Promise<ReferenceImage> {
    // Map local imageType to the generated ImageType enum ('Portrait' | 'FullBody' | 'Other')
    const imageTypeMap: Record<string, "Portrait" | "FullBody" | "Other"> = {
      portrait: "Portrait",
      full_body: "FullBody",
      other: "Other",
    };
    const { data: dto } = await addAmbassadorImageSdk({
      path: { id: ambassadorId },
      body: { mediaId, imageType: imageTypeMap[imageType] ?? "Other" },
    });
    return mapReferenceImage(dto);
  },

  async deleteAmbassadorImage(ambassadorId: string, mediaId: string): Promise<void> {
    await deleteAmbassadorImageSdk({ path: { id: ambassadorId, imageId: mediaId } });
  },
};

// ─── Project API ───────────────────────────────────────────────────────────────

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    const { data } = await getUserProjects();
    return (data ?? []).map(mapProject);
  },

  async getProject(id: string): Promise<Project> {
    const { data } = await getProjectSdk({ path: { id } });
    return mapProject(data);
  },

  async createProject(data: CreateProjectDto): Promise<string> {
    const { data: id } = await createProjectSdk({
      body: {
        name: data.name,
        description: data.description ?? null,
        photo: data.photo ?? null,
      },
    });
    return id as unknown as string;
  },

  async updateProject(data: UpdateProjectDto): Promise<void> {
    await updateProjectSdk({
      path: { id: data.id },
      body: {
        name: data.name,
        description: data.description ?? null,
        photo: data.photo ?? null,
      },
    });
  },

  async deleteProject(id: string): Promise<void> {
    await deleteProjectSdk({ path: { id } });
  },

  async getProjectAssets(
    projectId: string,
    params?: { cursor?: string; pageSize?: number }
  ): Promise<{ items: ProjectAsset[]; nextCursor: string | null }> {
    const { data } = await getProjectAssetsSdk({
      path: { id: projectId },
      query: { lifetime: "Permanent", cursor: params?.cursor, pageSize: params?.pageSize },
    });
    return {
      items: (data?.items ?? []).map(mapProjectAsset),
      nextCursor: data?.nextCursor ?? null,
    };
  },

  async getProjectAsset(assetId: string): Promise<ProjectAsset> {
    // The spec does not have a single-asset endpoint; fall back to axios.
    const response = await api.get<ProjectAsset>(`/project-assets/item/${assetId}`);
    return response.data;
  },

  async getMediaPostRecords(assetId: string): Promise<PublicationRecord[]> {
    // This endpoint is not yet in the publisher OpenAPI spec — kept as manual call.
    const response = await api.get<PublicationRecord[]>(
      `/publications/media-posts/${assetId}/records`
    );
    return response.data;
  },
};
