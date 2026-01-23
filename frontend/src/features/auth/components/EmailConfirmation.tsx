"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { confirmEmail } from "@/features/auth/services/auth.service";

type Status = "loading" | "success" | "error";

export const EmailConfirmation = () => {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const code = searchParams.get("code");

  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const confirm = async () => {
      if (!userId || !code) {
        setStatus("error");
        return;
      }

      try {
        await confirmEmail({ userId, code });
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    confirm();
  }, [userId, code]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Verifying your email
            </CardTitle>
            <CardDescription>
              Please wait while we confirm your email address
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-semibold">
              Verification failed
            </CardTitle>
            <CardDescription>
              The confirmation link is invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-green-600"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold">
              Email confirmed
            </CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now sign in.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Link href="/login">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
