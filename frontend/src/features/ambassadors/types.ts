export type ReferenceImage = {
  id: string;
  media_id: string;
  image_type: "portrait" | "full_body" | "other";
};

export type Ambassador = {
  id: string;
  name: string;
  appearance_description?: string | null;
  voice_description?: string | null;
  voice_id?: string | null;
  reference_images: ReferenceImage[];
};

export type CreateAmbassadorPayload = {
  name: string;
  project_id: string;
  appearance_description?: string | null;
  voice_description?: string | null;
  voice_id?: string | null;
};

export type UpdateAmbassadorPayload = {
  id: string;
  name?: string | null;
  appearance_description?: string | null;
  voice_description?: string | null;
  voice_id?: string | null;
};

// DTO type aliases
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

// Project Asset types
export type AssetMediaType = "Image" | "Video";

export type ProjectAsset = {
  id: string;
  mediaId: string;
  templateId?: string | null;
  mediaType: AssetMediaType;
  mediaUrl: string;
  createdAt: string;
};

// Publication types
export type SocialAccountSummary = {
  id: string;
  socialProvider: string;
  username: string;
  avatarUrl?: string | null;
};

export type PublicationRecord = {
  id: string;
  status: string;
  provider: string;
  publicationType: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  publicUrl?: string | null;
  createdAt?: string | null;
  socialAccount: SocialAccountSummary;
};

// Template types
export type Template = {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  thumbnailUrl?: string | null;
  createdAt?: string;
};

export type TemplateNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

export type TemplateEdge = {
  id: string;
  source: string;
  target: string;
};

export type TemplateDetail = {
  id: string;
  name: string;
  projectId: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
};
