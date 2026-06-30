"use client";

import { useCallback, useState } from "react";
import {
  getApiNotificationsSettings,
  patchApiNotificationsSettings,
  postApiNotificationsTelegramLinkToken,
  deleteApiNotificationsTelegram,
  type NotificationSettingsDto,
  type UpdateSettingsRequest,
} from "@/lib/api/ws-gateway";

export function useNotificationSettings() {
  const [state, setState] = useState<{
    settings: NotificationSettingsDto | null;
    loading: boolean;
    error: string | null;
  }>({ settings: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState({ settings: null, loading: true, error: null });
    const { data, error: err } = await getApiNotificationsSettings();
    if (err || !data) {
      setState({ settings: null, loading: false, error: "Failed to load notification settings" });
    } else {
      setState({ settings: data, loading: false, error: null });
    }
  }, []);

  const update = useCallback(async (patch: UpdateSettingsRequest) => {
    const { error: err } = await patchApiNotificationsSettings({ body: patch });
    if (err) throw new Error("Failed to update settings");
    setState((prev) => ({
      ...prev,
      settings: prev.settings ? { ...prev.settings, ...patch } : prev.settings,
    }));
  }, []);

  const generateTelegramLink = useCallback(async () => {
    const { data, error: err } = await postApiNotificationsTelegramLinkToken();
    if (err || !data) throw new Error("Failed to generate link");
    return data;
  }, []);

  const unlinkTelegram = useCallback(async () => {
    const { error: err } = await deleteApiNotificationsTelegram();
    if (err) throw new Error("Failed to unlink Telegram");
    setState((prev) => ({
      ...prev,
      settings: prev.settings
        ? { ...prev.settings, telegramChatId: null, telegramUsername: null }
        : prev.settings,
    }));
  }, []);

  return { ...state, load, update, generateTelegramLink, unlinkTelegram };
}
