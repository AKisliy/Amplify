import { ambassadorApi } from "./api";
import type { Ambassador } from "../types";

export async function getAmbassadorByProjectId(
  projectId: string
): Promise<Ambassador | null> {
  try {
    return await ambassadorApi.getAmbassadorByProject(projectId);
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    console.error("Error fetching ambassador for project:", error);
    return null;
  }
}
