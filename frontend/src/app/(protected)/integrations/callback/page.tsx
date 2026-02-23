"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { integrationsApi } from "@/features/integrations/services/api";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [projectId, setProjectId] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams?.get("code");
            const state = searchParams?.get("state");

            if (!code || !state) {
                setStatus("error");
                setErrorMsg("Missing code or state parameters.");
                return;
            }

            try {
                // Decode state (handling Base64 and Base64Url)
                let base64 = state.replace(/-/g, '+').replace(/_/g, '/');
                while (base64.length % 4) {
                    base64 += '=';
                }

                let decodedStateStr = "";
                try {
                    decodedStateStr = decodeURIComponent(escape(atob(base64)));
                } catch {
                    decodedStateStr = atob(base64);
                }

                const stateObj = JSON.parse(decodedStateStr);

                // Casing could be projectId or ProjectId depending on backend serialization
                const pId = stateObj.projectId || stateObj.ProjectId;

                if (!pId) {
                    throw new Error("Project ID not found in state.");
                }

                setProjectId(pId);

                // Call our backend to connect instagram
                await integrationsApi.connectInstagram(pId, code);

                setStatus("success");

                // Redirect back to project integrations page after a short delay
                setTimeout(() => {
                    router.push(`/projects/${pId}/integrations`);
                }, 3000);
            } catch (err: any) {
                console.error("Callback error:", err);
                setStatus("error");
                setErrorMsg(err.message || "Failed to complete integration. Invalid state or connection error.");
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 w-full max-w-md mx-auto">
            {status === "loading" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                    <h2 className="text-2xl font-semibold">Connecting Instagram...</h2>
                    <p className="text-muted-foreground">Please wait while we verify your account.</p>
                </motion.div>
            )}

            {status === "success" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-semibold">Connected Successfully!</h2>
                    <p className="text-muted-foreground">Your Instagram account is now linked to the project.</p>
                    <p className="text-sm text-muted-foreground animate-pulse mt-2">Redirecting you back...</p>
                </motion.div>
            )}

            {status === "error" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-semibold">Connection Failed</h2>
                    <p className="text-muted-foreground">{errorMsg}</p>

                    <Button
                        className="mt-6"
                        variant="outline"
                        onClick={() => projectId ? router.push(`/projects/${projectId}/integrations`) : router.push("/dashboard")}
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Return to Dashboard
                    </Button>
                </motion.div>
            )}
        </div>
    );
}

export default function IntegrationsCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
            }>
                <CallbackContent />
            </Suspense>
        </div>
    );
}
