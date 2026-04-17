import { z } from "zod";

export const ambassadorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  appearanceDescription: z.string().optional(),
  voiceDescription: z.string().optional(),
  voiceId: z.string().optional(),
});

export type AmbassadorFormValues = z.infer<typeof ambassadorSchema>;
