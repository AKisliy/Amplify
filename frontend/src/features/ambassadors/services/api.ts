import api from "@/lib/axios";
import type {
  Ambassador,
  CreateAmbassadorDto,
  UpdateAmbassadorDto,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  AmbassadorImage,
} from "../types";

export const ambassadorApi = {
  /**
   * Get a single ambassador by ID
   */
  async getAmbassador(id: string): Promise<Ambassador> {
    const response = await api.get<Ambassador>(`/ambassadors/${id}`);
    return response.data;
  },

  /**
   * Create a new ambassador
   */
  async createAmbassador(data: CreateAmbassadorDto): Promise<string> {
    const response = await api.post<string>("/ambassadors", data);
    return response.data;
  },

  /**
   * Update an existing ambassador
   */
  async updateAmbassador(data: UpdateAmbassadorDto): Promise<void> {
    await api.put(`/ambassadors/${data.id}`, data);
  },

  /**
   * Delete an ambassador
   */
  async deleteAmbassador(id: string): Promise<void> {
    await api.delete(`/ambassadors/${id}`);
  },

  /**
   * Upload media to ingest service
   */
  async uploadMedia(file: File): Promise<string> {
    // Mock upload for now if backend fails
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post<{ mediaId: string }>("/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.mediaId;
    } catch (err) {
      console.warn("Mocking media upload due to API error");
      return Math.random().toString(36).substring(7);
    }
  },

  /**
   * Get ambassador images
   */
  async getAmbassadorImages(id: string): Promise<AmbassadorImage[]> {
    try {
      const response = await api.get<AmbassadorImage[]>(`/ambassadors/${id}/images`);
      return response.data;
    } catch (err) {
      console.warn("Mocking gallery images due to API error");
      
      // Base mock images for the three mock ambassadors
      const mockData: Record<string, AmbassadorImage[]> = {
        "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d": [ // John Doe
          { id: "mj1", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj2", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj3", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj4", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj5", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj6", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj7", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj8", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj9", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
          { id: "mj10", imageUrl: "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg", imageType: 0 },
        ],
        "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d": [ // Sarah Johnson
          { id: "ms1", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800", imageType: 0 },
          { id: "ms2", imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800", imageType: 0 },
        ],
        "3a4b5c6d-7e8f-8a9b-0c1d-2e3f4a5b6c8d": [ // Michael Chen
          { id: "mc1", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800", imageType: 0 },
          { id: "mc2", imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800", imageType: 0 },
        ]
      };

      // Get session-stored "added" images
      const sessionKey = `mock_images_${id}`;
      const sessionImages = JSON.parse(sessionStorage.getItem(sessionKey) || "[]");
      
      // Get session-stored "deleted" image IDs
      const deletedKey = `mock_deleted_${id}`;
      const deletedIds = JSON.parse(sessionStorage.getItem(deletedKey) || "[]");

      const baseImages = mockData[id] || [];
      const allImages = [...baseImages, ...sessionImages].filter(img => !deletedIds.includes(img.id));

      return allImages;
    }
  },

  /**
   * Link image to ambassador
   */
  async linkAmbassadorImage(ambassadorId: string, mediaId: string): Promise<void> {
    try {
      await api.post(`/ambassadors/${ambassadorId}/images`, {
        ambassadorId,
        mediaId,
        imageType: 0
      });
    } catch (err) {
      console.warn("Mocking link image due to API error");
      // Persist the "link" in session storage for the mock
      const sessionKey = `mock_images_${ambassadorId}`;
      const sessionImages = JSON.parse(sessionStorage.getItem(sessionKey) || "[]");
      
      // Use a placeholder image for "uploaded" images in mock mode
      const newImage: AmbassadorImage = {
        id: mediaId,
        imageUrl: `https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800`, // Generic tech image
        imageType: 0
      };
      
      sessionImages.push(newImage);
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionImages));
    }
  },

  /**
   * Delete image from ambassador gallery
   */
  async deleteAmbassadorImage(ambassadorId: string, imageId: string): Promise<void> {
    try {
      await api.delete(`/ambassadors/${ambassadorId}/images/${imageId}`);
    } catch (err) {
      console.warn("Mocking delete image due to API error");
      // Mark as deleted in session storage
      const deletedKey = `mock_deleted_${ambassadorId}`;
      const deletedIds = JSON.parse(sessionStorage.getItem(deletedKey) || "[]");
      deletedIds.push(imageId);
      sessionStorage.setItem(deletedKey, JSON.stringify(deletedIds));
    }
  },
};

export const projectApi = {
  /**
   * Get all projects for the current user
   */
  async getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");
    return response.data;
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectDto): Promise<string> {
    const response = await api.post<string>("/projects", data);
    return response.data;
  },

  /**
   * Update an existing project
   */
  async updateProject(data: UpdateProjectDto): Promise<void> {
    await api.put(`/projects/${data.id}`, data);
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};

