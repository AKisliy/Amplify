"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Heart,
  MessageCircle,
  Music2,
  Send,
  Bookmark,
  MoreHorizontal,
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getApiConnections,
  postApiPublicationsVideo,
  type FullSocialAccountDto,
  type PublicationRecordResponseDto,
} from "@/lib/api/publisher";
import type { PublicationRecord } from "@/features/ambassadors/types";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
  onPublished: (records: PublicationRecord[]) => void;
  projectId: string;
  assetId: string;
  assetName?: string;
  mediaUrl: string;
  mediaType: "Video" | "Image";
}

type ScheduleMode = "now" | "schedule";

// ---------------------------------------------------------------------------
// Platform glyphs
// ---------------------------------------------------------------------------

function InstagramGlyph({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokGlyph({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.12z" />
    </svg>
  );
}

function PlatformBadge({ provider, size = 16 }: { provider: string; size?: number }) {
  const isInstagram = provider.toLowerCase() === "instagram";
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: isInstagram
          ? "linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)"
          : "#000",
        boxShadow: "0 0 0 2px var(--card, #1a1a1a)",
      }}
    >
      {isInstagram ? (
        <InstagramGlyph size={size * 0.55} className="text-white" />
      ) : (
        <TikTokGlyph size={size * 0.55} className="text-white" />
      )}
    </span>
  );
}

