export type Ambassador = {
  id: string;
  name: string;
  biography?: string | null;
  behavioralPatterns?: string | null;
};

export type CreateAmbassadorPayload = {
  name: string;
  biography?: string | null;
  behavioralPatterns?: string | null;
  projectId: string;
};

export type UpdateAmbassadorPayload = {
  id: string;
  name: string;
  biography?: string | null;
  behavioralPatterns?: string | null;
};

// DTO type aliases for API compatibility
export type CreateAmbassadorDto = CreateAmbassadorPayload;
export type UpdateAmbassadorDto = UpdateAmbassadorPayload;

// Project types
export type Project = {
  id: string;
  name: string;
  description?: string | null;
  photo?: string | null;
  ambassadorId?: string | null;
};

export type CreateProjectDto = {
  name: string;
  description?: string | null;
  photo?: string | null;
};

export type UpdateProjectDto = {
  id: string;
  name: string;
  description?: string | null;
  photo?: string | null;
};

// Ambassador Image types
export type AmbassadorImage = {
  id: string;
  imageUrl: string;
  imageType: number;
};
