"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

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

import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "./reset-password.schema";

import { resetPassword as resetPasswordService } from "@/features/auth/services/auth.service";
import { AuthMotionWrapper, FadeInStagger } from "./AuthMotionWrapper";

export const ResetPasswordForm = () => {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      await resetPasswordService({
        email: values.email,
        resetCode: values.resetCode,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch {
      setServerError("Reset failed. Check the code and try again.");
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
              New password
            </CardTitle>
            <CardDescription className="text-base text-center">
              Enter the reset code and choose a new password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FadeInStagger>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    className="h-11 bg-white/50 dark:bg-black/20"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetCode">Reset code</Label>
                  <Input
                    id="resetCode"
                    className="h-11 bg-white/50 dark:bg-black/20 font-mono tracking-widest"
                    type="text"
                    autoComplete="off"
                    {...register("resetCode")}
                    placeholder="Enter code"
                  />
                  {errors.resetCode && (
                    <p className="text-sm text-destructive">{errors.resetCode.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      className="h-11 bg-white/50 dark:bg-black/20"
                      type="password"
                      autoComplete="new-password"
                      {...register("newPassword")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm</Label>
                    <Input
                      id="confirmPassword"
                      className="h-11 bg-white/50 dark:bg-black/20"
                      type="password"
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                    />
                  </div>
                </div>

                {(errors.newPassword || errors.confirmPassword) && (
                  <div className="space-y-1">
                    {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                  </div>
                )}

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
