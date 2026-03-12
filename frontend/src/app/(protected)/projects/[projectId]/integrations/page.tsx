"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { useIntegrations } from "@/features/integrations/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useProjects } from "@/features/ambassadors/hooks/useProjects";
import { Instagram, Loader2, CheckCircle2, Link as LinkIcon } from "lucide-react";

export default function IntegrationsPage() {
    const params = useParams();
    const projectId = params?.projectId as string;
    const { projects, isLoading: projectsLoading } = useProjects();
    const { integrations, isLoading, error, getAuthUrl, disconnectAccount } = useIntegrations(projectId);
    const [redirectingProvider, setRedirectingProvider] = useState<string | null>(null);
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

    const handleConnect = async (provider: string) => {
        try {
            setRedirectingProvider(provider);
            const url = await getAuthUrl(provider);
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                setRedirectingProvider(null);
            }
        } catch (err) {
            console.error(`Failed to get auth URL for ${provider}:`, err);
            setRedirectingProvider(null);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        try {
            setDisconnectingId(accountId);
            await disconnectAccount(accountId);
        } catch (err) {
            console.error("Failed to disconnect:", err);
        } finally {
            setDisconnectingId(null);
        }
    };

    const providers = [
        {
            name: "Instagram",
            description: "Connect your professional account",
            icon: <Instagram className="w-6 h-6 text-white" />,
            bgClass: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
        },
        {
            name: "TikTok",
            description: "Connect your TikTok account",
            icon: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.28 6.28 0 005.4 15.6a6.28 6.28 0 0010.86 4.3v-8.4a8.14 8.14 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.44-.93z"/></svg>,
            bgClass: "bg-black"
        },
        {
            name: "Youtube",
            description: "Connect your YouTube channel",
            icon: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
            bgClass: "bg-red-600"
        }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <ProjectHeader projects={projects} isLoading={projectsLoading} />

            <main className="container mx-auto px-6 py-8 flex-1">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
                        <p className="text-muted-foreground mt-2">
                            Connect your social media accounts to sync data and automate publishing.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {providers.map((provider) => {
                            const providerIntegrations = integrations.filter(i => i.socialProvider === provider.name);
                            const isRedirecting = redirectingProvider === provider.name;

                            return (
                                <Card key={provider.name} className="flex flex-col rounded-[24px] shadow-sm border-border">
                                    <CardHeader className="pb-4 pt-6 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-[20px] ${provider.bgClass} flex items-center justify-center shadow-md shrink-0`}>
                                                {/* Scale up icon slightly to fit the larger box */}
                                                <div className="scale-125">{provider.icon}</div>
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-bold">{provider.name}</CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        {isLoading && !isRedirecting && !disconnectingId ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Checking status...
                                            </div>
                                        ) : providerIntegrations.length > 0 ? (
                                            <div className="flex flex-col gap-4 px-2">
                                                <div className="flex items-center gap-2 text-[14px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 w-fit px-3 py-1.5 rounded-full mb-1">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {providerIntegrations.length} Connected
                                                </div>
                                                <div className="grid gap-3">
                                                    {providerIntegrations.map(integration => (
                                                        <div key={integration.id} className="flex items-center justify-between gap-2 p-2.5 rounded-[16px] border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                                {integration.avatarUrl ? (
                                                                    <img 
                                                                        src={integration.avatarUrl} 
                                                                        alt={integration.username} 
                                                                        className="w-9 h-9 rounded-full border border-border shadow-sm object-cover shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                                                                        <span className="text-muted-foreground font-medium text-sm">
                                                                            {integration.username.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <p className="text-[14px] flex-1 min-w-0">
                                                                    <span className="font-semibold text-foreground break-words">@{integration.username}</span>
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                className="text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold shrink-0 px-2 sm:px-3 h-auto min-h-[32px] rounded-lg text-sm whitespace-normal text-right py-1"
                                                                onClick={() => handleDisconnect(integration.id)}
                                                                disabled={disconnectingId !== null || isLoading}
                                                            >
                                                                {disconnectingId === integration.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : "Disconnect"}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                {provider.description}
                                            </p>
                                        )}
                                        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                                    </CardContent>
                                    <CardFooter className="pt-4 pb-6 px-6">
                                        <Button
                                            className="w-full rounded-[16px] h-auto min-h-[48px] py-2 text-[16px] font-semibold whitespace-normal h-auto leading-tight"
                                            variant={providerIntegrations.length > 0 ? "outline" : "default"}
                                            onClick={() => handleConnect(provider.name)}
                                            disabled={redirectingProvider !== null || isLoading}
                                        >
                                            {isRedirecting ? (
                                                <div className="flex items-center justify-center min-w-0 px-2">
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin shrink-0" />
                                                    <span className="break-words">Redirecting...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center min-w-0 px-2">
                                                    <LinkIcon className="w-4 h-4 mr-2 shrink-0" />
                                                    <span className="break-words">{providerIntegrations.length > 0 ? "Connect another account" : `Connect ${provider.name}`}</span>
                                                </div>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
