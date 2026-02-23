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
   * Get all autolists for a project
   */
  async getAutolists(projectId: string): Promise<AutoList[]> {
    const response = await api.get<AutoListsResponse>(`/autolists`, {
      params: { ProjectId: projectId },
    });
    return response.data.autoLists;
  },

  /**
   * Get an autolist by ID
   */
  async getAutolist(id: string): Promise<AutoList> {
    const response = await api.get<AutoList>(`/autolists/${id}`);
    return response.data;
  },

  /**
   * Create a new autolist
   */
  async createAutolist(data: CreateAutoListDto): Promise<string> {
    const response = await api.post<string>("/autolists", data);
    return response.data;
  },

  /**
   * Update an existing autolist
   */
  async updateAutolist(id: string, data: UpdateAutoListDto): Promise<void> {
    await api.put(`/autolists/${id}`, data);
  },

  /**
   * Delete an autolist
   */
  async deleteAutolist(id: string): Promise<void> {
    await api.delete(`/autolists/${id}`);
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
