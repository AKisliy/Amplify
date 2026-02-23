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
    const { integrations, isLoading, error, getAuthUrl } = useIntegrations(projectId);

    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleConnectInstagram = async () => {
        try {
            setIsRedirecting(true);
            const url = await getAuthUrl();
            if (url) {
                window.location.href = url;
            }
        } catch (err) {
            console.error("Failed to get auth URL:", err);
            setIsRedirecting(false);
        }
    };

    const instagramIntegration = integrations.find(i => i.socialProvider === 1); // 1 = Instagram based on example

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
                        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                        <p className="text-muted-foreground mt-2">
                            Connect your social media accounts to sync data and automate publishing.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
                                        <Instagram className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle>Instagram</CardTitle>
                                        <CardDescription>Connect your professional account</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Checking status...
                                    </div>
                                ) : instagramIntegration ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-500/10 w-fit px-3 py-1 rounded-full">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Connected
                                        </div>
                                        <p className="text-sm">
                                            Username: <span className="font-semibold text-foreground">@{instagramIntegration.username}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Link your Instagram account to enable automated publishing and sync.
                                    </p>
                                )}
                                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                            </CardContent>
                            <CardFooter className="pt-2">
                                {!instagramIntegration ? (
                                    <Button
                                        className="w-full"
                                        onClick={handleConnectInstagram}
                                        disabled={isRedirecting || isLoading}
                                    >
                                        {isRedirecting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Redirecting...
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon className="w-4 h-4 mr-2" />
                                                Connect Instagram
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button variant="outline" className="w-full mt-2" disabled>
                                        Manage Settings
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
