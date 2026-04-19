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
      appearanceDescription: "",
      voiceDescription: "",
      voiceId: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: ambassador?.name ?? "",
        appearanceDescription: ambassador?.appearanceDescription ?? "",
        voiceDescription: ambassador?.voiceDescription ?? "",
        voiceId: ambassador?.voiceId ?? "",
      });
    }
  }, [ambassador, open, reset]);

  const handleFormSubmit = async (values: AmbassadorFormValues) => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch {
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
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
            <Label htmlFor="appearanceDescription">Appearance Description</Label>
            <Textarea
              id="appearanceDescription"
              placeholder="Structured description for AI prompts, e.g. 'Anna, 25yo, long dark hair, light eyes, petite frame...'"
              className="min-h-[100px] resize-none"
              {...register("appearanceDescription")}
            />
            {errors.appearanceDescription && (
              <p className="text-sm text-destructive">
                {errors.appearanceDescription.message}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="voiceDescription">Voice Description</Label>
            <Textarea
              id="voiceDescription"
              placeholder="Describe the voice style for video generation, e.g. 'Calm, professional, friendly tone...'"
              className="min-h-[80px] resize-none"
              {...register("voiceDescription")}
            />
            {errors.voiceDescription && (
              <p className="text-sm text-destructive">
                {errors.voiceDescription.message}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <Label htmlFor="voiceId">Voice ID</Label>
            <Input
              id="voiceId"
              placeholder="TTS library voice ID"
              className="h-11"
              {...register("voiceId")}
            />
            {errors.voiceId && (
              <p className="text-sm text-destructive">{errors.voiceId.message}</p>
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
