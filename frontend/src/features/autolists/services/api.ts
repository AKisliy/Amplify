import {
  getAutoListsForProject,
  getAutoList as getAutoListSdk,
  createAutoList as createAutoListSdk,
  updateAutoList as updateAutoListSdk,
  deleteAutoList as deleteAutoListSdk,
  createAutoListEntry as createAutoListEntrySdk,
  updateAutoListEntry as updateAutoListEntrySdk,
  deleteAutoListEntry as deleteAutoListEntrySdk,
} from "@/lib/api/publisher";
import type {
  AutoList,
  CreateAutoListDto,
  UpdateAutoListDto,
  CreateAutoListEntryDto,
  UpdateAutoListEntryDto,
} from "../types";

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapAutoListEntry(e: any, listId: string) {
  return {
    id: e?.id ?? "",
    autoListId: listId,
    dayOfWeeks: e?.dayOfWeeks ?? 0,
    publicationTime: e?.publicationTime ?? "",
  };
}

function mapFullAutoList(dto: any): AutoList {
  const id = dto?.id ?? "";
  return {
    id,
    name: dto?.name ?? "",
    instagramSettings: dto?.instagramSettings ?? undefined,
    entries: (dto?.entries ?? []).map((e: any) => mapAutoListEntry(e, id)),
    accounts: (dto?.accounts ?? []).map((a: any) => ({
      id: a?.id ?? "",
      socialProvider: a?.socialProvider ?? "",
      username: a?.username ?? "",
      avatarUrl: a?.avatarUrl ?? undefined,
    })),
  };
}

export const autolistApi = {
  /**
   * Get all autolists for a project
   */
  async getAutolists(projectId: string): Promise<AutoList[]> {
    const { data } = await getAutoListsForProject({ query: { ProjectId: projectId } });
    const rawList = data?.autoLists ?? [];
    // The list endpoint returns the lightweight AutoListDto (id + name only).
    // Entries/accounts require a detail fetch; here we return empty arrays to
    // match the previous behavior (entries used only for count, not editing).
    return rawList.map((item: any) => ({
      id: item?.id ?? "",
      name: item?.name ?? "",
      entries: [],
      accounts: [],
    }));
  },

  /**
   * Get an autolist by ID (full detail with entries and accounts)
   */
  async getAutolist(id: string): Promise<AutoList> {
    const { data } = await getAutoListSdk({ path: { id } });
    return mapFullAutoList(data);
  },

  /**
   * Create a new autolist
   */
  async createAutolist(payload: CreateAutoListDto): Promise<string> {
    const { data } = await createAutoListSdk({
      body: {
        projectId: payload.projectId,
        name: payload.name,
        instagramSettings: payload.instagramSettings ?? null,
        accounts: payload.accounts.map((a) => ({ id: a.id })),
        entries: payload.entries.map((e) => ({
          id: crypto.randomUUID(),
          dayOfWeeks: e.dayOfWeeks,
          publicationTime: e.publicationTime,
        })),
      },
    });
    return data as unknown as string;
  },

  /**
   * Update an existing autolist
   */
  async updateAutolist(id: string, payload: UpdateAutoListDto): Promise<void> {
    await updateAutoListSdk({
      path: { id },
      body: {
        id: payload.id,
        name: payload.name,
        instagramSettings: payload.instagramSettings ?? null,
        accounts: payload.accounts.map((a) => ({ id: a.id })),
      },
    });
  },

  /**
   * Delete an autolist
   */
  async deleteAutolist(id: string): Promise<void> {
    await deleteAutoListSdk({ path: { id } });
  },

  /**
   * Create a new autolist entry (time slot)
   */
  async createEntry(payload: CreateAutoListEntryDto): Promise<string> {
    const { data } = await createAutoListEntrySdk({
      body: {
        autoListId: payload.autoListId,
        entry: {
          id: crypto.randomUUID(),
          dayOfWeeks: payload.dayOfWeeks,
          publicationTime: payload.publicationTime,
        },
      },
    });
    return data as unknown as string;
  },

  /**
   * Update an autolist entry
   */
  async updateEntry(id: string, payload: UpdateAutoListEntryDto): Promise<void> {
    await updateAutoListEntrySdk({
      path: { id },
      body: {
        id,
        daysOfWeek: payload.dayOfWeeks,
        publicationTime: payload.publicationTime,
      },
    });
  },

  /**
   * Delete an autolist entry
   */
  async deleteEntry(id: string): Promise<void> {
    await deleteAutoListEntrySdk({ path: { id } });
  },
};
