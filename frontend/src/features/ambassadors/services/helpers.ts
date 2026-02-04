import api from "@/lib/axios";
import type { Ambassador } from "../types";

/**
 * Get ambassador by project ID
 * Note: This is a workaround since the backend doesn't have a direct endpoint.
 * We query ambassadors and filter by projectId on the client side.
 * 
 * TODO: Add backend endpoint GET /api/projects/{projectId}/ambassadors
 */
export async function getAmbassadorByProjectId(
  projectId: string
): Promise<Ambassador | null> {
  try {
    // Since we don't have a list endpoint, we'll need to rely on the project
    // having the ambassador ID, or we need a backend endpoint
    // For now, return null and handle in the UI
    return null;
  } catch (error) {
    console.error("Error fetching ambassador for project:", error);
    return null;
  }
}
