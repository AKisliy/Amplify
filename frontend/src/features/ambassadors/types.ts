export interface Ambassador {
  id: string;
  name: string;
  biography?: string | null;
  behavioralPatterns?: string | null;
  projectId: string;
}

export interface CreateAmbassadorDto {
  name: string;
  biography?: string;
  behavioralPatterns?: string;
  projectId: string;
}

export interface UpdateAmbassadorDto {
  id: string;
  name: string;
  biography?: string;
  behavioralPatterns?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  photo?: string | null;
  ambassadorId?: string | null; // Optional: ID of the ambassador for this project
}

export interface AmbassadorImage {
  id: string; // The linking ID
  imageUrl: string;
  imageType: number; // 0 = Gallery
}

