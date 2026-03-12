// Autolist types based on backend API

export interface AutoListEntry {
  id: string;
  autoListId: string;
  dayOfWeeks: number; // Bitmask: 1=Sunday, 2=Monday, 4=Tuesday, etc.
  publicationTime: string; // TimeOnly format: "HH:mm:ss"
}

export interface InstagramSettings {
  shareToFeed: boolean;
}

// SocialProvider mirrors the backend enum: Instagram=1, TikTok=2, Youtube=4
export type SocialProviderValue = 1 | 2 | 4;

export const SOCIAL_PROVIDER_NAMES: Record<SocialProviderValue, string> = {
  1: "Instagram",
  2: "TikTok",
  4: "Youtube",
};

export function getSocialProviderName(value: number): string {
  return SOCIAL_PROVIDER_NAMES[value as SocialProviderValue] ?? "Unknown";
}

export interface SocialMediaAccount {
  id: string;
  socialProvider: number; // numeric enum from backend
  username?: string;
  avatarUrl?: string;
}

export interface AutoList {
  id: string;
  name: string;
  entries: AutoListEntry[];
  accounts: SocialMediaAccount[];
  instagramSettings?: InstagramSettings;
  // Computed fields for display
  nextPublishTime?: string;
  postsCount?: number;
}

export interface CreateAutoListDto {
  projectId: string;
  name: string;
  entries: Omit<AutoListEntry, "id" | "autoListId">[];
  instagramSettings?: InstagramSettings;
  accounts: { id: string }[];
}

export interface UpdateAutoListDto {
  id: string;
  name: string;
  instagramSettings?: InstagramSettings;
  accounts: { id: string }[];
}

export interface CreateAutoListEntryDto {
  autoListId: string;
  dayOfWeeks: number;
  publicationTime: string;
}

export interface UpdateAutoListEntryDto {
  id: string;
  dayOfWeeks: number;
  publicationTime: string;
}

// Day of week bitmask helpers
export const DAYS_OF_WEEK = [
  { label: "Su", value: 1, fullName: "Sunday" },
  { label: "Mo", value: 2, fullName: "Monday" },
  { label: "Tu", value: 4, fullName: "Tuesday" },
  { label: "We", value: 8, fullName: "Wednesday" },
  { label: "Th", value: 16, fullName: "Thursday" },
  { label: "Fr", value: 32, fullName: "Friday" },
  { label: "Sa", value: 64, fullName: "Saturday" },
] as const;

export const daysToMask = (selectedDays: number[]): number => {
  return selectedDays.reduce((mask, day) => mask | day, 0);
};

export const maskToDays = (mask: number): number[] => {
  return DAYS_OF_WEEK.filter((day) => (mask & day.value) !== 0).map(
    (day) => day.value
  );
};
