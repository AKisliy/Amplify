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
