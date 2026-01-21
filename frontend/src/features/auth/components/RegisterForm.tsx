"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Mail, CheckCircle2 } from "lucide-react";

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

import { registerSchema, RegisterFormValues } from "./register.schema";
import { register as registerService } from "@/features/auth/services/auth.service";
import { AuthMotionWrapper, FadeInStagger } from "./AuthMotionWrapper";

export const RegisterForm = () => {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setServerError(null);
      await registerService({
        email: values.email,
        password: values.password,
      });
      setSuccess(true);
    } catch (error: any) {
      setServerError("Registration failed. Try a different email.");
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
                We sent you a confirmation link to verify your account.
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-mesh">
      {/* Visual Side Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary/5 dark:bg-primary/10 overflow-hidden relative">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="w-6 h-6" />
            </div>
            Amplify
          </Link>
        </div>
        
        <div className="relative z-10 max-w-md">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold leading-tight mb-6"
          >
            Start your journey <br />
            <span className="text-primary">with us today</span>
          </motion.h2>
          <div className="space-y-4 relative z-10">
            {[
              "Real-time asset tracking and analytics",
              "Enterprise-grade security and encryption",
              "Seamless integration with 100+ tools"
            ].map((text, i) => (
              <motion.div 
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                className="flex items-center gap-3 text-muted-foreground"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                {text}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-8 rounded-3xl glass backdrop-blur-md">
          <p className="italic text-lg text-foreground/80 mb-4 font-medium">
            "Amplify changed how our team handles assets. It's incredibly intuitive and the support is top-notch."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden">
               <img src="https://i.pravatar.cc/100?u=jane" alt="user" />
            </div>
            <div>
              <p className="font-bold text-sm">Jane Cooper</p>
              <p className="text-xs text-muted-foreground">CTO at TechFlow</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <AuthMotionWrapper>
          <Card className="w-full max-w-md glass-card py-2">
            <CardHeader className="space-y-2 flex flex-col items-center">
              <div className="lg:hidden w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-center">
                Create account
              </CardTitle>
              <CardDescription className="text-base text-center">
                Join thousands of teams using Amplify
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        className="h-12 bg-white/50 dark:bg-black/20"
                        type="password"
                        autoComplete="new-password"
                        {...register("password")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm</Label>
                      <Input
                        id="confirmPassword"
                        className="h-12 bg-white/50 dark:bg-black/20"
                        type="password"
                        autoComplete="new-password"
                        {...register("confirmPassword")}
                      />
                    </div>
                  </div>
                  
                  {(errors.password || errors.confirmPassword) && (
                    <div className="space-y-1">
                      {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                      {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                    </div>
                  )}

                  {serverError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium">
                      {serverError}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account..." : (
                      <>
                        Create account <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </FadeInStagger>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-border/50 mt-4 pt-6 text-center">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {"Already have an account? "}
                <Link
                  href="/login"
                  className="font-bold text-primary hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </Card>
        </AuthMotionWrapper>
      </div>
    </div>
  );
};
