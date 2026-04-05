"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, CheckCircle2, Lock, Info } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { resetPassword as resetPasswordService } from "@/features/auth/services/auth.service";
import { AuthMotionWrapper, FadeInStagger } from "./AuthMotionWrapper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PASSWORD_REQUIREMENTS = [
  "At least 6 characters",
  "At least one uppercase letter (A–Z)",
  "At least one lowercase letter (a–z)",
  "At least one digit (0–9)",
  "At least one non-alphanumeric character (e.g. @, !, #)",
];

const PasswordTooltip = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
        <Info className="w-3.5 h-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-64 text-sm" side="top">
      <p className="font-medium mb-2">Password requirements:</p>
      <ul className="space-y-1 text-muted-foreground">
        {PASSWORD_REQUIREMENTS.map((req) => (
          <li key={req} className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">•</span>
            {req}
          </li>
        ))}
      </ul>
    </PopoverContent>
  </Popover>
);

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter (A–Z)")
    .regex(/[a-z]/, "Must contain at least one lowercase letter (a–z)")
    .regex(/[0-9]/, "Must contain at least one digit (0–9)")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one non-alphanumeric character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Get code and email from URL params
  const code = searchParams?.get("code") || "";
  const email = searchParams?.get("email") || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setServerError(null);
      
      // Use URL params for email and code
      await resetPasswordService({
        email: email,
        resetCode: code,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch (error: any) {
      const data = error?.response?.data;
      const errorMessage =
        data?.message ||
        data?.title ||
        (data?.errors ? Object.values(data.errors as Record<string, string[]>).flat().join(" ") : null) ||
        "Something went wrong. Please try again.";
      setServerError(errorMessage);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh p-4">
        <AuthMotionWrapper>
          <Card className="w-full max-w-md glass-card text-center py-8">
            <CardHeader className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <CardTitle className="text-3xl font-bold">Password reset successful</CardTitle>
              <CardDescription className="text-lg">
                Your password has been successfully updated.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center pt-8">
              <Link href="/login">
                <Button className="h-12 px-8 rounded-xl font-semibold transition-all shadow-lg hover:shadow-primary/20">
                  Go to sign in
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </AuthMotionWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh p-4">
      <AuthMotionWrapper>
        <Card className="w-full max-w-md glass-card mx-auto">
          <CardHeader className="space-y-2 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-center">
              Set new password
            </CardTitle>
            <CardDescription className="text-base text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FadeInStagger>
                {/* Show email as read-only for context */}
                {email && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="h-11 px-3 rounded-md bg-muted/50 flex items-center text-sm text-muted-foreground">
                      {email}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <PasswordTooltip />
                  </div>
                  <Input
                    id="newPassword"
                    className="h-12 bg-white/50 dark:bg-black/20"
                    type="password"
                    autoComplete="new-password"
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    className="h-12 bg-white/50 dark:bg-black/20"
                    type="password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : (
                    <>
                      Update password <Lock className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </FadeInStagger>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Cancel and return to sign in
            </Link>
          </CardFooter>
        </Card>
      </AuthMotionWrapper>
    </div>
  );
};
