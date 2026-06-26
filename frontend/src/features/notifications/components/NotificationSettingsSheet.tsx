"use client";

import { useState } from "react";
import { ExternalLink, Send, Unlink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import type { UpdateSettingsRequest } from "@/lib/api/ws-gateway";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsSheet({ open, onOpenChange }: Props) {
  const { settings, loading, error, load, update, generateTelegramLink, unlinkTelegram } =
    useNotificationSettings();

  const handleOpenChange = (next: boolean) => {
    if (next) load();
    onOpenChange(next);
  };
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const handleToggle = async (field: keyof UpdateSettingsRequest, value: boolean) => {
    try {
      await update({ [field]: value });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save setting" });
    }
  };

  const handleLinkTelegram = async () => {
    setLinking(true);
    try {
      const { token, botUsername } = await generateTelegramLink();
      const url = `https://t.me/${botUsername}?start=${token}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate Telegram link" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setUnlinking(true);
    try {
      await unlinkTelegram();
      toast({ title: "Telegram unlinked" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to unlink Telegram" });
    } finally {
      setUnlinking(false);
    }
  };

  const isTelegramLinked = !!settings?.telegramChatId;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notification Settings</SheetTitle>
          <SheetDescription>
            Configure how and when you receive pipeline notifications.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Telegram section */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Telegram</p>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : isTelegramLinked ? (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    @{settings?.telegramUsername ?? "linked"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlinkTelegram}
                  disabled={unlinking}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="mr-1.5 h-3.5 w-3.5" />
                  Unlink
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLinkTelegram}
                disabled={linking}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Link Telegram account
              </Button>
            )}
          </div>

          <Separator />

          {/* Toggle settings */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Notify me when...</p>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="space-y-3">
                <ToggleRow
                  label="Pipeline completes"
                  checked={settings?.notifyOnCompletion ?? false}
                  onChange={(v) => handleToggle("notifyOnCompletion", v)}
                />
                <ToggleRow
                  label="Error occurs"
                  checked={settings?.notifyOnError ?? false}
                  onChange={(v) => handleToggle("notifyOnError", v)}
                />
                <ToggleRow
                  label="Manual review required"
                  checked={settings?.notifyOnHitl ?? false}
                  onChange={(v) => handleToggle("notifyOnHitl", v)}
                />
                <ToggleRow
                  label="Publication finishes"
                  checked={settings?.notifyOnPublication ?? false}
                  onChange={(v) => handleToggle("notifyOnPublication", v)}
                />

                <Separator />

                <ToggleRow
                  label="Only when I'm offline"
                  description="Skip notifications if you're already viewing the pipeline"
                  checked={settings?.notifyOnlyWhenOffline ?? false}
                  onChange={(v) => handleToggle("notifyOnlyWhenOffline", v)}
                />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
