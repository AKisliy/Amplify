"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function InstagramCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (code) {
      // Send code to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "INSTAGRAM_OAUTH_SUCCESS",
            code,
          },
          window.location.origin
        );
      }
    } else if (error) {
      // Handle error
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "INSTAGRAM_OAUTH_ERROR",
            error: searchParams.get("error_description") || error,
          },
          window.location.origin
        );
      }
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 text-2xl font-semibold">Connecting Instagram...</div>
        <p className="text-muted-foreground">
          Please wait while we complete the connection.
        </p>
      </div>
    </div>
  );
}
