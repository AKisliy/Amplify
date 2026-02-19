import { z } from "zod";

export const projectSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    description: z.string().optional(),
    photo: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