function AccountAvatar({
  account,
  size = 40,
  badgeSize = 16,
  ring = false,
}: {
  account: FullSocialAccountDto;
  size?: number;
  badgeSize?: number;
  ring?: boolean;
}) {
  const username = account.username ?? "?";
  return (
    <span className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      <span
        className="block w-full h-full rounded-full overflow-hidden"
        style={ring ? { boxShadow: "0 0 0 2px oklch(0.62 0.21 264)" } : undefined}
      >
        {account.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
              {username[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </span>
      <span className="absolute -right-0.5 -bottom-0.5">
        <PlatformBadge provider={account.socialProvider ?? "instagram"} size={badgeSize} />
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Platform preview (9:16 phone chrome)
// ---------------------------------------------------------------------------

function InstagramReelPreview({ account, description, mediaUrl, mediaType }: {
  account: FullSocialAccountDto;
  description: string;
  mediaUrl: string;
  mediaType: "Video" | "Image";
}) {
  const username = account.username ?? "unknown";
  const avatar = account.avatarUrl;
  const desc = description.trim() || "Write a caption to see it here…";

  return (
    <div className="relative w-full h-full bg-black rounded-[28px] overflow-hidden">
      {/* Media */}
      {mediaType === "Video" ? (
        <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" loop muted playsInline autoPlay />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {/* Bottom gradient */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.85))" }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-4 pb-2 flex items-center justify-between text-white">
        <span className="text-[17px] font-bold">Reels</span>
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
      </div>

      {/* Right action rail */}
      <div className="absolute right-2 bottom-8 flex flex-col items-center gap-4 text-white">
        {[Heart, MessageCircle, Send, Bookmark, MoreHorizontal].map((Icon, i) => (
          <Icon key={i} className="w-6 h-6" strokeWidth={1.8} />
        ))}
        <div className="w-7 h-7 rounded-md overflow-hidden border border-white/50 mt-1">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/20" />
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-14 text-white space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full overflow-hidden border border-white/50 flex-shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20" />
            )}
          </span>
          <span className="text-[13px] font-semibold">{username}</span>
        </div>
        <p className="text-[12px] leading-snug line-clamp-2">{desc}</p>
        <div className="flex items-center gap-1 text-[11px] opacity-90">
          <Music2 className="w-3 h-3" />
          <span>Original audio · {username}</span>
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ account, description, mediaUrl, mediaType }: {
  account: FullSocialAccountDto;
  description: string;
  mediaUrl: string;
  mediaType: "Video" | "Image";
}) {
  const username = account.username ?? "unknown";
  const avatar = account.avatarUrl;
  const desc = description.trim() || "Write a caption to see it here…";

  return (
    <div className="relative w-full h-full bg-black rounded-[28px] overflow-hidden">
      {mediaType === "Video" ? (
        <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" loop muted playsInline autoPlay />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.7))" }} />

      {/* Top: Following | For You */}
      <div className="absolute top-0 left-0 right-0 pt-4 pb-2 flex items-center justify-center gap-6 text-white text-[14px] font-semibold">
        <span className="opacity-70">Following</span>
        <span className="relative">
          For You
          <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />
        </span>
      </div>

      {/* Right rail */}
      <div className="absolute right-2 bottom-8 flex flex-col items-center gap-4 text-white">
        <div className="relative">
          <span className="block w-10 h-10 rounded-full border-2 border-white overflow-hidden">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20" />
            )}
          </span>
          <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#fe2c55] flex items-center justify-center text-white text-xs font-bold">+</span>
        </div>
        {[
          { Icon: Heart, label: "128K" },
          { Icon: MessageCircle, label: "2.1K" },
          { Icon: Bookmark, label: "5.2K" },
          { Icon: Send, label: "Share" },
        ].map(({ Icon, label }, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Icon className="w-7 h-7" strokeWidth={1.8} />
            <span className="text-[11px] font-semibold">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-14 text-white space-y-1">
        <p className="text-[14px] font-bold">{username}</p>
        <p className="text-[13px] leading-snug line-clamp-3">{desc}</p>
        <div className="flex items-center gap-1 text-[12px] opacity-90">
          <Music2 className="w-3 h-3" />
          <span>original sound · {username}</span>
        </div>
      </div>
    </div>
  );
}

function PlatformPreview(props: { account: FullSocialAccountDto; description: string; mediaUrl: string; mediaType: "Video" | "Image" }) {
  return props.account.socialProvider?.toLowerCase() === "tiktok"
    ? <TikTokPreview {...props} />
    : <InstagramReelPreview {...props} />;
}

// ---------------------------------------------------------------------------
// Preview carousel
// ---------------------------------------------------------------------------

function PreviewCarousel({ accounts, activeIdx, onSelect }: {
  accounts: FullSocialAccountDto[];
  activeIdx: number;
  onSelect: (i: number) => void;
}) {
  if (accounts.length <= 1) return null;
  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-sm">
      <button
        className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors"
        onClick={() => onSelect((activeIdx - 1 + accounts.length) % accounts.length)}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2">
        {accounts.map((a, i) => (
          <button
            key={a.id}
            title={a.username ?? ""}
            onClick={() => onSelect(i)}
            className="transition-transform duration-150"
            style={{ transform: i === activeIdx ? "scale(1.1)" : "scale(1)" }}
          >
            <AccountAvatar account={a} size={i === activeIdx ? 32 : 26} badgeSize={i === activeIdx ? 13 : 11} ring={i === activeIdx} />
          </button>
        ))}
      </div>
      <button
        className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors"
        onClick={() => onSelect((activeIdx + 1) % accounts.length)}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini calendar popover
// ---------------------------------------------------------------------------

function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const today = new Date();
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const monthName = new Date(view.y, view.m).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isSel = (d: number) => value.getFullYear() === view.y && value.getMonth() === view.m && value.getDate() === d;
  const isTd = (d: number) => today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;
  const isPast = (d: number) => new Date(view.y, view.m, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-2xl" style={{ width: 252 }}>
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/60 hover:bg-white/[0.06] transition-colors"
          onClick={() => setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">{monthName}</span>
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/60 hover:bg-white/[0.06] transition-colors"
          onClick={() => setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const sel = isSel(d), td = isTd(d), past = isPast(d);
          return (
            <button
              key={i}
              disabled={past}
              onClick={() => onChange(new Date(view.y, view.m, d))}
              className={cn(
                "h-8 rounded-md text-xs font-medium transition-colors",
                sel && "bg-primary text-primary-foreground",
                !sel && td && "bg-secondary text-foreground",
                !sel && !td && !past && "hover:bg-secondary text-foreground",
                past && "text-muted-foreground opacity-35 cursor-not-allowed",
                sel && "font-semibold"
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map DTO → PublicationRecord (same as in projectApi)
// ---------------------------------------------------------------------------

function mapRecord(dto: PublicationRecordResponseDto): PublicationRecord {
  return {
    id: dto.id ?? "",
    status: dto.status ?? "None",
    provider: dto.provider ?? "Unknown",
    publicationType: dto.publicationType ?? "Manual",
    scheduledAt: dto.scheduledAt ?? null,
    publishedAt: dto.publishedAt ?? null,
    publicUrl: dto.publicUrl ?? null,
    createdAt: dto.createdAt ?? null,
    description: dto.description ?? null,
    socialAccount: {
      id: dto.socialAccount?.id ?? "",
      socialProvider: dto.socialAccount?.socialProvider ?? "Unknown",
      username: dto.socialAccount?.username ?? "",
      avatarUrl: dto.socialAccount?.avatarUrl ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function PublishDialog({ open, onClose, onPublished, projectId, assetId, assetName, mediaUrl, mediaType }: Props) {
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<FullSocialAccountDto[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [scheduledTime, setScheduledTime] = useState("09:30");
  const [calOpen, setCalOpen] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const calRef = useRef<HTMLDivElement>(null);

  // Fetch connections when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingAccounts(true);
    getApiConnections({ path: { projectId } })
      .then(({ data }) => {
        setAccounts(data?.connections ?? []);
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [open, projectId]);

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return;
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calOpen]);

  // Keep activePreviewIdx valid
  const selectedAccounts = accounts.filter(a => selectedIds.has(a.id ?? ""));
  useEffect(() => {
    if (activePreviewIdx >= selectedAccounts.length) setActivePreviewIdx(0);
  }, [selectedAccounts.length, activePreviewIdx]);

  const toggleAccount = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasInstagram = selectedAccounts.some(a => a.socialProvider?.toLowerCase() === "instagram");
  const previewAccount = selectedAccounts[activePreviewIdx] ?? selectedAccounts[0];

  const dateLabel = scheduledDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const canSubmit = selectedAccounts.length > 0 && description.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    let scheduledAt: string | null = null;
    if (scheduleMode === "schedule") {
      const [h, m] = scheduledTime.split(":").map(Number);
      const dt = new Date(scheduledDate);
      dt.setHours(h, m, 0, 0);
      scheduledAt = dt.toISOString();
    }

    const { data, error } = await postApiPublicationsVideo({
      body: {
        mediaPostId: assetId,
        accountIds: [...selectedIds],
        description,
        coverMediaId: null,
        scheduledAt,
        instagramSettings: hasInstagram ? { shareToFeed } : null,
      },
    });

    setSubmitting(false);

    if (error || !data) {
      toast({ variant: "destructive", title: "Publication failed", description: "Please try again." });
      return;
    }

    onPublished(data.map(mapRecord));
    onClose();
    toast({
      title: scheduleMode === "now" ? "Publishing…" : "Scheduled",
      description: scheduleMode === "now"
        ? "Your post is being published."
        : `Scheduled for ${dateLabel} at ${scheduledTime}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 border-border bg-card max-w-none sm:max-w-none w-[min(960px,96vw)] overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Publish to social media</DialogTitle>

        <div className="grid grid-cols-2" style={{ height: "min(720px, 90vh)" }}>

          {/* ── LEFT: Preview ── */}
          <div
            className="flex flex-col items-center gap-4 p-6 border-r border-border overflow-y-auto"
            style={{ background: "oklch(0.20 0.02 264)" }}
          >
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Preview
              </span>
              {previewAccount && (
                <span className="flex items-center gap-1.5">
                  {previewAccount.socialProvider?.toLowerCase() === "tiktok"
                    ? <TikTokGlyph size={12} />
                    : <InstagramGlyph size={12} />}
                  {previewAccount.socialProvider?.toLowerCase() === "tiktok" ? "TikTok" : "Instagram Reels"}
                </span>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center min-h-0 w-full">
              {previewAccount ? (
                <div
                  style={{
                    height: "min(520px, calc(100% - 8px))",
                    aspectRatio: "9 / 16",
                    boxShadow: "0 25px 60px -10px rgba(0,0,0,0.7), 0 0 0 8px #1a1a1a, 0 0 0 9px #2a2a2a",
                    borderRadius: 28,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <PlatformPreview
                    account={previewAccount}
                    description={description}
                    mediaUrl={mediaUrl}
                    mediaType={mediaType}
                  />
                </div>
              ) : (
                <div
                  className="border border-dashed border-white/10 rounded-[28px] flex items-center justify-center"
                  style={{ height: "min(520px, calc(100% - 8px))", aspectRatio: "9 / 16" }}
                >
                  <p className="text-xs text-muted-foreground text-center px-4">Select an account to preview</p>
                </div>
              )}
            </div>

            {selectedAccounts.length > 1 ? (
              <PreviewCarousel accounts={selectedAccounts} activeIdx={activePreviewIdx} onSelect={setActivePreviewIdx} />
            ) : selectedAccounts.length === 1 ? (
              <p className="text-xs text-muted-foreground">
                Posting to <span className="text-foreground font-semibold">{previewAccount?.username}</span>
              </p>
            ) : null}
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="flex flex-col min-h-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border pr-12">
              <p className="text-base font-semibold">Publish to social media</p>
              {assetName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Film className="w-3 h-3" />
                  {assetName}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Accounts */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5 tracking-[0.01em]">Accounts</p>
                {loadingAccounts ? (
                  <div className="space-y-2">
                    {[0, 1].map(i => (
                      <div key={i} className="h-14 rounded-lg bg-white/[0.04] animate-pulse" />
                    ))}
                  </div>
                ) : accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No connected accounts. Add them in{" "}
                    <span className="text-foreground font-medium">Connections</span>.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {accounts.map(a => {
                      const id = a.id ?? "";
                      const selected = selectedIds.has(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleAccount(id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left",
                            selected
                              ? "border-primary/50 bg-primary/10"
                              : "border-border bg-black/15 hover:border-white/15 hover:bg-black/25"
                          )}
                        >
                          <span className={cn(
                            "w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 transition-all border",
                            selected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-black/20"
                          )}>
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                          <AccountAvatar account={a} size={32} badgeSize={13} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[13px] font-semibold leading-snug truncate">{a.username}</span>
                            <span className="text-[11px] text-muted-foreground capitalize">{a.socialProvider}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-foreground tracking-[0.01em]">Description</p>
                  <span className={cn("text-[11px]", description.length > 2200 ? "text-destructive" : "text-muted-foreground")}>
                    {description.length} / 2200
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 2300))}
                  placeholder="Write a caption…"
                  className="resize-none text-sm"
                />
              </div>

              {/* Publish mode */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5 tracking-[0.01em]">Publish</p>
                <div className="flex p-0.5 rounded-lg border border-border bg-black/30 w-full">
                  {(["now", "schedule"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setScheduleMode(mode)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-sm font-medium transition-all",
                        scheduleMode === mode
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {mode === "now" ? <Zap className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {mode === "now" ? "Now" : "Schedule"}
                    </button>
                  ))}
                </div>

                {scheduleMode === "schedule" && (
                  <div className="mt-2.5 flex gap-2 items-start relative" ref={calRef}>
                    <button
                      onClick={() => setCalOpen(o => !o)}
                      className="flex-1 h-9 flex items-center gap-2 px-3 rounded-md border border-border bg-black/20 text-sm font-medium hover:bg-black/30 transition-colors text-left"
                    >
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {dateLabel}
                    </button>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-28 flex-none h-9"
                    />
                    {calOpen && (
                      <div className="absolute top-11 left-0 z-50">
                        <MiniCalendar value={scheduledDate} onChange={d => { setScheduledDate(d); setCalOpen(false); }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instagram settings */}
              {hasInstagram && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <InstagramGlyph size={12} />
                    Instagram options
                  </p>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="text-sm">Share to feed</p>
                      <p className="text-[11px] text-muted-foreground">Also show this Reel on the main grid</p>
                    </div>
                    <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {selectedAccounts.length === 0
                  ? "No accounts selected"
                  : `${selectedAccounts.length} account${selectedAccounts.length > 1 ? "s" : ""} selected`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="gap-1.5"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : scheduleMode === "now" ? (
                    <Send className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  {scheduleMode === "now" ? "Publish now" : "Schedule"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
