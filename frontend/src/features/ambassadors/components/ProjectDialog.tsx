"use client";

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
    projectSchema,
    type ProjectFormValues,
} from "../schemas/project.schema";

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: ProjectFormValues) => Promise<void>;
    isLoading?: boolean;
}

export function ProjectDialog({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
}: ProjectDialogProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: "",
            description: "",
            photo: "",
        },
    });

    const handleFormSubmit = async (values: ProjectFormValues) => {
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
                        Create Project
                    </DialogTitle>
                    <DialogDescription>
                        Add a new project to start managing ambassadors.
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
                            placeholder="Enter project name"
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
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Tell us about this project..."
                            className="min-h-[120px] resize-none"
                            {...register("description")}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description.message}
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
                            {isSubmitting || isLoading ? "Creating..." : "Create Project"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
