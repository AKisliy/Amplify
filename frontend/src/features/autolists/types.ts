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

// socialProvider serialized as string by backend
export type SocialProviderName = "Instagram" | "TikTok" | "Youtube";

export interface SocialMediaAccount {
  id: string;
  socialProvider: SocialProviderName | string;
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

export const calculateNextPublishTime = (entries: AutoListEntry[]): string | undefined => {
  if (!entries || entries.length === 0) return undefined;

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday...
  const currentDayMask = 1 << currentDay;

  let soonest: Date | null = null;

  entries.forEach((entry) => {
    const [hours, minutes, seconds] = entry.publicationTime.split(":").map(Number);
    
    // Check each day of the week
    for (let i = 0; i < 7; i++) {
        const targetDayIdx = (currentDay + i) % 7;
        const targetDayMask = 1 << targetDayIdx;
        
        if ((entry.dayOfWeeks & targetDayMask) !== 0) {
            const scheduledDate = new Date(now);
            scheduledDate.setDate(now.getDate() + i);
            scheduledDate.setHours(hours, minutes, seconds || 0, 0);

            // If it's today but already passed, move to next week for this day
            if (i === 0 && scheduledDate < now) {
                // Skip today if time passed
                continue;
            }

            if (!soonest || scheduledDate < soonest) {
                soonest = scheduledDate;
            }
            
            // Found the next occurrence for this entry, no need to check further days for this entry
            break;
        }
    }
  });

  if (!soonest) return undefined;

  const soonestDate = soonest as Date;
  // Format nicely: "Tomorrow, 12:00 PM" or "Monday, 10:00 AM"
  const diffDays = Math.floor((soonestDate.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
  
  const timeStr = soonestDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Tomorrow, ${timeStr}`;
  
  const dayName = soonestDate.toLocaleDateString([], { weekday: 'long' });
  return `${dayName}, ${timeStr}`;
};
