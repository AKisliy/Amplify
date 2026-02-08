export type InstagramAuthUrl = {
  url: string;
};

export type SocialAccount = {
  id: string;
  projectId: string;
  username: string;
  provider: 'Instagram' | 'Facebook' | 'Twitter' | 'TikTok';
  tokenExpiresAt: string;
  createdAt: string;
};

export type ProjectIntegrations = {
  projectId: string;
  socialAccounts: SocialAccount[];
};
