"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

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

import { loginSchema, LoginFormValues } from "./login.schema";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthMotionWrapper, FadeInStagger } from "./AuthMotionWrapper";
import { Sparkles, ArrowRight } from "lucide-react";

export const LoginForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError(null);
      // Attempt real login
      await login(values);
      router.push("/dashboard");
    } catch (error: any) {
      setServerError(
        error?.response?.data?.title || error.message || "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-mesh">
      {/* Visual Side Panel - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary/5 dark:bg-primary/10 overflow-hidden relative">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
            Amplify
          </Link>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl font-bold leading-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
          >
            Manage your projects, <br />
            ambassadors, and <span className="text-primary">content in one place</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-muted-foreground text-lg leading-relaxed"
          >
            A smart platform for planning, publishing, and scaling content with ambassadors and automation.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="relative z-10 flex items-center gap-4 text-sm font-medium"
        >
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -5, scale: 1.1 }}
                className="w-10 h-10 rounded-full border-4 border-background bg-muted overflow-hidden shadow-sm"
              >
                <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="user" />
              </motion.div>
            ))}
          </div>
          <p className="text-muted-foreground">Trusted by growing teams building modern creator workflows.</p>
        </motion.div>

        {/* Decorative elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1
          }}
          className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" 
        />
      </div>

      {/* Login Form Section */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <AuthMotionWrapper>
          <Card className="w-full max-w-md glass-card py-2">
            <CardHeader className="space-y-2 flex flex-col items-center">
              <div className="lg:hidden w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                Welcome back
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to your account
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-primary hover:underline underline-offset-4"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <Input
                      id="password"
                      className="h-12 bg-white/50 dark:bg-black/20"
                      type="password"
                      autoComplete="current-password"
                      {...register("password")}
                    />

                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {serverError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium">
                      {serverError}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : (
                      <>
                        Sign in <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </FadeInStagger>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-border/50 mt-4 pt-6">
              <div className="text-sm text-center text-muted-foreground">
                {"Don't have an account? "}
                <Link
                  href="/register"
                  className="font-bold text-primary hover:underline underline-offset-4"
                >
                  Create an account
                </Link>
              </div>
            </CardFooter>
          </Card>
        </AuthMotionWrapper>
      </div>
    </div>
  );
};
