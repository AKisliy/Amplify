"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { KeyRound, ArrowLeft, ArrowRight, Mail } from "lucide-react";

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
  forgotPasswordSchema,
  ForgotPasswordFormValues,
} from "./forgot-password.schema";
import { forgotPassword as forgotPasswordService } from "@/features/auth/services/auth.service";
import { AuthMotionWrapper, FadeInStagger } from "./AuthMotionWrapper";

export const ForgotPasswordForm = () => {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setServerError(null);
      await forgotPasswordService(values);
      setSuccess(true);
    } catch (error: any) {
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh p-4">
        <AuthMotionWrapper>
          <Card className="w-full max-w-md glass-card text-center py-8">
            <CardHeader className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Mail className="w-10 h-10" />
              </div>
              <CardTitle className="text-3xl font-bold">Check your email</CardTitle>
              <CardDescription className="text-lg">
                We sent a password reset link to your email.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center pt-8">
              <Link href="/login">
                <Button variant="outline" className="h-12 px-8 rounded-xl font-semibold transition-all hover:bg-primary hover:text-primary-foreground">
                  Back to sign in
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
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-center">
              Forgot password?
            </CardTitle>
            <CardDescription className="text-base text-center">
              No worries, we'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FadeInStagger>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    className="h-12 bg-white/50 dark:bg-black/20"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : (
                    <>
                      Reset password <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </FadeInStagger>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <Link
              href="/login"
              className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </AuthMotionWrapper>
    </div>
  );
};
