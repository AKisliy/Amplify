"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  ambassadorSchema,
  type AmbassadorFormValues,
} from "../schemas/ambassador.schema";
import type { Ambassador } from "../types";

interface AmbassadorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AmbassadorFormValues) => Promise<void>;
  ambassador?: Ambassador | null;
  isLoading?: boolean;
}

export function AmbassadorDialog({
  open,
  onOpenChange,
  onSubmit,
  ambassador,
  isLoading,
}: AmbassadorDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AmbassadorFormValues>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      name: "",
      biography: "",
      behavioralPatterns: "",
    },
  });

  // Reset form when ambassador changes or dialog opens (if we want to clear it)
  // We use useEffect to update the form values when the `ambassador` prop changes
  useEffect(() => {
    if (open) {
      reset({
        name: ambassador?.name || "",
        biography: ambassador?.biography || "",
        behavioralPatterns: ambassador?.behavioralPatterns || "",
      });
    }
  }, [ambassador, open, reset]);

  const handleFormSubmit = async (values: AmbassadorFormValues) => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {ambassador ? "Edit Ambassador" : "Create Ambassador"}
          </DialogTitle>
          <DialogDescription>
            {ambassador
              ? "Update the ambassador information below."
              : "Add a new ambassador to this project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter ambassador name"
              className="h-11"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="biography">Biography</Label>
            <Textarea
              id="biography"
              placeholder="Tell us about this ambassador..."
              className="min-h-[120px] resize-none"
              {...register("biography")}
            />
            {errors.biography && (
              <p className="text-sm text-destructive">
                {errors.biography.message}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="behavioralPatterns">Behavioral Patterns</Label>
            <Textarea
              id="behavioralPatterns"
              placeholder="Describe behavioral patterns..."
              className="min-h-[120px] resize-none"
              {...register("behavioralPatterns")}
            />
            {errors.behavioralPatterns && (
              <p className="text-sm text-destructive">
                {errors.behavioralPatterns.message}
              </p>
            )}
          </motion.div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading
                ? ambassador
                  ? "Updating..."
                  : "Creating..."
                : ambassador
                  ? "Update Ambassador"
                  : "Create Ambassador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
