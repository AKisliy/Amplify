import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    resetCode: z.string().min(1, "Reset code is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
