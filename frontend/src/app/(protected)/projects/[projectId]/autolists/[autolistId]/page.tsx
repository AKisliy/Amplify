"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Instagram, Clock, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAutolist } from "@/features/autolists/hooks/useAutolist";
import { useIntegrations } from "@/features/integrations/hooks/useIntegrations";
import { TimeSlotRow } from "@/features/autolists/components/TimeSlotRow";
import type { AutoListEntry } from "@/features/autolists/types";

export default function AutolistDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const autolistId = params?.autolistId as string;

  const {
    autolist,
    isLoading,
    updateAutolist,
    createAutolist,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useAutolist(autolistId);

  const { integrations } = useIntegrations(projectId);
  const instagramIntegrations = integrations.filter(i => i.socialProvider === 1);

  const [name, setName] = useState("");
  const [autoPublish, setAutoPublish] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Sync local state with autolist data
  useEffect(() => {
    if (autolist) {
      setName(autolist.name || "");
      setShareToFeed(autolist.instagramSettings?.shareToFeed ?? false);
      if (autolist.accounts && autolist.accounts.length > 0) {
        setSelectedAccountId(autolist.accounts[0].id);
      } else if (instagramIntegrations.length > 0) {
        // Default to first available integration if none selected
        setSelectedAccountId(instagramIntegrations[0].id);
      }
      setHasChanges(false);
    }
  }, [autolist, instagramIntegrations]);

  // Track changes
  useEffect(() => {
    if (autolist) {
      const nameChanged = name !== autolist.name;
      const shareToFeedChanged = shareToFeed !== (autolist.instagramSettings?.shareToFeed ?? false);
      const accountChanged = selectedAccountId !== (autolist.accounts?.[0]?.id ?? "");
      setHasChanges(nameChanged || shareToFeedChanged || accountChanged);
    }
  }, [name, shareToFeed, selectedAccountId, autolist]);

  const handleBack = () => {
    router.push(`/projects/${projectId}/autolists`);
  };

  const handleSave = async () => {
    if (!autolist || (!hasChanges && autolistId !== "new")) return;

    setIsSaving(true);
    try {
      const accountsToSave = selectedAccountId ? [{ id: selectedAccountId }] : [];

      if (autolistId === "new") {
        const newId = await createAutolist({
          projectId,
          name: name || "New Autolist",
          instagramSettings: { shareToFeed },
          entries: [],
          accounts: accountsToSave,
        });
        // Navigate to the newly created autolist
        router.replace(`/projects/${projectId}/autolists/${newId}`);
      } else {
        await updateAutolist({
          id: autolistId,
          name,
          instagramSettings: { shareToFeed },
          accounts: accountsToSave,
        });
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameBlur = () => {
    // Name changes are tracked by useEffect, no need to save immediately
  };

  const handleAddTimeSlot = () => {
    addEntry({
      autoListId: autolistId,
      dayOfWeeks: 62, // Mon-Fri by default
      publicationTime: "12:00:00",
    });
  };

  const handleUpdateEntry = (id: string, data: Partial<AutoListEntry>) => {
    updateEntry(id, data);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-32">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!autolist) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-32">
          <div className="text-muted-foreground">Autolist not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-muted/80"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="Autolist name"
                  className="text-xl font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border-pink-200/50 px-3 py-1.5"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </Badge>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2 shadow-md"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    {hasChanges && (
                      <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-6 max-w-4xl">
        {/* Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggles Row */}
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <Switch
                    id="auto-publish"
                    checked={autoPublish}
                    onCheckedChange={setAutoPublish}
                  />
                  <Label htmlFor="auto-publish" className="cursor-pointer text-sm font-medium">
                    Auto publish
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="repeat"
                    checked={repeat}
                    onCheckedChange={setRepeat}
                  />
                  <Label htmlFor="repeat" className="cursor-pointer text-sm font-medium">
                    Repeat
                  </Label>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Presets Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Presets
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Global presets</Label>
                    <Select defaultValue="default">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="preset1">Business Hours</SelectItem>
                        <SelectItem value="preset2">Peak Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Instagram presets</Label>
                    <Select defaultValue="default">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="reels">Reels Optimized</SelectItem>
                        <SelectItem value="stories">Stories Focus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Instagram Account</Label>
                    <Select
                      value={selectedAccountId}
                      onValueChange={setSelectedAccountId}
                      disabled={instagramIntegrations.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={instagramIntegrations.length === 0 ? "No accounts linked" : "Select account"} />
                      </SelectTrigger>
                      <SelectContent>
                        {instagramIntegrations.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            @{acc.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {instagramIntegrations.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect an <a href={`/projects/${projectId}/integrations`} className="text-primary underline">Instagram account</a> to publish.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <Switch
                    id="share-to-feed"
                    checked={shareToFeed}
                    onCheckedChange={setShareToFeed}
                  />
                  <Label htmlFor="share-to-feed" className="cursor-pointer text-sm">
                    Share to feed
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Timing</CardTitle>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Europe/Moscow</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Slots */}
              {autolist.entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time slots configured. Add one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {autolist.entries.map((entry) => (
                    <TimeSlotRow
                      key={entry.id}
                      entry={entry}
                      onUpdate={handleUpdateEntry}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                </div>
              )}

              {/* Add Time Slot Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTimeSlot}
                className="w-full gap-2 border-dashed border-2 hover:bg-muted/50 hover:border-primary/50 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Time Slot
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
