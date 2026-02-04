import api from "@/lib/axios";
import { Ambassador, CreateAmbassadorPayload, UpdateAmbassadorPayload } from "../types";

const BASE_URL = "/ambassadors";

export const getAmbassador = async (id: string): Promise<Ambassador> => {
  const { data } = await api.get<Ambassador>(`${BASE_URL}/${id}`);
  return data;
};

export const createAmbassador = async (payload: CreateAmbassadorPayload): Promise<string> => {
  const { data } = await api.post<string>(BASE_URL, payload);
  return data;
};

export const updateAmbassador = async ({ id, ...payload }: UpdateAmbassadorPayload): Promise<void> => {
  await api.put(`${BASE_URL}/${id}`, { id, ...payload });
};

export const deleteAmbassador = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/${id}`);
};
