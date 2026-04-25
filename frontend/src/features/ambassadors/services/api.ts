import {
  getProjectAsset as getProjectAssetSdk,
  getUserProjects,
  getProject as getProjectSdk,
  createProject as createProjectSdk,
  updateProject as updateProjectSdk,
  deleteProject as deleteProjectSdk,
  getProjectAssets as getProjectAssetsSdk,
} from "@/lib/api/userservice";

import {
  addReferenceImageV1AmbassadorsAmbassadorIdImagesPost,
  AmbassadorResponse,
  createAmbassadorV1AmbassadorsPost,
  deleteAmbassadorV1AmbassadorsAmbassadorIdDelete,
  deleteReferenceImageV1AmbassadorsAmbassadorIdImagesMediaIdDelete,
  getAmbassadorByProjectV1AmbassadorsProjectProjectIdGet,
  getAmbassadorV1AmbassadorsAmbassadorIdGet,
  listReferenceImagesV1AmbassadorsAmbassadorIdImagesGet,
  updateAmbassadorV1AmbassadorsAmbassadorIdPatch
} from "@/lib/api/template-service"

import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectAsset,
  PublicationRecord,
  Ambassador,
  ReferenceImage,
  CreateAmbassadorDto,
  UpdateAmbassadorDto,
} from "../types";
import { getApiPublicationsMediaPostsRecords, PublicationRecordResponseDto } from "@/lib/api/publisher";

// ─── Mappers ───────────────────────────────────────────────────────────────────
// The generated AmbassadorDto uses different field names than our domain type.
// These mappers keep the transformation in one place.

function mapAmbassador(dto: AmbassadorResponse): Ambassador {
  return {
    id: dto?.id ?? "",
    name: dto?.name ?? "",
    appearanceDescription: dto?.appearanceDescription ?? null,
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

function mapPublicationRecord(dto: PublicationRecordResponseDto): PublicationRecord {
  return {
    id: dto?.id ?? "",
    status: dto?.status ?? "None",
    provider: dto?.provider ?? "Unknown",
    publicationType: dto?.publicationType ?? "Manual",
    scheduledAt: dto?.scheduledAt ?? null,
    publishedAt: dto?.publishedAt ?? null,
    publicUrl: dto?.publicUrl ?? null,
    createdAt: null, // Not provided by the API
    socialAccount: {
      id: dto?.socialAccount?.id ?? "",
      socialProvider: dto?.socialAccount?.socialProvider ?? "Unknown",
      username: dto?.socialAccount?.username ?? "",
      avatarUrl: dto?.socialAccount?.avatarUrl ?? null,
    },
  }
}

// ─── Ambassador API ────────────────────────────────────────────────────────────

export const ambassadorApi = {
  async getAmbassador(id: string): Promise<Ambassador> {
    const { data } = await getAmbassadorV1AmbassadorsAmbassadorIdGet({ path: { ambassador_id: id } });

    if (!data) {
      throw new Error("Ambassador not found");
    }

    return mapAmbassador(data);
  },

  async getAmbassadorByProject(projectId: string): Promise<Ambassador> {
    const { data } = await getAmbassadorByProjectV1AmbassadorsProjectProjectIdGet({ path: { project_id: projectId } });
    if (!data) {
      throw new Error("Ambassador not found");
    }
    return mapAmbassador(data);
  },

  async createAmbassador(data: CreateAmbassadorDto): Promise<Ambassador> {
    const { data: dto } = await createAmbassadorV1AmbassadorsPost({
      body: {
        projectId: data.projectId,
        name: data.name,
        voiceDescription: data.voiceDescription ?? null,
        voiceId: data.voiceId ?? null,
        appearanceDescription: data.appearanceDescription ?? null,
      },
    });

    if (!dto) {
      throw new Error("Failed to create ambassador");
    }

    return mapAmbassador(dto);
  },

  async updateAmbassador(payload: UpdateAmbassadorDto): Promise<Ambassador> {
    const { id, ...rest } = payload;
    const { data: dto } = await updateAmbassadorV1AmbassadorsAmbassadorIdPatch({
      path: { ambassador_id: id },
      body: {
        name: rest.name ?? undefined,
        appearanceDescription: rest.appearanceDescription ?? null,
        voiceDescription: rest.voiceDescription ?? null,
        voiceId: rest.voiceId ?? null,
        // Note: We use `?? null` for optional fields to explicitly send null if they are set to null,
        // and `undefined` if they are not included in the payload. This depends on how the backend API handles updates
      },
    });
    if (!dto) {
      throw new Error("Failed to update ambassador");
    }
    return mapAmbassador(dto);
  },

  async deleteAmbassador(id: string): Promise<void> {
    await deleteAmbassadorV1AmbassadorsAmbassadorIdDelete({ path: { ambassador_id: id } });
  },

  async uploadMedia(file: File): Promise<string> {
    const { mediaApi } = await import("@/features/media/api");
    const result = await mediaApi.uploadFile(file);
    return result.mediaId;
  },

  async getReferenceImages(ambassadorId: string): Promise<ReferenceImage[]> {
    const { data } = await listReferenceImagesV1AmbassadorsAmbassadorIdImagesGet({ path: { ambassador_id: ambassadorId } });
    return (data ?? []).map(mapReferenceImage);
  },

  async linkAmbassadorImage(
    ambassadorId: string,
    mediaId: string,
    imageType: "portrait" | "full_body" | "other" = "other"
  ): Promise<ReferenceImage> {
    const { data: dto } = await addReferenceImageV1AmbassadorsAmbassadorIdImagesPost({
      path: { ambassador_id: ambassadorId },
      body: { mediaId, imageType: imageType },
    });
    return mapReferenceImage(dto);
  },

  async deleteAmbassadorImage(ambassadorId: string, mediaId: string): Promise<void> {
    await deleteReferenceImageV1AmbassadorsAmbassadorIdImagesMediaIdDelete({ path: { ambassador_id: ambassadorId, media_id: mediaId } });
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
    const response = await getProjectAssetSdk({ path: { id: assetId } });
    return mapProjectAsset(response.data ?? {})
  },

  async getMediaPostRecords(assetId: string): Promise<PublicationRecord[]> {
    // This endpoint is not yet in the publisher OpenAPI spec — kept as manual call.
    const response = await getApiPublicationsMediaPostsRecords({ path: { mediaPostId: assetId } });
    return (response.data ?? []).map(mapPublicationRecord)
  },
};
