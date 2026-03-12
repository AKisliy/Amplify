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

// Backend response type for FullAutoListDto (PascalCase field names)
interface FullAutoListDtoResponse {
  id: string;
  name: string;
  instagramSettings?: { shareToFeed: boolean } | null;
  entries: Array<{
    id: string;
    dayOfWeeks: number;
    publicationTime: string;
  }>;
  accounts: Array<{
    id: string;
    socialProvider: number;
    username: string;
    avatarUrl?: string | null;
  }>;
}

function mapFullAutoListDto(dto: FullAutoListDtoResponse): AutoList {
  return {
    id: dto.id,
    name: dto.name,
    instagramSettings: dto.instagramSettings ?? undefined,
    entries: (dto.entries ?? []).map((e) => ({
      id: e.id,
      autoListId: dto.id,
      dayOfWeeks: e.dayOfWeeks,
      publicationTime: e.publicationTime,
    })),
    accounts: (dto.accounts ?? []).map((a) => ({
      id: a.id,
      socialProvider: a.socialProvider,
      username: a.username,
      avatarUrl: a.avatarUrl ?? undefined,
    })),
  };
}

export const autolistApi = {
  /**
   * Get all autolists for a project
   */
  async getAutolists(projectId: string): Promise<AutoList[]> {
    const response = await api.get<AutoListsResponse>(`autolists`, {
      params: { ProjectId: projectId },
    });
    return response.data.autoLists;
  },

  /**
   * Get an autolist by ID
   */
  async getAutolist(id: string): Promise<AutoList> {
    const response = await api.get<FullAutoListDtoResponse>(`autolists/${id}`);
    return mapFullAutoListDto(response.data);
  },

  /**
   * Create a new autolist
   */
  async createAutolist(data: CreateAutoListDto): Promise<string> {
    const payload = {
      projectId: data.projectId,
      name: data.name,
      instagramSettings: data.instagramSettings ?? null,
      accounts: data.accounts.map((a) => ({ id: a.id })),
      entries: data.entries.map((e) => ({
        id: crypto.randomUUID(), // required by AutoListEntryDto
        dayOfWeeks: e.dayOfWeeks,
        publicationTime: e.publicationTime,
      })),
    };
    const response = await api.post<string>(`autolists`, payload);
    return response.data;
  },

  /**
   * Update an existing autolist
   */
  async updateAutolist(id: string, data: UpdateAutoListDto): Promise<void> {
    const payload = {
      id: data.id,
      name: data.name,
      instagramSettings: data.instagramSettings ?? null,
      accounts: data.accounts.map((a) => ({ id: a.id })),
    };
    await api.put(`autolists/${id}`, payload);
  },

  /**
   * Delete an autolist
   */
  async deleteAutolist(id: string): Promise<void> {
    await api.delete(`autolists/${id}`);
  },

  /**
   * Create a new autolist entry (time slot)
   * Backend: POST /autolistentry  body: { AutoListId, Entry: { Id, DayOfWeeks, PublicationTime } }
   */
  async createEntry(data: CreateAutoListEntryDto): Promise<string> {
    const payload = {
      autoListId: data.autoListId,
      entry: {
        id: crypto.randomUUID(),
        dayOfWeeks: data.dayOfWeeks,
        publicationTime: data.publicationTime,
      },
    };
    const response = await api.post<string>(`autolistentry`, payload);
    return response.data;
  },

  /**
   * Update an autolist entry
   * Backend: PUT /autolistentry/{id}  body: { Id, DaysOfWeek, PublicationTime }
   */
  async updateEntry(id: string, data: UpdateAutoListEntryDto): Promise<void> {
    const payload = {
      id: id,
      daysOfWeek: data.dayOfWeeks, // backend field is DaysOfWeek (not DayOfWeeks)
      publicationTime: data.publicationTime,
    };
    await api.put(`autolistentry/${id}`, payload);
  },

  /**
   * Delete an autolist entry
   */
  async deleteEntry(id: string): Promise<void> {
    await api.delete(`autolistentry/${id}`);
  },
};
