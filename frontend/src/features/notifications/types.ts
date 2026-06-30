export interface NotificationSettings {
  telegramChatId: number | null;
  telegramUsername: string | null;
  notifyOnlyWhenOffline: boolean;
  notifyOnError: boolean;
  notifyOnHitl: boolean;
  notifyOnCompletion: boolean;
  notifyOnPublication: boolean;
}

export interface UpdateNotificationSettingsRequest {
  notifyOnlyWhenOffline?: boolean;
  notifyOnError?: boolean;
  notifyOnHitl?: boolean;
  notifyOnCompletion?: boolean;
  notifyOnPublication?: boolean;
}

export interface LinkTokenResponse {
  token: string;
  botUsername: string;
}
