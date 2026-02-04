import { z } from "zod";

export const ambassadorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  biography: z.string().optional(),
  behavioralPatterns: z.string().optional(),
});

export type AmbassadorFormValues = z.infer<typeof ambassadorSchema>;
