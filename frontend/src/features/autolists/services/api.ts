import api from "@/lib/axios";
import type {
  AutoList,
  CreateAutoListDto,
  UpdateAutoListDto,
  CreateAutoListEntryDto,
  UpdateAutoListEntryDto,
} from "../types";

interface AutoListsResponse {
  autoLists: AutoList[];
}

export const autolistApi = {
  /**
   * Get all autolists for an actor
   */
  async getAutolists(actorId: string): Promise<AutoList[]> {
    const response = await api.get<AutoListsResponse>(`/autolist`, {
      params: { actorId },
    });
    return response.data.autoLists;
  },

  /**
   * Create a new autolist
   */
  async createAutolist(data: CreateAutoListDto): Promise<string> {
    const response = await api.post<string>("/autolist", data);
    return response.data;
  },

  /**
   * Update an existing autolist
   */
  async updateAutolist(id: string, data: UpdateAutoListDto): Promise<void> {
    await api.put(`/autolist/${id}`, data);
  },

  /**
   * Delete an autolist
   */
  async deleteAutolist(id: string): Promise<void> {
    await api.delete(`/autolist/${id}`);
  },

  /**
   * Create a new autolist entry (time slot)
   */
  async createEntry(data: CreateAutoListEntryDto): Promise<string> {
    const response = await api.post<string>("/autolistentry", data);
    return response.data;
  },

  /**
   * Update an autolist entry
   */
  async updateEntry(id: string, data: UpdateAutoListEntryDto): Promise<void> {
    await api.put(`/autolistentry/${id}`, data);
  },

  /**
   * Delete an autolist entry
   */
  async deleteEntry(id: string): Promise<void> {
    await api.delete(`/autolistentry/${id}`);
  },
};
