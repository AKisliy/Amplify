import { mediaApi } from "@/features/media/api";
import { ambassadorApi } from "./api";
import type { Ambassador, CreateAmbassadorPayload, UpdateAmbassadorPayload } from "../types";

const BASE_URL = "/ambassadors";

export const getAmbassador = async (id: string): Promise<Ambassador> => {
  return ambassadorApi.getAmbassador(id);
};

export const getAmbassadorByProject = async (projectId: string): Promise<Ambassador> => {
  return ambassadorApi.getAmbassadorByProject(projectId);
};

export const createAmbassador = async (payload: CreateAmbassadorPayload): Promise<Ambassador> => {
  return ambassadorApi.createAmbassador(payload);
};

export const updateAmbassador = async (payload: UpdateAmbassadorPayload): Promise<Ambassador> => {
  return ambassadorApi.updateAmbassador(payload);
};

export const deleteAmbassador = async (id: string): Promise<void> => {
  return ambassadorApi.deleteAmbassador(id);
};

export const uploadMedia = async (file: File): Promise<string> => {
  const result = await mediaApi.uploadFile(file);
  return result.mediaId;
};
